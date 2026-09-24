<template>
  <div class="gym-section-wrapper">
    <div class="gyms-header">
      <SuggestionPill
        v-if="showSwapPreview"
        :left="{
          src: getSwapSpriteUrl(globalSwap.teamMember),
          alt: globalSwap.teamMember.name,
        }"
        :right="{
          src: getSwapSpriteUrl(globalSwap.boxMember),
          alt: globalSwap.boxMember.name,
        }"
        :indicator="suggestionIndicator"
        @select="handleSwapClick"
      />
      <button
        v-if="canShowSuggestion"
        class="suggestion-btn"
        :class="{ active: showSuggestions }"
        @click="showSuggestions = !showSuggestions"
        aria-label="Swap suggestion"
      >
        ✦
      </button>
      <Transition name="label-fade" mode="out-in">
        <span class="gyms-label" :key="gymColumnTitle">{{ gymColumnTitle }}</span>
      </Transition>
    </div>
    <div class="gym-section">
      <GymColumn
        :title="gymColumnTitle"
        :gyms="unifiedGymsList"
        :pinnedType="effectivePinnedGym"
        :suggestionMode="showSuggestions"
        emptyMessage="No gyms"
        @gymClick="handleGymClick"
        @pin="handlePin"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolveMemberSpriteUrl } from '../utils/pokemon.js'
import { getSuggestionIndicator } from '../utils/suggestion.js'
import {
  calculateTypeSuggestionScore,
  findGlobalBestSwap,
} from '../utils/typeCalc.js'
import GymColumn from './GymColumn.vue'
import SuggestionPill from './SuggestionPill.vue'

const props = defineProps({
  team: {
    type: Array,
    default: () => [],
  },
  box: {
    type: Array,
    default: () => [],
  },
  remainingGyms: {
    type: Array,
    required: true,
  },
  defeatedGymsList: {
    type: Array,
    required: true,
  },
  draftActive: {
    type: Boolean,
    default: false,
  },
  pinnedType: {
    type: String,
    default: null,
  },
  generationRules: {
    type: String,
    required: true,
  },
  persistPinnedGym: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['defeatGym', 'undefeatGym', 'swapSuggestion'])

// Suggestion state
const showSuggestions = ref(false)
const canShowSuggestion = computed(
  () => props.team.length > 0 && !props.draftActive,
)

const effectivePinnedGym = computed(() => props.pinnedType)

const defeatedGymTypes = computed(() =>
  props.defeatedGymsList.map((gym) => gym.type),
)

const defeatedTypes = computed(() => new Set(defeatedGymTypes.value))

watch(canShowSuggestion, (canShow) => {
  if (!canShow) showSuggestions.value = false
})

const globalSwap = computed(() => {
  if (!showSuggestions.value || !canShowSuggestion.value) return null
  if (props.box.length === 0) return null
  return findGlobalBestSwap(
    props.team,
    props.box,
    defeatedGymTypes.value,
    effectivePinnedGym.value,
    props.generationRules,
  )
})

const showSwapPreview = computed(
  () =>
    showSuggestions.value &&
    globalSwap.value &&
    globalSwap.value.improvement >= 0,
)

const suggestionIndicator = computed(() => {
  if (!globalSwap.value || globalSwap.value.improvement < 0) return null
  return getSuggestionIndicator(globalSwap.value.improvement)
})

const gymColumnTitle = computed(() => {
  if (showSuggestions.value) return 'Suggestions'
  return props.draftActive ? 'Gyms Preview' : 'Gyms'
})

function getSwapSpriteUrl(pokemon) {
  return resolveMemberSpriteUrl(pokemon, { small: true })
}

function handleSwapClick() {
  const swap = globalSwap.value
  if (!swap) return
  showSuggestions.value = false
  emit('swapSuggestion', {
    currentId: swap.teamMember.id,
    candidateId: swap.boxMember.id,
    isTeamMember: true,
  })
}

// Combine remaining and defeated gyms into a unified list, sorted by score (then berry tiebreaker)
const unifiedGymsList = computed(() => {
  const remaining = props.remainingGyms.map((gym) => ({
    ...gym,
    defeated: false,
  }))
  const defeated = props.defeatedGymsList.map((gym) => ({
    ...gym,
    defeated: true,
  }))
  const combined = [...remaining, ...defeated]

  if (showSuggestions.value) {
    // For each gym type, create a dummy monotype Pokemon and find its best swap improvement
    const withImprovement = combined.map((gym) => ({
      ...gym,
      defeated: false,
      improvementScore: calculateTypeSuggestionScore(
        gym.type,
        props.team,
        defeatedGymTypes.value,
        effectivePinnedGym.value,
        props.generationRules,
      ),
    }))
    // Sort by improvement descending, then current score ascending as tiebreaker
    withImprovement.sort((a, b) => {
      if (a.improvementScore !== b.improvementScore)
        return b.improvementScore - a.improvementScore
      return a.score - b.score
    })
    return withImprovement
  }

  // Sort by score ascending, then by berry count ascending as tiebreaker
  combined.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return (a.berryCount || 0) - (b.berryCount || 0)
  })
  // Move pinned gym to first position if it exists
  if (effectivePinnedGym.value) {
    const pinnedIndex = combined.findIndex(
      (gym) => gym.type === effectivePinnedGym.value,
    )
    if (pinnedIndex > 0) {
      const [pinned] = combined.splice(pinnedIndex, 1)
      combined.unshift(pinned)
    }
  }
  return combined
})

// Handle gym click - toggle between defeated and remaining
// Also unpin if the clicked gym was pinned
function handleGymClick(type) {
  if (effectivePinnedGym.value === type) {
    props.persistPinnedGym?.(null)
  }
  if (defeatedTypes.value.has(type)) {
    emit('undefeatGym', type)
  } else {
    emit('defeatGym', type)
  }
}

// Handle pin - toggle pinned state
function handlePin(type) {
  if (effectivePinnedGym.value === type) {
    props.persistPinnedGym?.(null)
  } else {
    props.persistPinnedGym?.(type)
  }
}
</script>

<style scoped>
.gym-section-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gym-section {
  display: block;
}

.gyms-header {
  position: absolute;
  top: calc(-1 * var(--space-8) - var(--space-2));
  right: var(--space-4);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.gyms-label {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* Pill chrome: only on viewports that neither media query below targets. */
.suggestion-inline {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.label-fade-enter-active,
.label-fade-leave-active {
  transition: opacity var(--transition-fast);
}

.label-fade-enter-from,
.label-fade-leave-to {
  opacity: 0;
}

@media (orientation: portrait) {
  .gyms-header {
    top: var(--space-2);
    right: calc(var(--space-4) + var(--space-4));
  }

  .suggestion-inline {
    position: relative;
    right: var(--space-3);
    top: calc(var(--space-1) / 2);
  }

  .gyms-label {
    display: none;
  }
}

@media (min-width: 1024px) {
  .gyms-header {
    top: var(--space-2);
    right: calc(var(--space-4) + var(--space-4));
  }

  .suggestion-inline {
    position: relative;
    right: var(--space-3);
    top: calc(var(--space-1) / 2);
  }

  .gyms-label {
    display: none;
  }

  .suggestion-inline :deep(.sprite-wrapper) {
    width: 32px !important;
    height: 32px !important;
  }

  .suggestion-swap-icon {
    font-size: 1rem;
  }

  .suggestion-indicator {
    font-size: 0.8rem;
  }
}
</style>

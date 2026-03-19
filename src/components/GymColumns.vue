<template>
  <div class="gym-section-wrapper">
    <div class="gyms-header">
      <span
        v-if="showSwapPreview"
        v-show="!headerSettling"
        class="suggestion-inline"
        @click="handleSwapClick"
      >
        <SpriteImg
          :src="getSwapSpriteUrl(globalSwap.teamMember)"
          :alt="globalSwap.teamMember.name"
          :width="24"
          :height="24"
        />
        <span class="suggestion-swap-icon">⇄</span>
        <SpriteImg
          :src="getSwapSpriteUrl(globalSwap.boxMember)"
          :alt="globalSwap.boxMember.name"
          :width="24"
          :height="24"
        />
        <span v-if="suggestionIndicator" :class="['suggestion-indicator', suggestionIndicator.cls]">
          {{ suggestionIndicator.symbol }}
        </span>
      </span>
      <button
        v-if="canShowSuggestion"
        v-show="!headerSettling"
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
        :draftActive="draftActive"
        :pinnedType="pinnedGym"
        :suggestionMode="showSuggestions"
        transitionName="slide-right"
        emptyMessage="No gyms"
        @gymClick="handleGymClick"
        @pin="handlePin"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRunStore } from '../composables/useRunStore.js'
import { getMegaSpriteUrl, getSmallSpriteUrl } from '../utils/pokemon.js'
import {
  calculateTypeSuggestionScore,
  findGlobalBestSwap,
} from '../utils/typeCalc.js'
import GymColumn from './GymColumn.vue'
import SpriteImg from './SpriteImg.vue'

const {
  team,
  box,
  defeatedGyms,
  pinnedGym,
  persistPinnedGym,
  generationRules,
} = useRunStore()

const props = defineProps({
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
})

const emit = defineEmits(['defeatGym', 'undefeatGym', 'swapSuggestion'])

// Suggestion state
const showSuggestions = ref(false)
const headerSettling = ref(false)

watch(showSuggestions, () => {
  headerSettling.value = true
  setTimeout(() => {
    headerSettling.value = false
  }, 300)
})

const canShowSuggestion = computed(
  () => team.value.length > 0 && !props.draftActive,
)

watch(canShowSuggestion, (canShow) => {
  if (!canShow) showSuggestions.value = false
})

const globalSwap = computed(() => {
  if (!showSuggestions.value || !canShowSuggestion.value) return null
  if (box.value.length === 0) return null
  return findGlobalBestSwap(
    team.value,
    box.value,
    defeatedGyms.value,
    pinnedGym.value,
    generationRules.value,
  )
})

const showSwapPreview = computed(
  () =>
    showSuggestions.value &&
    globalSwap.value &&
    globalSwap.value.improvement >= 0,
)

const suggestionIndicator = computed(() => {
  if (!globalSwap.value) return null
  if (globalSwap.value.improvement > 0)
    return { symbol: '\u25B2', cls: 'improvement-up' }
  if (globalSwap.value.improvement === 0)
    return { symbol: '\u2014', cls: 'improvement-neutral' }
  return null
})

const gymColumnTitle = computed(() => {
  if (showSuggestions.value) return 'Suggestions'
  return props.draftActive ? 'Gyms Preview' : 'Gyms'
})

function getSwapSpriteUrl(pokemon) {
  const variant = pokemon.spriteVariant || 'default'
  if (pokemon.megaSpriteId)
    return getMegaSpriteUrl(pokemon.megaSpriteId, variant)
  return getSmallSpriteUrl(pokemon.name, variant)
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

// Create a set of defeated gym types for quick lookup
const defeatedTypes = computed(() => {
  return new Set(props.defeatedGymsList.map((gym) => gym.type))
})

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
        team.value,
        defeatedGyms.value,
        pinnedGym.value,
        generationRules.value,
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
  if (pinnedGym.value) {
    const pinnedIndex = combined.findIndex(
      (gym) => gym.type === pinnedGym.value,
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
  if (pinnedGym.value === type) {
    persistPinnedGym(null)
  }
  if (defeatedTypes.value.has(type)) {
    emit('undefeatGym', type)
  } else {
    emit('defeatGym', type)
  }
}

// Handle pin - toggle pinned state
function handlePin(type) {
  if (pinnedGym.value === type) {
    persistPinnedGym(null)
  } else {
    persistPinnedGym(type)
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

.suggestion-btn {
  background: transparent;
  border: none;
  color: rgba(139, 92, 246, 1);
  font-size: 1.25rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base), opacity var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.suggestion-btn.active {
  text-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
}

.suggestion-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  animation: fadeSlideIn 0.2s ease;
  transition: opacity var(--transition-fast);
}

.suggestion-inline:active {
  opacity: 0.7;
}

.suggestion-swap-icon {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.suggestion-indicator {
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: var(--space-1);
}

.improvement-up {
  color: var(--color-success);
}

.improvement-neutral {
  color: var(--color-text-muted);
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
    border: none;
    background: none;
    box-shadow: none;
    padding: 0;
    border-radius: 0;
    position: relative;
    right: var(--space-3);
    top: calc(var(--space-1) / 2);
  }

  .gyms-label {
    display: none;
  }
}
</style>

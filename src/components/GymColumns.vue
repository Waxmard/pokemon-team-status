<template>
  <div class="gym-section-wrapper">
    <span class="gyms-label">{{ draftActive ? 'Gyms Preview' : 'Gyms' }}</span>
    <div class="gym-section">
      <GymColumn
        :title="draftActive ? 'Gyms Preview' : 'Gyms'"
        :gyms="unifiedGymsList"
        :draftActive="draftActive"
        :pinnedType="pinnedGym"
        transitionName="slide-right"
        emptyMessage="No gyms"
        @gymClick="handleGymClick"
        @pin="handlePin"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import GymColumn from './GymColumn.vue'

const { pinnedGym, persistPinnedGym } = useStorage()

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

const emit = defineEmits(['defeatGym', 'undefeatGym'])

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

.gyms-label {
  position: absolute;
  top: calc(-1 * var(--space-8) - var(--space-2));
  right: var(--space-4);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

@media (orientation: portrait) {
  .gyms-label {
    display: none;
  }
}
</style>

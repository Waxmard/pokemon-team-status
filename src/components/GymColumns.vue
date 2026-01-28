<template>
  <div class="gym-section-wrapper">
    <span class="gyms-label">{{ draftActive ? 'Gyms Preview' : 'Gyms' }}</span>
    <div class="gym-section">
      <GymColumn
        :title="draftActive ? 'Gyms Preview' : 'Gyms'"
        :gyms="unifiedGymsList"
        :draftActive="draftActive"
        transitionName="slide-right"
        emptyMessage="No gyms"
        @gymClick="handleGymClick"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GymColumn from './GymColumn.vue'

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
  return combined.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return (a.berryCount || 0) - (b.berryCount || 0)
  })
})

// Handle gym click - toggle between defeated and remaining
function handleGymClick(type) {
  if (defeatedTypes.value.has(type)) {
    emit('undefeatGym', type)
  } else {
    emit('defeatGym', type)
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

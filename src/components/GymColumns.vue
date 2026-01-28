<template>
  <div class="gym-section-wrapper">
    <!-- Swap Preview -->
    <SwapPreview
      v-if="showSwapPreview"
      :boxPokemon="swapBoxPokemon"
      :teamPokemon="swapTeamPokemon"
      :hasTarget="hasSwapTarget"
      @confirm="$emit('confirmSwap')"
      @cancel="$emit('cancelSwap')"
    />

    <div class="gym-section">
      <GymColumn
        title="Gyms"
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
import SwapPreview from './SwapPreview.vue'

const props = defineProps({
  remainingGyms: {
    type: Array,
    required: true
  },
  defeatedGymsList: {
    type: Array,
    required: true
  },
  draftActive: {
    type: Boolean,
    default: false
  },
  showSwapPreview: {
    type: Boolean,
    default: false
  },
  swapBoxPokemon: {
    type: Object,
    default: null
  },
  swapTeamPokemon: {
    type: Object,
    default: null
  },
  hasSwapTarget: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['defeatGym', 'undefeatGym', 'confirmSwap', 'cancelSwap'])

// Create a set of defeated gym types for quick lookup
const defeatedTypes = computed(() => {
  return new Set(props.defeatedGymsList.map(gym => gym.type))
})

// Combine remaining and defeated gyms into a unified list, sorted by score (then berry tiebreaker)
const unifiedGymsList = computed(() => {
  const remaining = props.remainingGyms.map(gym => ({
    ...gym,
    defeated: false
  }))
  const defeated = props.defeatedGymsList.map(gym => ({
    ...gym,
    defeated: true
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow: hidden;
}

.gym-section {
  display: block;
}
</style>

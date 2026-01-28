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
        title="Remaining Gyms"
        :gyms="remainingGyms"
        :draftActive="draftActive"
        transitionName="slide-right"
        emptyMessage="All gyms defeated!"
        @gymClick="$emit('defeatGym', $event)"
      />
      <GymColumn
        title="Defeated Gyms"
        :gyms="defeatedGymsList"
        transitionName="slide-left"
        emptyMessage="No gyms defeated yet"
        @gymClick="$emit('undefeatGym', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import GymColumn from './GymColumn.vue'
import SwapPreview from './SwapPreview.vue'

defineProps({
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

defineEmits(['defeatGym', 'undefeatGym', 'confirmSwap', 'cancelSwap'])
</script>

<style scoped>
.gym-section-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>

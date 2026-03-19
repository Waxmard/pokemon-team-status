<template>
  <section class="soul-link-player-view">
    <TeamSection
      :team="board.team"
      :box="board.box"
      :generation-rules="generationRules"
      read-only
    />

    <GymColumns
      :team="board.team"
      :box="board.box"
      :remaining-gyms="board.remainingGyms"
      :defeated-gyms-list="board.defeatedGymsList"
      :defeated-gym-types="board.defeatedGymsList.map((gym) => gym.type)"
      :pinned-type="board.pinnedGym"
      :generation-rules="generationRules"
      read-only
    />
  </section>
</template>

<script setup>
import GymColumns from './GymColumns.vue'
import TeamSection from './TeamSection.vue'

defineProps({
  board: {
    type: Object,
    required: true,
  },
  generationRules: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.soul-link-player-view {
  display: grid;
  gap: var(--space-2);
}
</style>

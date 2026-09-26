<template>
  <section class="soul-link-player-view">
    <TeamSection
      :team="board.team"
      :box="board.box"
      :generation-rules="generationRules"
      :tera-enabled="teraEnabled"
      :defeated-gyms="board.defeatedGymsList.map((gym) => gym.type)"
      :pinned-gym="board.pinnedGym"
      :partner-roster="partnerRoster"
      :is-soul-link-mode="true"
      :player-id="playerId"
      :dead="board.dead"
      :death-box-mode="deathBoxMode"
      @autosaveDraft="$emit('autosaveDraft')"
      @immediateSwap="$emit('immediateSwap', $event)"
      @cancelSwap="$emit('cancelSwap')"
      @swapSuggestion="$emit('swapSuggestion', $event)"
      @killPokemon="$emit('killPokemon', $event)"
      @revivePokemon="$emit('revivePokemon', $event)"
      @exitDeathBox="$emit('exitDeathBox')"
      @deleteDeadPokemon="$emit('deleteDeadPokemon', $event)"
      @addToDead="$emit('addToDead')"
    />

    <GymColumns
      :team="board.team"
      :box="board.box"
      :remaining-gyms="board.remainingGyms"
      :defeated-gyms-list="board.defeatedGymsList"
      :pinned-type="board.pinnedGym"
      :generation-rules="generationRules"
      :draft-active="draftActive"
      :persist-pinned-gym="persistPinnedGym"
      @defeatGym="$emit('defeatGym', $event)"
      @undefeatGym="$emit('undefeatGym', $event)"
      @swapSuggestion="$emit('swapSuggestion', $event)"
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
  teraEnabled: {
    type: Boolean,
    default: null,
  },
  draftActive: {
    type: Boolean,
    default: false,
  },
  persistPinnedGym: {
    type: Function,
    default: null,
  },
  partnerRoster: {
    type: Array,
    default: null,
  },
  playerId: {
    type: String,
    default: null,
  },
  deathBoxMode: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'autosaveDraft',
  'immediateSwap',
  'cancelSwap',
  'swapSuggestion',
  'defeatGym',
  'undefeatGym',
  'killPokemon',
  'revivePokemon',
  'exitDeathBox',
  'deleteDeadPokemon',
  'addToDead',
])
</script>

<style scoped>
.soul-link-player-view {
  display: grid;
  gap: var(--space-2);
}

@media (orientation: landscape) and (max-height: 500px) {
  .soul-link-player-view {
    display: contents;
  }
}

</style>

<template>
  <section class="soul-link-shell">
    <SoulLinkPlayerView
      :board="viewedPlayerBoard"
      :generation-rules="generationRules"
      :draft-active="draftActive"
      :persist-pinned-gym="persistPinnedGym"
      :partner-roster="partnerRoster"
      :player-id="playerId"
      @confirmDraft="$emit('confirmDraft')"
      @immediateSwap="$emit('immediateSwap', $event)"
      @deleteTeamPokemon="$emit('deleteTeamPokemon', $event)"
      @deleteBoxPokemon="$emit('deleteBoxPokemon', $event)"
      @cancelSwap="$emit('cancelSwap')"
      @deletePokemon="$emit('deletePokemon')"
      @swapSuggestion="$emit('swapSuggestion', $event)"
      @defeatGym="$emit('defeatGym', $event)"
      @undefeatGym="$emit('undefeatGym', $event)"
    />
  </section>
</template>

<script setup>
import SoulLinkPlayerView from './SoulLinkPlayerView.vue'

defineProps({
  generationRules: {
    type: String,
    required: true,
  },
  viewedPlayerBoard: {
    type: Object,
    required: true,
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
})

defineEmits([
  'confirmDraft',
  'immediateSwap',
  'deleteTeamPokemon',
  'deleteBoxPokemon',
  'cancelSwap',
  'deletePokemon',
  'swapSuggestion',
  'defeatGym',
  'undefeatGym',
])
</script>

<style scoped>
.soul-link-shell {
  display: contents;
}
</style>

<template>
  <section class="soul-link-shell">
    <SoulLinkPlayerView
      :board="viewedPlayerBoard"
      :generation-rules="generationRules"
      :tera-enabled="teraEnabled"
      :draft-active="draftActive"
      :persist-pinned-gym="persistPinnedGym"
      :partner-roster="partnerRoster"
      :player-id="playerId"
      :death-box-mode="deathBoxMode"
      @confirmDraft="$emit('confirmDraft')"
      @autosaveDraft="$emit('autosaveDraft')"
      @immediateSwap="$emit('immediateSwap', $event)"
      @deleteTeamPokemon="$emit('deleteTeamPokemon', $event)"
      @deleteBoxPokemon="$emit('deleteBoxPokemon', $event)"
      @cancelSwap="$emit('cancelSwap')"
      @deletePokemon="$emit('deletePokemon')"
      @swapSuggestion="$emit('swapSuggestion', $event)"
      @defeatGym="$emit('defeatGym', $event)"
      @undefeatGym="$emit('undefeatGym', $event)"
      @killPokemon="$emit('killPokemon', $event)"
      @revivePokemon="$emit('revivePokemon', $event)"
      @exitDeathBox="$emit('exitDeathBox')"
      @deleteDeadPokemon="$emit('deleteDeadPokemon', $event)"
      @addToDead="$emit('addToDead')"
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
  teraEnabled: {
    type: Boolean,
    default: null,
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
  deathBoxMode: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'confirmDraft',
  'autosaveDraft',
  'immediateSwap',
  'deleteTeamPokemon',
  'deleteBoxPokemon',
  'cancelSwap',
  'deletePokemon',
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
.soul-link-shell {
  display: contents;
}
</style>

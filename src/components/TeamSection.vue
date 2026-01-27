<template>
  <div class="team-section">
    <h2>Your Team</h2>
    <div class="team-grid">
      <TeamSlot
        v-for="(_, index) in 6"
        :key="index"
        :pokemon="team[index] || null"
        @remove="$emit('removePokemon', $event)"
      />
    </div>

    <div class="action-buttons">
      <button
        class="btn btn-primary"
        @click="$emit('addPokemon')"
        :disabled="team.length >= 6 || draftActive"
      >
        Add Pokemon
      </button>
    </div>

    <DraftPanel
      v-if="draftAction"
      :draftAction="draftAction"
      :scoreChanges="scoreChanges"
      @confirm="$emit('confirmDraft')"
      @cancel="$emit('cancelDraft')"
      @update:pokemon="$emit('updateDraftPokemon', $event)"
      @update:ability="$emit('updateDraftAbility', $event)"
      @update:move="$emit('updateDraftMove', $event)"
    />
  </div>
</template>

<script setup>
import TeamSlot from './TeamSlot.vue'
import DraftPanel from './DraftPanel.vue'

defineProps({
  team: {
    type: Array,
    required: true
  },
  draftAction: {
    type: Object,
    default: null
  },
  draftActive: {
    type: Boolean,
    default: false
  },
  scoreChanges: {
    type: Array,
    default: () => []
  }
})

defineEmits([
  'addPokemon',
  'removePokemon',
  'confirmDraft',
  'cancelDraft',
  'updateDraftPokemon',
  'updateDraftAbility',
  'updateDraftMove'
])
</script>

<template>
  <n-card class="team-section" title="Your Team">
    <div class="team-grid">
      <TeamSlot
        v-for="(_, index) in 6"
        :key="index"
        :pokemon="team[index] || null"
        @remove="$emit('removePokemon', $event)"
      />
    </div>

    <div class="action-buttons">
      <n-button
        type="primary"
        @click="$emit('addPokemon')"
        :disabled="team.length >= 6 || draftActive"
      >
        Add Pokemon
      </n-button>
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
  </n-card>
</template>

<script setup>
import { NCard, NButton } from 'naive-ui'
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

<style scoped>
.team-section {
  margin-bottom: 20px;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .team-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>

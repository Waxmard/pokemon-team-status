<template>
  <div class="team-section">
    <TransitionGroup name="list" tag="div" class="team-grid">
      <TeamSlot
        v-for="(pokemon, index) in paddedTeam"
        :key="pokemon?.id || `empty-${index}`"
        :pokemon="pokemon"
        @remove="$emit('removePokemon', $event)"
      />
    </TransitionGroup>

    <div class="action-buttons">
      <button
        class="add-btn"
        @click="$emit('addPokemon')"
        :disabled="team.length >= 6 || draftActive"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
        </svg>
        Add Pokemon
      </button>
    </div>

    <Transition name="scale">
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
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TeamSlot from './TeamSlot.vue'
import DraftPanel from './DraftPanel.vue'

const props = defineProps({
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

// Pad team to always show 6 slots
const paddedTeam = computed(() => {
  const slots = [...props.team]
  while (slots.length < 6) {
    slots.push(null)
  }
  return slots
})
</script>

<style scoped>
.team-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-lg);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .team-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-primary);
  background: #60a5fa;
}

.add-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

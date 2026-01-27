<template>
  <div class="team-section">
    <!-- View Toggle -->
    <div class="view-toggle">
      <button
        class="toggle-btn"
        :class="{ active: viewMode === 'team' }"
        :disabled="draftActive && draftAction?.type === 'swap'"
        @click="viewMode = 'team'"
      >
        Active Team ({{ team.length }}/6)
      </button>
      <button
        class="toggle-btn"
        :class="{ active: viewMode === 'box' }"
        :disabled="draftActive && draftAction?.type === 'swap'"
        @click="viewMode = 'box'"
      >
        Box ({{ box.length }}/3)
      </button>
    </div>

    <!-- Swap Banner -->
    <div v-if="draftAction?.type === 'swap' && !draftAction.targetSlotId" class="swap-banner">
      Select a team slot to swap with {{ draftAction.boxPokemon.name }}
      <button class="cancel-swap-btn" @click="$emit('cancelDraft')">Cancel</button>
    </div>

    <!-- Team Grid -->
    <draggable
      v-if="viewMode === 'team'"
      v-model="localTeam"
      :disabled="draftActive"
      item-key="id"
      ghost-class="drag-ghost"
      drag-class="drag-active"
      class="team-grid"
      @end="onDragEnd"
    >
      <template #item="{ element: pokemon }">
        <TeamSlot
          :pokemon="pokemon"
          :class="{ 'swap-target': draftAction?.type === 'swap' && !draftAction.targetSlotId }"
          @remove="$emit('removePokemon', $event)"
          @edit="handleSlotClick(pokemon.id)"
        />
      </template>
      <template #footer>
        <TeamSlot
          v-for="i in emptySlotCount"
          :key="'empty-' + i"
          :pokemon="null"
          :class="{ 'swap-target': draftAction?.type === 'swap' && !draftAction.targetSlotId }"
          @add="handleEmptySlotClick(i)"
        />
      </template>
    </draggable>

    <!-- Box Grid -->
    <div v-else class="box-grid">
      <TeamSlot
        v-for="pokemon in box"
        :key="pokemon.id"
        :pokemon="pokemon"
        :isBoxSlot="true"
        @remove="$emit('removeFromBox', pokemon.id)"
        @edit="$emit('startSwap', pokemon.id)"
      />
      <TeamSlot
        v-for="i in emptyBoxSlotCount"
        :key="'box-empty-' + i"
        :pokemon="null"
        :isBoxSlot="true"
        @add="$emit('addToBox')"
      />
    </div>

    <Transition name="scale">
      <DraftPanel
        v-if="showDraftPanel"
        :draftAction="draftAction"
        :team="team"
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
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import TeamSlot from './TeamSlot.vue'
import DraftPanel from './DraftPanel.vue'

const props = defineProps({
  team: {
    type: Array,
    required: true
  },
  box: {
    type: Array,
    default: () => []
  },
  draftAction: {
    type: Object,
    default: null
  },
  draftActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'addPokemon',
  'removePokemon',
  'editPokemon',
  'confirmDraft',
  'cancelDraft',
  'updateDraftPokemon',
  'updateDraftAbility',
  'updateDraftMove',
  'reorderTeam',
  'addToBox',
  'removeFromBox',
  'startSwap',
  'selectSwapTarget'
])

const viewMode = ref('team')

// Local copy for draggable (only actual Pokemon, no nulls)
const localTeam = ref([...props.team])

// Sync when props change
watch(() => props.team, (newTeam) => {
  localTeam.value = [...newTeam]
}, { deep: true })

// Force view to team when swap is initiated
watch(() => props.draftAction, (action) => {
  if (action?.type === 'swap') {
    viewMode.value = 'team'
  }
})

// Number of empty slots to show
const emptySlotCount = computed(() => Math.max(0, 6 - props.team.length))
const emptyBoxSlotCount = computed(() => Math.max(0, 3 - props.box.length))

// Show draft panel for add/edit modes, or swap mode when target is selected
const showDraftPanel = computed(() => {
  if (!props.draftAction) return false
  if (props.draftAction.type === 'swap') {
    return !!props.draftAction.targetSlotId
  }
  return true
})

// Emit reorder when drag ends
function onDragEnd() {
  emit('reorderTeam', localTeam.value)
}

function handleSlotClick(pokemonId) {
  if (props.draftAction?.type === 'swap' && !props.draftAction.targetSlotId) {
    emit('selectSwapTarget', pokemonId)
  } else {
    emit('editPokemon', pokemonId)
  }
}

function handleEmptySlotClick(slotIndex) {
  if (props.draftAction?.type === 'swap' && !props.draftAction.targetSlotId) {
    emit('selectSwapTarget', `empty-${slotIndex}`)
  } else {
    emit('addPokemon')
  }
}
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

.view-toggle {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.toggle-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.toggle-btn:hover:not(:disabled) {
  background: var(--color-card);
  color: var(--color-text-primary);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.swap-banner {
  background: var(--color-warning);
  color: #1a1a2e;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.cancel-swap-btn {
  padding: var(--space-1) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background var(--transition-base);
}

.cancel-swap-btn:hover {
  background: rgba(0, 0, 0, 0.3);
}

.team-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.box-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .team-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 500px) {
  .box-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.drag-ghost {
  opacity: 0.5;
}

.drag-active {
  cursor: grabbing;
}

.team-slot:not(.empty) {
  cursor: grab;
}

/* Swap target highlighting */
:deep(.swap-target) {
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    box-shadow: var(--shadow-md), 0 0 0 2px var(--color-warning);
  }
  50% {
    box-shadow: var(--shadow-md), 0 0 0 4px var(--color-warning);
  }
}
</style>

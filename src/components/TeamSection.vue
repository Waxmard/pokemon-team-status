<template>
  <div class="team-section-wrapper">
    <!-- Mode Toggle Button -->
    <button
      class="mode-toggle"
      @click="toggleViewMode"
    >
      <span class="mode-icon">{{ viewMode === 'team' ? '⚔️' : '📦' }}</span>
    </button>

    <div class="team-section">
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
          @remove="$emit('removePokemon', $event)"
          @edit="$emit('editPokemon', pokemon.id)"
        />
      </template>
      <template #footer>
        <TeamSlot
          v-for="i in emptySlotCount"
          :key="'empty-' + i"
          :pokemon="null"
          @add="$emit('addPokemon')"
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
        @edit="$emit('editBoxPokemon', pokemon.id)"
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
        @update:replaceTarget="$emit('updateDraftReplaceTarget', $event)"
      />
    </Transition>
    </div>
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
  'updateDraftReplaceTarget',
  'reorderTeam',
  'addToBox',
  'removeFromBox',
  'editBoxPokemon'
])

const viewMode = ref('team')

// Local copy for draggable (only actual Pokemon, no nulls)
const localTeam = ref([...props.team])

// Sync when props change
watch(() => props.team, (newTeam) => {
  localTeam.value = [...newTeam]
}, { deep: true })

// Number of empty slots to show
const emptySlotCount = computed(() => Math.max(0, 6 - props.team.length))
const emptyBoxSlotCount = computed(() => Math.max(0, 3 - props.box.length))

// Show draft panel for add/edit modes
const showDraftPanel = computed(() => {
  return !!props.draftAction
})

// Emit reorder when drag ends
function onDragEnd() {
  emit('reorderTeam', localTeam.value)
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'team' ? 'box' : 'team'
}
</script>

<style scoped>
.team-section-wrapper {
  position: relative;
}

.team-section {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-lg);
}

.mode-toggle {
  position: absolute;
  top: calc(-1 * var(--space-6));
  right: var(--space-4);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.mode-toggle:hover:not(:disabled) {
  background: var(--color-card);
  box-shadow: var(--shadow-md);
}

.mode-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-icon {
  font-size: 1.1rem;
  line-height: 1;
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
</style>

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
    <!-- Grid Container - handles show/hide based on draft state -->
    <div v-show="!showDraftPanel || swapMode">
      <!-- Team Grid -->
      <draggable
        v-if="viewMode === 'team'"
        v-model="localTeam"
        :disabled="isActive"
        item-key="id"
        ghost-class="drag-ghost"
        drag-class="drag-active"
        class="team-grid"
        @end="onDragEnd"
      >
        <template #item="{ element: pokemon }">
          <TeamSlot
            :pokemon="pokemon"
            :swapMode="swapMode"
            :selected="selectedSwapTarget === pokemon.id"
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditPokemon(pokemon.id)"
          />
        </template>
        <template #footer>
          <TeamSlot
            v-for="i in emptySlotCount"
            :key="'empty-' + i"
            :pokemon="null"
            :swapMode="swapMode"
            :selected="selectedSwapTarget === `empty-${i}`"
            @add="swapMode ? handleSwapSelect(`empty-${i}`) : startAdd()"
          />
        </template>
      </draggable>

      <!-- Box Grid -->
      <div v-else class="box-grid">
        <TeamSlot
          v-for="pokemon in box"
          :key="pokemon.id"
          :pokemon="pokemon"
          @edit="handleEditBoxPokemon(pokemon.id)"
        />
        <TeamSlot
          v-for="i in emptyBoxSlotCount"
          :key="'box-empty-' + i"
          :pokemon="null"
          @add="startAddToBox()"
        />
      </div>
    </div>

    <Transition name="scale">
      <DraftPanel
        v-if="showDraftPanel"
        :team="team"
        @confirm="$emit('confirmDraft')"
        @cancel="cancel"
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
import { useDraftAction } from '../composables/useDraftAction.js'
import { POKEMON_DATA } from '../data/pokemon.js'

const props = defineProps({
  team: {
    type: Array,
    required: true
  },
  box: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'confirmDraft',
  'reorderTeam'
])

const { draftAction, isActive, swapMode, startAdd, startEdit, startEditBox, startAddToBox, updateReplaceTarget, cancel } = useDraftAction()

const viewMode = ref('team')

// Local copy for draggable (only actual Pokemon, no nulls)
const localTeam = ref([...props.team])

// Sync when props change
watch(() => props.team, (newTeam) => {
  localTeam.value = [...newTeam]
}, { deep: true })

// Switch to team view when entering swap mode
watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    viewMode.value = 'team'
  }
})

// Number of empty slots to show (max 1)
const emptySlotCount = computed(() => props.team.length < 6 ? 1 : 0)
const emptyBoxSlotCount = computed(() => props.box.length < 3 ? 1 : 0)

// Track selected swap target for UI
const selectedSwapTarget = computed(() => draftAction.value?.replaceTarget)

// Handle clicking a team Pokémon in swap mode
function handleSwapSelect(targetId) {
  if (swapMode.value) {
    updateReplaceTarget(targetId)
  }
}

// Show draft panel for add/edit modes (but not in swap mode)
const showDraftPanel = computed(() => {
  return !!draftAction.value && !swapMode.value
})

// Emit reorder when drag ends
function onDragEnd() {
  emit('reorderTeam', localTeam.value)
}

function handleEditPokemon(id) {
  const pokemon = props.team.find(p => p.id === id)
  if (!pokemon) return
  const pokemonData = POKEMON_DATA.find(p => p.name === pokemon.name)
  startEdit(id, {
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves
  })
}

function handleEditBoxPokemon(boxPokemonId) {
  const pokemon = props.box.find(p => p.id === boxPokemonId)
  if (!pokemon) return
  const pokemonData = POKEMON_DATA.find(p => p.name === pokemon.name)
  startEditBox({
    id: boxPokemonId,
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves
  })
}

function toggleViewMode() {
  if (showDraftPanel.value) {
    cancel()
  }
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
  overflow-x: hidden;
  max-width: 100vw;
}

.mode-toggle {
  position: absolute;
  top: calc(-1 * var(--space-8) - var(--space-8));
  right: var(--space-4);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.mode-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.team-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.box-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
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

<template>
  <div class="team-section-wrapper">
    <!-- Mode Toggle Button (long-press to collapse) -->
    <button
      class="mode-toggle"
      @click="handleModeClick"
      @mousedown="startLongPress"
      @mouseup="cancelLongPress"
      @mouseleave="cancelLongPress"
      @touchstart.prevent="startLongPress"
      @touchend="handleTouchEnd"
      @touchcancel="cancelLongPress"
    >
      <span class="mode-icon">{{ viewMode === 'team' ? '⚔️' : '📦' }}</span>
    </button>

    <Transition name="section-collapse">
    <div v-show="!isCollapsed" class="team-section">
    <!-- Single transition for grid/panel switching -->
    <Transition name="content-fade" mode="out-in">
      <!-- Grid view -->
      <div v-if="!showDraftPanel || swapMode" :key="'grid-' + viewMode">
        <!-- Team Grid -->
        <div v-if="viewMode === 'team'" class="team-grid">
          <TeamSlot
            v-for="pokemon in team"
            :key="pokemon.id"
            :pokemon="pokemon"
            :swapMode="swapMode"
            :selected="selectedSwapTarget === pokemon.id"
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditPokemon(pokemon.id)"
            @delete="handleDeleteTeamPokemon"
          />
          <TeamSlot
            v-for="i in emptySlotCount"
            :key="'empty-' + i"
            :pokemon="null"
            :swapMode="swapMode"
            :selected="selectedSwapTarget === `empty-${i}`"
            @add="swapMode ? handleSwapSelect(`empty-${i}`) : startAdd()"
          />
          <!-- Swap mode actions -->
          <div v-if="swapMode" class="swap-actions">
            <button class="btn btn-cancel" @click="emit('cancelSwap')">✕ Cancel</button>
            <button
              class="btn btn-confirm"
              :disabled="!hasSwapTarget"
              @click="emit('confirmSwap')"
            >✓ Confirm</button>
          </div>
        </div>

        <!-- Box Grid -->
        <div v-else class="box-grid">
          <TeamSlot
            v-for="pokemon in box"
            :key="pokemon.id"
            :pokemon="pokemon"
            @edit="handleEditBoxPokemon(pokemon.id)"
            @delete="handleDeleteBoxPokemon"
          />
          <TeamSlot
            v-for="i in emptyBoxSlotCount"
            :key="'box-empty-' + i"
            :pokemon="null"
            @add="startAddToBox()"
          />
        </div>
      </div>

      <!-- Draft Panel -->
      <DraftPanel
        v-else
        key="panel"
        :team="team"
        @confirm="$emit('confirmDraft')"
        @cancel="cancel"
      />
    </Transition>
    </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { POKEMON_DATA } from '../data/pokemon.js'
import DraftPanel from './DraftPanel.vue'
import TeamSlot from './TeamSlot.vue'

const props = defineProps({
  team: {
    type: Array,
    required: true,
  },
  box: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'confirmDraft',
  'confirmSwap',
  'cancelSwap',
  'deleteTeamPokemon',
  'deleteBoxPokemon',
])

const {
  draftAction,
  swapMode,
  startAdd,
  startEdit,
  startEditBox,
  startAddToBox,
  updateReplaceTarget,
  exitSwapMode,
  cancel,
} = useDraftAction()

// Whether a swap target has been selected
const hasSwapTarget = computed(() => !!draftAction.value?.replaceTarget)

const viewMode = ref('team')
const isCollapsed = ref(false)

// Long-press handling
let longPressTimer = null
let longPressFired = false
const LONG_PRESS_DURATION = 500 // ms

function startLongPress() {
  longPressFired = false
  longPressTimer = setTimeout(() => {
    isCollapsed.value = true
    longPressFired = true
    longPressTimer = null
  }, LONG_PRESS_DURATION)
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function handleTouchEnd() {
  // If timer is still active, this was a quick tap (not a long press)
  if (longPressTimer) {
    cancelLongPress()
    handleModeClick()
  }
  // If timer already fired (longPressTimer is null), long press already collapsed - do nothing
}

function handleModeClick() {
  // If long press just fired, don't also handle click
  if (longPressFired) {
    longPressFired = false
    return
  }
  // If collapsed, expand on click
  if (isCollapsed.value) {
    isCollapsed.value = false
    return
  }
  // Normal toggle behavior
  toggleViewMode()
}

// Switch to team view when entering swap mode
watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    viewMode.value = 'team'
  }
})

// Number of empty slots to show (max 1)
const emptySlotCount = computed(() => (props.team.length < 6 ? 1 : 0))
const emptyBoxSlotCount = computed(() => (props.box.length < 3 ? 1 : 0))

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

function handleEditPokemon(id) {
  const pokemon = props.team.find((p) => p.id === id)
  if (!pokemon) return
  const pokemonData = POKEMON_DATA.find((p) => p.name === pokemon.name)
  startEdit(id, {
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves,
    specialMove: pokemon.specialMove,
  })
}

function handleEditBoxPokemon(boxPokemonId) {
  const pokemon = props.box.find((p) => p.id === boxPokemonId)
  if (!pokemon) return
  const pokemonData = POKEMON_DATA.find((p) => p.name === pokemon.name)
  startEditBox({
    id: boxPokemonId,
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves,
    specialMove: pokemon.specialMove,
  })
}

function toggleViewMode() {
  if (showDraftPanel.value) {
    cancel()
  }
  viewMode.value = viewMode.value === 'team' ? 'box' : 'team'
}

function handleDeleteTeamPokemon(id) {
  emit('deleteTeamPokemon', id)
}

function handleDeleteBoxPokemon(id) {
  emit('deleteBoxPokemon', id)
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
  top: calc(-1 * var(--space-8) - var(--space-2));
  left: var(--space-4);
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

/* Content fade out/in (grid and panel transitions) */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.section-collapse-enter-active,
.section-collapse-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  overflow: hidden;
}

.section-collapse-enter-from,
.section-collapse-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
  transform-origin: top;
}

/* Swap actions */
.swap-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  padding-top: var(--space-3);
}

.swap-actions .btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-base);
}

.swap-actions .btn-cancel {
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.swap-actions .btn-confirm {
  background: var(--color-success);
  border: 1px solid var(--color-success);
  color: white;
}

.swap-actions .btn-confirm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (orientation: portrait) {
  .mode-toggle {
    left: auto;
    right: var(--space-4);
  }
}
</style>

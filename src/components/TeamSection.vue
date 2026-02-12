<template>
  <div class="team-section-wrapper">
    <!-- Swap Action Buttons (cancel/confirm) - shown only in swap mode -->
    <div v-if="swapMode" class="swap-action-buttons">
      <button class="swap-action-btn cancel" @click="handleCancelSwap">
        <span class="action-icon">✕</span>
      </button>
      <button class="swap-action-btn confirm" @click="handleConfirmSwap">
        <span class="action-icon">✓</span>
      </button>
    </div>

    <!-- Add Button (when not editing) -->
    <button v-if="!swapMode && !showDraftPanel" class="add-button" @click="handleAddClick">
      <span class="add-icon">+</span>
    </button>

    <!-- Delete Button (when editing a Pokemon) -->
    <button v-if="isEditing && showDraftPanel" class="add-button delete-mode" @click="handleDeleteClick">
      <span class="add-icon">🗑</span>
    </button>

    <!-- Mode Toggle Button (long-press to collapse) -->
    <button
      class="mode-toggle"
      @click="handleModeClick"
      @mousedown="startLongPress"
      @mouseup="cancelLongPress"
      @mouseleave="cancelLongPress"
      @touchstart.prevent="startLongPress"
      @touchend="onTouchEnd"
      @touchcancel="cancelLongPress"
    >
      <template v-if="swapMode && swapPokemonSpriteUrl">
        <SpriteImg :src="swapPokemonSpriteUrl" :width="32" :height="32" alt="Swap" />
      </template>
      <span v-else-if="isEditingForSwap" class="mode-icon">⇄</span>
      <span v-else class="mode-icon">{{ viewMode === 'team' ? '⚔️' : '📦' }}</span>
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
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditPokemon(pokemon.id)"
            @delete="handleDeleteTeamPokemon"
          />
          <!-- Empty slots for swap mode -->
          <TeamSlot
            v-for="i in emptyTeamSlotCount"
            :key="'team-empty-' + i"
            :pokemon="null"
            @add="swapMode ? handleSwapSelect(null) : startAdd()"
          />
        </div>

        <!-- Box Grid -->
        <div v-else class="box-grid">
          <TeamSlot
            v-for="pokemon in box"
            :key="pokemon.id"
            :pokemon="pokemon"
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditBoxPokemon(pokemon.id)"
            @delete="handleDeleteBoxPokemon"
          />
          <TeamSlot
            v-for="i in emptyBoxSlotCount"
            :key="'box-empty-' + i"
            :pokemon="null"
            @add="swapMode ? handleSwapSelect(null) : startAddToBox()"
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
        @swapSuggestion="handleSwapSuggestion"
      />
    </Transition>
    </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { useLongPress } from '../composables/useLongPress.js'
import { POKEMON_DATA } from '../data/pokemon.js'
import { getMegaSpriteUrl, getSpriteUrl } from '../utils/pokemon.js'
import DraftPanel from './DraftPanel.vue'
import SpriteImg from './SpriteImg.vue'
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
  'immediateSwap',
  'deleteTeamPokemon',
  'deleteBoxPokemon',
  'cancelSwap',
  'deletePokemon',
  'swapSuggestion',
])

const {
  draftAction,
  swapMode,
  startAdd,
  startEdit,
  startEditBox,
  startAddToBox,
  enterSwapMode,
  exitSwapMode,
  cancel,
} = useDraftAction()

// Sprite URL for the pokemon "in hand" during swap mode
const swapPokemonSpriteUrl = computed(() => {
  if (!swapMode.value || !draftAction.value?.pokemon) return null
  const variant = draftAction.value.spriteVariant || 'default'
  if (draftAction.value.megaSpriteId) {
    return getMegaSpriteUrl(draftAction.value.megaSpriteId, variant)
  }
  return getSpriteUrl(draftAction.value.pokemon.name, variant)
})

const viewMode = ref('team')
const isCollapsed = ref(false)

// Long-press handling for collapse
const { longPressFired, startLongPress, cancelLongPress, handleTouchEnd } =
  useLongPress(() => {
    isCollapsed.value = true
  })

function onTouchEnd() {
  handleTouchEnd(handleModeClick)
}

function handleModeClick() {
  // If long press just fired, don't also handle click
  if (longPressFired.value) {
    longPressFired.value = false
    return
  }
  // If collapsed, expand on click
  if (isCollapsed.value) {
    isCollapsed.value = false
    return
  }
  // If in swap mode, clicking toggle cancels swap
  if (swapMode.value) {
    emit('cancelSwap')
    return
  }
  // If editing a team or box Pokemon, start swap mode
  if (isEditingForSwap.value) {
    enterSwapMode()
    return
  }
  // Normal toggle behavior
  toggleViewMode()
}

function handleCancelSwap() {
  emit('cancelSwap')
}

function handleConfirmSwap() {
  exitSwapMode()
}

const previousViewMode = ref('team')

// Switch to opposite view when entering swap mode, reset to team view when exiting
watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    // Show opposite view: editing team → show box, editing box → show team
    previousViewMode.value = viewMode.value
    viewMode.value = draftAction.value?.isTeamPokemon ? 'box' : 'team'
  } else {
    // Restore previous view mode when swap mode ends
    viewMode.value = previousViewMode.value
  }
})

// Number of empty box slots to show in swap mode (when editing a team Pokemon)
const emptyBoxSlotCount = computed(() => {
  // Always show 1 empty slot when in box view (for adding infinite box members)
  if (viewMode.value === 'box' && !swapMode.value) return 1

  // In swap mode, show empty slot when editing a team Pokemon (to move team → box)
  if (swapMode.value && viewMode.value === 'box' && draftAction.value?.isTeamPokemon) return 1

  return 0
})

// Number of empty team slots to show in swap mode (max 1)
const emptyTeamSlotCount = computed(() => {
  // Always show 1 empty slot if team is empty (so there's something to interact with)
  if (props.team.length === 0 && viewMode.value === 'team' && !swapMode.value)
    return 1
  // In swap mode, show empty slot if team has room
  if (!swapMode.value || viewMode.value !== 'team') return 0
  return props.team.length < 6 ? 1 : 0
})

// Handle clicking a team slot in swap mode - perform immediate swap
function handleSwapSelect(targetId) {
  if (swapMode.value) {
    emit('immediateSwap', targetId)
  }
}

// Show draft panel for add/edit modes (but not in swap mode)
const showDraftPanel = computed(() => {
  return !!draftAction.value && !swapMode.value
})

// Detect when editing a team or box Pokemon (for showing swap icon in mode toggle)
const isEditingForSwap = computed(() => {
  return (
    showDraftPanel.value &&
    (draftAction.value?.isBoxPokemon || draftAction.value?.isTeamPokemon)
  )
})

// Detect when editing (for showing delete button)
const isEditing = computed(() => {
  return draftAction.value?.type === 'edit' && !swapMode.value
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
    megaForm: pokemon.megaForm || null,
    megaTypes: pokemon.megaTypes || null,
    megaSpriteId: pokemon.megaSpriteId || null,
    spriteVariant: pokemon.spriteVariant || 'default',
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
    megaForm: pokemon.megaForm || null,
    megaTypes: pokemon.megaTypes || null,
    megaSpriteId: pokemon.megaSpriteId || null,
    spriteVariant: pokemon.spriteVariant || 'default',
  })
}

function toggleViewMode() {
  if (showDraftPanel.value) {
    cancel()
  }
  viewMode.value = viewMode.value === 'team' ? 'box' : 'team'
}

function handleAddClick() {
  if (viewMode.value === 'box') {
    startAddToBox()
  } else {
    startAdd()
  }
}

function handleSwapSuggestion(event) {
  emit('swapSuggestion', event)
}

function handleDeleteClick() {
  emit('deletePokemon')
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
  overflow: visible;
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

.add-button {
  position: absolute;
  bottom: calc(-1 * var(--space-2));
  right: var(--space-4);
  z-index: 1;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  cursor: pointer;
  box-shadow: var(--shadow-md);
}

.add-icon {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1;
  color: var(--color-danger);
}

.add-button.delete-mode .add-icon {
  font-size: 1rem;
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


.swap-action-buttons {
  position: absolute;
  top: calc(-1 * var(--space-8) + var(--space-1));
  left: calc(var(--space-4) + 48px + var(--space-2));
  z-index: 1;
  display: flex;
  gap: var(--space-2);
}

.swap-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: var(--space-2);
  border-radius: var(--radius-xl);
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  transition: all var(--transition-base);
}

.swap-action-btn.cancel {
  border: none;
  color: var(--color-danger);
}

.swap-action-btn.confirm {
  border: none;
  color: var(--color-success);
  margin-right: var(--space-1);
}

.action-icon {
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  -webkit-text-stroke: 1.5px currentColor;
}

.swap-action-btn.confirm .action-icon {
  -webkit-text-stroke: 0.5px currentColor;
}

@media (orientation: portrait) {
  .mode-toggle {
    left: auto;
    right: var(--space-4);
  }

  .swap-action-buttons {
    left: auto;
    right: calc(var(--space-4) + 48px + var(--space-2));
  }
}

@media (orientation: landscape) {
  .team-section-wrapper {
    align-self: flex-start;
  }

  .add-button {
    bottom: var(--space-2);
  }
}
</style>

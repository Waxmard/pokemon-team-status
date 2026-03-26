<template>
  <div class="team-section-wrapper">
    <!-- Swap Action Buttons (cancel/confirm) - shown only in swap mode -->
    <div v-if="!readOnly && swapMode" class="swap-action-buttons">
      <button class="swap-action-btn cancel" @click="handleCancelSwap">
        <span class="action-icon">✕</span>
      </button>
      <button class="swap-action-btn confirm" @click="handleConfirmSwap">
        <span class="action-icon">✓</span>
      </button>
    </div>

    <!-- Add Button (when not editing) -->
    <button v-if="!readOnly && !swapMode && !showDraftPanel" class="add-button" @click="handleAddClick">
      <span class="add-icon">+</span>
    </button>

    <!-- Revive Button - mobile only (when editing a dead Pokemon) -->
    <button
      v-if="!readOnly && isEditingDead && showDraftPanel"
      class="add-button revive-mode mobile-only"
      @click="handleReviveFromDraft"
    >
      <span class="add-icon">❤️</span>
    </button>

    <!-- Delete/Kill Button - mobile only (when editing a Pokemon) -->
    <button
      v-if="!readOnly && isEditing && showDraftPanel"
      class="add-button delete-mode mobile-only"
      @click="handleDeleteClick"
    >
      <span class="add-icon">{{ deleteActionIcon }}</span>
    </button>

    <!-- Mode Toggle Button (long-press to collapse) -->
    <button
      class="mode-toggle"
      :class="{ 'draft-open': showDraftPanel }"
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
      <span v-else class="mode-icon">{{ viewMode === 'team' ? '⚔️' : viewMode === 'box' ? '📦' : '💀' }}</span>
    </button>

    <Transition name="section-collapse">
    <div v-show="!isCollapsed" class="team-section">
    <!-- Single transition for grid/panel switching -->
    <Transition name="content-fade" mode="out-in">
      <!-- Grid view -->
      <div v-if="!showDraftPanel || swapMode" :key="'grid-' + viewMode">
        <!-- Team Grid -->
        <div v-if="viewMode === 'team'" class="slot-grid">
          <TeamSlot
            v-for="pokemon in team"
            :key="pokemon.id"
            :pokemon="pokemon"
            :generation-rules="generationRules"
            :interactive="!readOnly"
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditPokemon(pokemon.id)"
            @delete="handleDeleteTeamPokemon"
          />
          <!-- Empty slots for swap mode -->
          <TeamSlot
            v-for="i in emptyTeamSlotCount"
            :key="'team-empty-' + i"
            :pokemon="null"
            :interactive="!readOnly"
            @add="swapMode ? handleSwapSelect(null) : startAdd()"
          />
        </div>

        <!-- Box Grid -->
        <div v-else-if="viewMode === 'box'" class="slot-grid slot-grid-scrollable">
          <TeamSlot
            v-for="pokemon in box"
            :key="pokemon.id"
            :pokemon="pokemon"
            :generation-rules="generationRules"
            :interactive="!readOnly"
            @edit="swapMode ? handleSwapSelect(pokemon.id) : handleEditBoxPokemon(pokemon.id)"
            @delete="handleDeleteBoxPokemon"
          />
          <TeamSlot
            v-for="i in emptyBoxSlotCount"
            :key="'box-empty-' + i"
            :pokemon="null"
            :interactive="!readOnly"
            @add="swapMode ? handleSwapSelect(null) : startAddToBox()"
          />
        </div>

        <!-- Dead Grid -->
        <div v-else-if="viewMode === 'dead'" class="slot-grid slot-grid-scrollable">
          <div v-for="pokemon in dead" :key="pokemon.id" class="dead-slot">
            <TeamSlot
              :pokemon="pokemon"
              :generation-rules="generationRules"
              :interactive="!readOnly"
              @edit="handleEditDeadPokemon(pokemon.id)"
              @delete="handleDeleteDeadPokemon(pokemon.id)"
            />
          </div>
        </div>
      </div>

      <!-- Draft Panel -->
      <div v-else key="panel" class="draft-panel-wrapper" @click.self="cancel">
        <div class="draft-dialog-container">
          <DraftPanel
            :team="team"
            :box="box"
            :defeated-gyms="defeatedGyms"
            :pinned-gym="pinnedGym"
            :generation-rules="generationRules"
            :partner-roster="partnerRoster"
            :is-soul-link-mode="isSoulLinkMode"
            @confirm="$emit('confirmDraft')"
            @cancel="cancel"
            @swapSuggestion="handleSwapSuggestion"
          />
          <!-- Revive Button - desktop only (when editing a dead Pokemon) -->
          <button
            v-if="!readOnly && isEditingDead"
            class="add-button revive-mode desktop-only"
            @click="handleReviveFromDraft"
          >
            <span class="add-icon">❤️</span>
          </button>
          <!-- Delete/Kill Button - desktop only -->
          <button
            v-if="!readOnly && isEditing"
            class="add-button delete-mode desktop-only"
            @click="handleDeleteClick"
          >
            <span class="add-icon">{{ deleteActionIcon }}</span>
          </button>
          <!-- Swap Button - desktop only -->
          <button
            v-if="isEditingForSwap"
            class="add-button swap-mode-btn desktop-only"
            @click="enterSwapMode()"
          >
            <span class="add-icon">⇄</span>
          </button>
        </div>
      </div>
    </Transition>
    </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { useLongPress } from '../composables/useLongPress.js'
import { getPokemonDataForRules } from '../data/pokemon.js'
import { resolveSpriteUrl } from '../utils/pokemon.js'
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
  generationRules: {
    type: String,
    required: true,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  defeatedGyms: {
    type: Array,
    default: null,
  },
  pinnedGym: {
    type: String,
    default: undefined,
  },
  partnerRoster: {
    type: Array,
    default: null,
  },
  isSoulLinkMode: {
    type: Boolean,
    default: false,
  },
  playerId: {
    type: String,
    default: null,
  },
  dead: {
    type: Array,
    default: () => [],
  },
  deathBoxMode: {
    type: Boolean,
    default: false,
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
  'killPokemon',
  'revivePokemon',
  'exitDeathBox',
  'deleteDeadPokemon',
  'addToDead',
])

const {
  draftAction,
  swapMode,
  startAdd,
  startEdit,
  startEditBox,
  startAddToBox,
  startEditDead,
  startAddToDead,
  enterSwapMode,
  exitSwapMode,
  cancel,
} = useDraftAction()

function getRulesetPokemonData(name) {
  return getPokemonDataForRules(name, props.generationRules)
}

// Sprite URL for the pokemon "in hand" during swap mode
const swapPokemonSpriteUrl = computed(() => {
  if (!swapMode.value || !draftAction.value?.pokemon) return null
  return resolveSpriteUrl(draftAction.value.pokemon.name, {
    variant: draftAction.value.spriteVariant,
    megaSpriteId: draftAction.value.megaSpriteId,
  })
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
  // If in death box, clicking skull exits it
  if (viewMode.value === 'dead') {
    emit('exitDeathBox')
    return
  }
  // If collapsed, expand on click
  if (isCollapsed.value) {
    isCollapsed.value = false
    return
  }
  // If in swap mode, clicking toggle cancels swap
  if (swapMode.value) {
    if (props.readOnly) return
    emit('cancelSwap')
    return
  }
  // If editing a team or box Pokemon, start swap mode
  if (isEditingForSwap.value) {
    if (props.readOnly) return
    enterSwapMode()
    return
  }
  // Normal toggle behavior
  toggleViewMode()
}

function handleCancelSwap() {
  if (props.readOnly) return
  emit('cancelSwap')
}

function handleConfirmSwap() {
  if (props.readOnly) return
  exitSwapMode()
}

// Reset to team view when switching players
watch(
  () => props.playerId,
  () => {
    viewMode.value = 'team'
  },
)

// Enter/exit death box view from external control
watch(
  () => props.deathBoxMode,
  (isDeathBox) => {
    viewMode.value = isDeathBox ? 'dead' : 'team'
  },
)

// Switch to opposite view when entering swap mode, reset to team view when exiting
watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    // Show opposite view: editing team → show box, editing box → show team
    viewMode.value = draftAction.value?.isTeamPokemon ? 'box' : 'team'
  } else {
    viewMode.value = 'team'
  }
})

// Number of empty box slots to show in swap mode (when editing a team Pokemon)
const emptyBoxSlotCount = computed(() => {
  // Show 1 empty slot when box is empty (so there's something to interact with)
  if (viewMode.value === 'box' && !swapMode.value && props.box.length === 0)
    return 1

  // In swap mode, show empty slot when editing a team Pokemon (to move team → box)
  if (
    swapMode.value &&
    viewMode.value === 'box' &&
    draftAction.value?.isTeamPokemon
  )
    return 1

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
  if (!props.readOnly && swapMode.value) {
    emit('immediateSwap', targetId)
  }
}

// Show draft panel for add/edit modes (but not in swap mode)
const showDraftPanel = computed(() => {
  return !!draftAction.value && !swapMode.value && !props.readOnly
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

// Detect when editing a dead Pokemon (for showing revive button)
const isEditingDead = computed(() => {
  return draftAction.value?.isDeadPokemon && !swapMode.value
})

const deleteActionIcon = computed(() => {
  if (isEditingDead.value) return '🗑'
  return props.isSoulLinkMode ? '💀' : '🗑'
})

function handleEditPokemon(id) {
  if (props.readOnly) return
  const pokemon = props.team.find((p) => p.id === id)
  if (!pokemon) return
  const pokemonData = getRulesetPokemonData(pokemon.name)
  startEdit(id, {
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves,
    specialMove: pokemon.specialMove,
    pairId: pokemon.pairId || null,
    megaForm: pokemon.megaForm || null,
    megaTypes: pokemon.megaTypes || null,
    megaSpriteId: pokemon.megaSpriteId || null,
    spriteVariant: pokemon.spriteVariant || 'default',
    catchLocation: pokemon.catchLocation || null,
    nickname: pokemon.nickname || null,
  })
}

function handleEditBoxPokemon(boxPokemonId) {
  if (props.readOnly) return
  const pokemon = props.box.find((p) => p.id === boxPokemonId)
  if (!pokemon) return
  const pokemonData = getRulesetPokemonData(pokemon.name)
  startEditBox({
    id: boxPokemonId,
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves,
    specialMove: pokemon.specialMove,
    pairId: pokemon.pairId || null,
    megaForm: pokemon.megaForm || null,
    megaTypes: pokemon.megaTypes || null,
    megaSpriteId: pokemon.megaSpriteId || null,
    spriteVariant: pokemon.spriteVariant || 'default',
    catchLocation: pokemon.catchLocation || null,
    nickname: pokemon.nickname || null,
  })
}

function toggleViewMode() {
  if (showDraftPanel.value) {
    cancel()
  }
  viewMode.value = viewMode.value === 'team' ? 'box' : 'team'
}

function handleAddClick() {
  if (props.readOnly) return
  if (viewMode.value === 'dead') {
    startAddToDead()
  } else if (viewMode.value === 'box') {
    startAddToBox()
  } else {
    startAdd()
  }
}

function handleSwapSuggestion(event) {
  if (props.readOnly) return
  emit('swapSuggestion', event)
}

function handleDeleteClick() {
  if (props.readOnly) return
  if (draftAction.value?.isDeadPokemon) {
    const id = draftAction.value.deadPokemonId
    if (id) {
      emit('deleteDeadPokemon', { id })
    }
    return
  }
  if (props.isSoulLinkMode) {
    const rosterKey = draftAction.value?.isBoxPokemon ? 'box' : 'team'
    const id = draftAction.value?.isBoxPokemon
      ? draftAction.value.boxPokemonId
      : draftAction.value?.editId
    if (id) {
      emit('killPokemon', { id, rosterKey })
      cancel()
    }
    return
  }
  emit('deletePokemon')
}

function handleDeleteTeamPokemon(id) {
  if (props.readOnly) return
  if (props.isSoulLinkMode) {
    emit('killPokemon', { id, rosterKey: 'team' })
    return
  }
  emit('deleteTeamPokemon', id)
}

function handleDeleteBoxPokemon(id) {
  if (props.readOnly) return
  if (props.isSoulLinkMode) {
    emit('killPokemon', { id, rosterKey: 'box' })
    return
  }
  emit('deleteBoxPokemon', id)
}

function handleEditDeadPokemon(id) {
  if (props.readOnly) return
  const pokemon = props.dead.find((p) => p.id === id)
  if (!pokemon) return
  const pokemonData = getRulesetPokemonData(pokemon.name)
  startEditDead({
    id,
    pokemonData,
    ability: pokemon.ability,
    berry: pokemon.berry || null,
    moves: pokemon.moves,
    specialMove: pokemon.specialMove,
    pairId: pokemon.pairId || null,
    megaForm: pokemon.megaForm || null,
    megaTypes: pokemon.megaTypes || null,
    megaSpriteId: pokemon.megaSpriteId || null,
    spriteVariant: pokemon.spriteVariant || 'default',
    catchLocation: pokemon.catchLocation || null,
    nickname: pokemon.nickname || null,
  })
}

function handleReviveFromDraft() {
  if (props.readOnly) return
  const id = draftAction.value?.deadPokemonId
  if (!id) return
  cancel()
  emit('revivePokemon', id)
  // Switch to box view after the deathBoxMode watcher fires
  nextTick(() => {
    viewMode.value = 'box'
  })
}

function handleDeleteDeadPokemon(id) {
  if (props.readOnly) return
  emit('deleteDeadPokemon', { id })
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

.swap-mode-btn .add-icon {
  color: var(--color-primary);
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

.slot-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.slot-grid-scrollable {
  max-height: 715px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-3) var(--space-3);
  margin: 0 calc(-1 * var(--space-3));
}

/* Content fade out/in (grid and panel transitions) */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}


.section-collapse-enter-active,
.section-collapse-leave-active {
  transition: opacity var(--transition-slow), transform var(--transition-slow);
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

@media (max-width: 1023px) {
  .desktop-only {
    display: none;
  }
}

@media (min-width: 1024px) {
  .mobile-only {
    display: none;
  }

  .slot-grid {
    grid-template-columns: 1fr 1fr;
  }

  .mode-toggle {
    width: 56px;
    height: 56px;
    left: auto;
    right: var(--space-4);
  }

  .mode-toggle.draft-open {
    display: none;
  }

  .mode-toggle :deep(.sprite-wrapper) {
    width: 40px !important;
    height: 40px !important;
  }

  .mode-icon {
    font-size: 1.75rem;
  }

  .add-button {
    width: 44px;
    height: 44px;
  }

  .add-icon {
    font-size: 1.4rem;
  }

  .swap-action-buttons {
    left: auto;
    right: calc(var(--space-4) + 56px + var(--space-2));
  }

  .swap-action-btn {
    width: 38px;
    height: 38px;
  }

  .action-icon {
    font-size: 1.1rem;
  }

  .draft-panel-wrapper {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn var(--transition-base) ease forwards;
  }

  .draft-dialog-container {
    position: relative;
  }

  .draft-dialog-container :deep(.draft-panel) {
    width: 650px;
    max-height: 80vh;
    overflow-y: auto;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    animation: scaleIn var(--transition-base) cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .draft-dialog-container .revive-mode {
    position: absolute;
    bottom: calc(-1 * var(--space-8) - var(--space-4));
    left: var(--space-4);
  }

  .draft-dialog-container .delete-mode {
    position: absolute;
    bottom: calc(-1 * var(--space-8) - var(--space-4));
    right: var(--space-4);
  }

  .draft-dialog-container .swap-mode-btn {
    position: absolute;
    top: calc(-1 * var(--space-8));
    right: var(--space-4);
  }
}

.revive-mode {
  left: var(--space-4);
  right: auto;
}
</style>

<template>
  <div class="draft-panel wizard-mode">
      <div class="wizard-container">
        <!-- Shared header with dynamic title -->
        <div class="wizard-header">
          <h3 class="wizard-title">{{ wizardStepTitle }}</h3>
          <button
            v-if="wizardStep === 'pokemon' && draftAction.isBoxPokemon"
            class="swap-mode-btn"
            @click="onEnterSwapMode"
            aria-label="Swap with team"
          >
            ⇄
          </button>

          <!-- Moves step: inline special move UI -->
          <template v-if="wizardStep === 'moves'">
            <!-- Selected special move badge (when not editing) -->
            <span v-if="localSpecialMove && !showSpecialMoveDropdown" class="special-move-badge-inline">
              {{ localSpecialMove }}
              <button class="clear-special-move-inline" @click="clearSpecialMove">✕</button>
            </span>
            <!-- Autocomplete input (when editing) -->
            <n-auto-complete
              v-if="showSpecialMoveDropdown"
              v-model:value="specialMoveQuery"
              :options="specialMoveOptions"
              placeholder="Special move..."
              @select="onSelectSpecialMove"
              class="special-move-input-inline"
              size="small"
            />
            <!-- Star button (bare icon like evolve) -->
            <button
              class="special-move-btn"
              :class="{ active: showSpecialMoveDropdown || localSpecialMove }"
              @click="toggleSpecialMoveDropdown"
              aria-label="Special moves"
            >
              ✦
            </button>
          </template>
        </div>

        <!-- Step: Pokemon -->
        <div v-if="wizardStep === 'pokemon'" class="wizard-step">
          <n-auto-complete
            ref="pokemonInputRef"
            v-model:value="searchQuery"
            :options="autocompleteOptions"
            placeholder="Search Pokemon..."
            :get-show="() => true"
            @select="onSelectPokemon"
            @update:value="onSearchInput"
            clearable
          />
          <div v-if="draftAction.pokemon" class="pokemon-preview">
            <SpriteImg
              v-if="selectedSpriteUrl"
              :src="selectedSpriteUrl"
              :alt="draftAction.pokemon.name"
              :width="144"
              :height="144"
            />
            <!-- Evolve button positioned inside preview -->
            <button v-if="canEvolve" class="evolve-btn" @click="handleEvolveClick">
              ⬆
            </button>
            <!-- Evolution options positioned under the button -->
            <div v-if="canEvolve && showEvolveOptions" class="evolve-options">
              <button
                v-for="evoName in evolutionOptions"
                :key="evoName"
                class="evolve-option-pill"
                @click="evolveTo(evoName)"
              >
                <SpriteImg :src="getSpriteUrl(evoName)" :alt="evoName" :width="40" :height="40" />
              </button>
            </div>
          </div>
        </div>

        <!-- Step: Ability -->
        <div v-if="wizardStep === 'ability'" class="wizard-step">
          <div class="ability-list">
            <button
              v-for="name in ABILITY_NAMES"
              :key="name"
              @click="toggleAbility(name)"
              class="ability-option"
              :class="{ selected: localAbility === name }"
              :style="getAbilityBackground(localAbility === name)"
            >
              {{ name }}
            </button>
          </div>
        </div>

        <!-- Step: Berry -->
        <div v-if="wizardStep === 'berry'" class="wizard-step">
          <div class="berry-type-grid">
            <button
              v-for="berry in relevantBerries"
              :key="berry.value"
              @click="toggleBerry(berry.value)"
              class="berry-type-option"
              :class="{ selected: localBerry === berry.value }"
              :style="getTypeBackground(berry.type, localBerry === berry.value)"
              :title="berry.label"
            >
              <SpriteImg :src="getBerrySprite(berry.value)" :alt="berry.label" :width="44" :height="44" />
            </button>
          </div>
        </div>

        <!-- Step: Moves -->
        <div v-if="wizardStep === 'moves'" class="wizard-step">
          <div class="moves-type-grid">
            <button
              v-for="type in ALL_TYPES"
              :key="type"
              @click="toggleMoveType(type)"
              class="move-type-option"
              :class="{ selected: isMoveSelected(type) }"
              :style="getTypeBackground(type, isMoveSelected(type))"
              :title="capitalize(type)"
            >
              <img :src="getTypeIcon(type)" :alt="type" class="type-icon" />
            </button>
          </div>
        </div>
      </div>

      <!-- Persistent wizard actions -->
      <div class="wizard-actions-fixed">
        <button
          class="btn btn-icon btn-icon-cancel"
          @click="$emit('cancel')"
          aria-label="Cancel"
        >
          ✕
        </button>

        <div class="wizard-nav-buttons">
          <button
            class="btn btn-icon"
            @click="goToPreviousStep"
            :disabled="!canGoPrevious"
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            class="btn btn-icon"
            @click="goToNextStep"
            :disabled="!canGoNext"
            aria-label="Next step"
          >
            →
          </button>
        </div>

        <button
          v-if="wizardStep === 'pokemon' && !draftAction.pokemon && draftAction.type === 'edit'"
          class="btn btn-icon btn-icon-danger"
          @click="$emit('confirm')"
          aria-label="Delete"
        >
          🗑
        </button>
        <button
          v-else
          class="btn btn-icon btn-icon-success"
          @click="$emit('confirm')"
          :disabled="!canConfirm"
          aria-label="Save"
        >
          ✓
        </button>
      </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { POKEMON_DATA } from '../data/pokemon.js'
import { SPECIAL_MOVE_NAMES } from '../data/specialMoves.js'
import { ALL_TYPES, getTypeIcon, TYPE_COLORS } from '../data/types.js'
import { getBerrySprite, getSpriteUrl } from '../utils/pokemon.js'
import {
  applyAbilityDefense,
  getDefensiveMultiplier,
} from '../utils/typeCalc.js'
import SpriteImg from './SpriteImg.vue'

const props = defineProps({
  hideSearch: {
    type: Boolean,
    default: false,
  },
  team: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['confirm', 'cancel'])

const {
  draftAction,
  updatePokemon,
  updateAbility,
  updateBerry,
  updateMoves,
  updateSpecialMove,
  enterSwapMode,
} = useDraftAction()

// Wizard state
const wizardStep = ref('pokemon')

// Template refs for auto-focus
const pokemonInputRef = ref(null)

function focusPokemonInput() {
  if (props.hideSearch || !pokemonInputRef.value) return

  // Skip auto-focus on touch devices (iOS blocks async programmatic focus)
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return

  const focusInput = () => {
    const inputEl = pokemonInputRef.value?.$el?.querySelector('input')
    if (inputEl) {
      inputEl.focus()
    }
  }

  // Wait for scaleIn animation to complete (300ms + buffer)
  setTimeout(focusInput, 320)
}

const searchQuery = ref('')
const localAbility = ref(null)
const localBerry = ref(null)
const localSpecialMove = ref(null)
const showEvolveOptions = ref(false)
const showSpecialMoveDropdown = ref(false)
const specialMoveQuery = ref('')

// Initialize form state when draftAction changes
watch(
  draftAction,
  (action) => {
    if (!action) return
    searchQuery.value = action.pokemon?.name || ''
    localAbility.value = action.ability
    localBerry.value = action.berry
    localSpecialMove.value = action.specialMove
  },
  { immediate: true, deep: true },
)

// Auto-focus Pokemon name field on open only if empty
onMounted(() => {
  nextTick(() => {
    if (!draftAction.value?.pokemon) {
      focusPokemonInput()
    }
  })
})

// Focus Pokemon input when starting a new add action
watch(
  () => draftAction.value?.pokemon,
  (newPokemon, oldPokemon) => {
    // Focus when transitioning to no pokemon (new add action)
    if (!newPokemon && oldPokemon !== newPokemon) {
      nextTick(() => {
        focusPokemonInput()
      })
    }
  },
)

const canConfirm = computed(() => {
  return !!draftAction.value?.pokemon
})

const wizardStepTitle = computed(() => {
  const titles = {
    pokemon: 'Choose Pokemon',
    ability: 'Choose Ability',
    berry: 'Choose Berry',
    moves: 'Move Types',
  }
  return titles[wizardStep.value]
})

const selectedSpriteUrl = computed(() => {
  if (!draftAction.value?.pokemon) return null
  return getSpriteUrl(draftAction.value.pokemon.name)
})

const autocompleteOptions = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return POKEMON_DATA.filter((p) => p.name.toLowerCase().includes(query))
    .slice(0, 20)
    .map((p) => ({
      label: p.name,
      value: p.name,
      pokemon: p,
    }))
})

const canEvolve = computed(() => !!draftAction.value?.pokemon?.evolvesTo)

const evolutionOptions = computed(() => {
  const evo = draftAction.value?.pokemon?.evolvesTo
  if (!evo) return []
  return Array.isArray(evo) ? evo : [evo]
})

function handleEvolveClick() {
  const options = evolutionOptions.value
  if (options.length === 1) {
    evolveTo(options[0])
  } else {
    showEvolveOptions.value = !showEvolveOptions.value
  }
}

function evolveTo(name) {
  const pokemon = POKEMON_DATA.find((p) => p.name === name)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    showEvolveOptions.value = false
  }
}

function clearSelections() {
  localAbility.value = null
  localBerry.value = null
  localSpecialMove.value = null
  updateAbility(null)
  updateBerry(null)
  updateMoves([])
  updateSpecialMove(null)
}

function onEnterSwapMode() {
  enterSwapMode()
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getTypeBackground(type, selected = false) {
  const color = TYPE_COLORS[type].bg
  const opacity = selected ? 0.7 : 0.1
  const opacityEnd = selected ? 0.5 : 0.05
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacityEnd)} 100%)`,
  }
}

function getAbilityBackground(selected = false) {
  // Use a neutral purple/blue accent color for abilities
  const color = '#8B5CF6'
  const opacity = selected ? 0.5 : 0.08
  const opacityEnd = selected ? 0.3 : 0.02
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacityEnd)} 100%)`,
  }
}

// Wizard-related computed properties
const relevantBerries = computed(() => {
  if (!draftAction.value?.pokemon) return []
  const pokemon = draftAction.value.pokemon
  const weakTypes = ALL_TYPES.filter((attackType) => {
    let mult = getDefensiveMultiplier(attackType, pokemon.types)
    mult = applyAbilityDefense(mult, attackType, localAbility.value)
    return mult > 1
  })
  return weakTypes
    .map((type) => ({
      label: BERRY_BY_TYPE[type],
      value: BERRY_BY_TYPE[type],
      type,
    }))
    .filter((b) => b.label)
})

// Move selection helpers for wizard
const selectedMoveCount = computed(() => {
  return draftAction.value?.moves?.length || 0
})

function isMoveSelected(type) {
  return draftAction.value?.moves?.includes(type)
}

function toggleMoveType(type) {
  const moves = [...(draftAction.value?.moves || [])]
  const existingIndex = moves.indexOf(type)

  if (existingIndex !== -1) {
    // Remove the move
    moves.splice(existingIndex, 1)
  } else {
    // Add the move (no limit)
    moves.push(type)
  }
  updateMoves(moves)
}

// Special move helpers
const specialMoveOptions = computed(() => {
  if (!specialMoveQuery.value) {
    return SPECIAL_MOVE_NAMES.map((name) => ({ label: name, value: name }))
  }
  const query = specialMoveQuery.value.toLowerCase()
  return SPECIAL_MOVE_NAMES.filter((name) =>
    name.toLowerCase().includes(query),
  ).map((name) => ({ label: name, value: name }))
})

function toggleSpecialMoveDropdown() {
  showSpecialMoveDropdown.value = !showSpecialMoveDropdown.value
  if (showSpecialMoveDropdown.value) {
    specialMoveQuery.value = ''
  }
}

function onSelectSpecialMove(value) {
  localSpecialMove.value = value
  updateSpecialMove(value)
  showSpecialMoveDropdown.value = false
  specialMoveQuery.value = ''
}

function clearSpecialMove() {
  localSpecialMove.value = null
  updateSpecialMove(null)
}

// Wizard navigation functions
const wizardSteps = ['pokemon', 'moves', 'berry', 'ability']

const canGoPrevious = computed(() => wizardStep.value !== 'pokemon')

const canGoNext = computed(() => {
  if (wizardStep.value === 'pokemon') return !!draftAction.value?.pokemon
  if (wizardStep.value === 'ability') return false
  return true
})

function goToNextStep() {
  const currentIndex = wizardSteps.indexOf(wizardStep.value)
  if (currentIndex < wizardSteps.length - 1) {
    wizardStep.value = wizardSteps[currentIndex + 1]
  }
}

function goToPreviousStep() {
  const currentIndex = wizardSteps.indexOf(wizardStep.value)
  if (currentIndex > 0) {
    wizardStep.value = wizardSteps[currentIndex - 1]
  }
}

function toggleBerry(value) {
  if (localBerry.value === value) {
    updateBerry(null)
  } else {
    updateBerry(value)
  }
}

function toggleAbility(value) {
  if (localAbility.value === value) {
    updateAbility(null)
  } else {
    updateAbility(value)
  }
}

// Reset wizard step when panel opens
watch(
  draftAction,
  () => {
    wizardStep.value = 'pokemon'
  },
  { immediate: true },
)

function onSelectPokemon(value) {
  const pokemon = POKEMON_DATA.find((p) => p.name === value)
  if (pokemon) {
    clearSelections()
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    pokemonInputRef.value?.blur()
  }
}

function onSearchInput(value) {
  // Only reset if the input doesn't match a valid Pokemon name
  // This prevents resetting after selection when searchQuery is set programmatically
  const matchesPokemon = POKEMON_DATA.some((p) => p.name === value)
  if (!matchesPokemon) {
    updatePokemon(null)
  }
}
</script>

<style scoped>
.draft-panel {
  margin-top: var(--space-4);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  animation: scaleIn var(--transition-slow) ease forwards;
}

.btn {
  padding: var(--space-3) var(--space-5);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Wizard mode styles */
.wizard-mode {
  display: flex;
  flex-direction: column;
}

.wizard-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  max-height: 400px;
  padding-bottom: var(--space-4);
}

.wizard-actions-fixed {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-top: auto;
}

.wizard-nav-buttons {
  display: flex;
  gap: var(--space-2);
}

.btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform var(--transition-base), background var(--transition-base);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.btn-icon-danger {
  background: var(--color-danger, #dc3545);
  border-color: var(--color-danger, #dc3545);
  color: white;
}

.wizard-step {
  animation: fadeSlideIn 0.2s ease;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.wizard-title {
  font-size: 1.1rem;
  margin-bottom: 0;
  text-align: left;
}

.swap-mode-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-light);
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform var(--transition-base);
}

.swap-mode-btn:active {
  transform: scale(0.95);
}

.special-move-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.special-move-btn:hover,
.special-move-btn.active {
  color: rgba(139, 92, 246, 1);
}

.special-move-badge-inline {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: rgba(139, 92, 246, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  white-space: nowrap;
}

.clear-special-move-inline {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  font-size: 0.7rem;
  line-height: 1;
}

.clear-special-move-inline:hover {
  color: var(--color-text);
}

.special-move-input-inline {
  flex: 1;
  max-width: 140px;
}

.wizard-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 50vh;
  overflow-y: auto;
}

.wizard-option {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  font-size: 0.95rem;
}

.wizard-option:active {
  transform: scale(0.98);
}

.wizard-option.wizard-done {
  background: var(--color-surface-light);
  border-style: dashed;
}

/* Moves type grid (6 rows x 3 columns) */
.moves-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.move-type-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  cursor: pointer;
  aspect-ratio: 1;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.move-type-option:active:not(:disabled) {
  transform: scale(0.96);
}

.move-type-option.selected {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.move-type-option .type-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

/* Berry grid (3 columns like move types) */
.berry-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.berry-type-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  cursor: pointer;
  aspect-ratio: 1;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.berry-type-option:active {
  transform: scale(0.96);
}

.berry-type-option.selected {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Ability list (1 column) */
.ability-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ability-option {
  padding: var(--space-3) var(--space-4);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.ability-option:active {
  transform: scale(0.98);
}

.ability-option.selected {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.wizard-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.pokemon-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--space-4) 0;
}

.evolve-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-3);
  background: transparent;
  border: none;
  color: var(--color-success);
  font-size: 1.25rem;
  font-weight: 900;
  cursor: pointer;
  padding: var(--space-1);
}

.evolve-btn:active {
  transform: scale(0.95);
}

.evolve-options {
  position: absolute;
  top: calc(var(--space-2) + 2.5rem);
  right: var(--space-3);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-1);
  z-index: 10;
}

.evolve-option-pill {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  padding: var(--space-1);
  transition: all var(--transition-base);
}

.evolve-option-pill:active {
  transform: scale(0.95);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .wizard-container {
    min-height: 180px;
    max-height: 260px;
    padding-bottom: var(--space-2);
  }

  .pokemon-preview {
    margin: var(--space-2) 0;
  }

  .wizard-header {
    margin-bottom: var(--space-2);
  }
}
</style>

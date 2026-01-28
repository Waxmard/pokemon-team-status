<template>
  <div class="draft-panel wizard-mode">
      <div class="wizard-container">
        <!-- Step: Pokemon -->
        <div v-if="wizardStep === 'pokemon'" class="wizard-step">
          <div class="wizard-header">
            <h3 class="wizard-title">Choose Pokemon</h3>
            <button
              v-if="draftAction.isBoxPokemon"
              class="swap-mode-btn"
              @click="onEnterSwapMode"
              aria-label="Swap with team"
            >
              ⇄
            </button>
          </div>

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
            <img
              v-if="selectedSpriteUrl"
              :src="selectedSpriteUrl"
              :alt="draftAction.pokemon.name"
              class="pokemon-sprite"
            />
          </div>
        </div>

        <!-- Step: Ability -->
        <div v-if="wizardStep === 'ability'" class="wizard-step">
          <h3 class="wizard-title">Choose Ability</h3>
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
          <h3 class="wizard-title">Choose Berry</h3>
          <p class="wizard-hint" v-if="relevantBerries.length">
            Berries that help against your weaknesses:
          </p>
          <p class="wizard-hint" v-else>
            No type weaknesses - berry optional
          </p>
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
              <img :src="getBerrySprite(berry.value)" :alt="berry.label" class="berry-icon" />
            </button>
          </div>
        </div>

        <!-- Step: Moves -->
        <div v-if="wizardStep === 'moves'" class="wizard-step">
          <h3 class="wizard-title">Move Types</h3>
          <div class="moves-type-grid">
            <button
              v-for="type in ALL_TYPES"
              :key="type"
              @click="toggleMoveType(type)"
              class="move-type-option"
              :class="{ selected: isMoveSelected(type), disabled: !isMoveSelected(type) && selectedMoveCount >= 4 }"
              :style="getTypeBackground(type, isMoveSelected(type))"
              :disabled="!isMoveSelected(type) && selectedMoveCount >= 4"
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { NAutoComplete } from 'naive-ui'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES, TYPE_COLORS, getTypeIcon } from '../data/types.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getSpriteUrl, getBerrySprite } from '../utils/pokemon.js'
import { getDefensiveMultiplier, applyAbilityDefense } from '../utils/typeCalc.js'
import { useDraftAction } from '../composables/useDraftAction.js'

const props = defineProps({
  hideSearch: {
    type: Boolean,
    default: false
  },
  team: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const {
  draftAction,
  updatePokemon,
  updateAbility,
  updateBerry,
  updateMove,
  enterSwapMode
} = useDraftAction()

// Wizard state
const wizardStep = ref('pokemon')

// Template refs for auto-focus
const pokemonInputRef = ref(null)

const searchQuery = ref('')
const localAbility = ref(null)
const localBerry = ref(null)

// Initialize form state when draftAction changes
watch(draftAction, (action) => {
  if (!action) return
  searchQuery.value = action.pokemon?.name || ''
  localAbility.value = action.ability
  localBerry.value = action.berry
}, { immediate: true, deep: true })

// Auto-focus Pokemon name field on open only if empty, and handle resize
onMounted(() => {
  nextTick(() => {
    if (!props.hideSearch && pokemonInputRef.value && !draftAction.value?.pokemon) {
      pokemonInputRef.value.focus()
    }
  })

})

const canConfirm = computed(() => {
  return !!draftAction.value?.pokemon
})

const selectedSpriteUrl = computed(() => {
  if (!draftAction.value?.pokemon) return null
  return getSpriteUrl(draftAction.value.pokemon.name)
})

const autocompleteOptions = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return POKEMON_DATA
    .filter(p => p.name.toLowerCase().includes(query))
    .slice(0, 20)
    .map(p => ({
      label: p.name,
      value: p.name,
      pokemon: p
    }))
})

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
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacityEnd)} 100%)`
  }
}

function getAbilityBackground(selected = false) {
  // Use a neutral purple/blue accent color for abilities
  const color = '#8B5CF6'
  const opacity = selected ? 0.5 : 0.08
  const opacityEnd = selected ? 0.3 : 0.02
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacityEnd)} 100%)`
  }
}

// Wizard-related computed properties
const relevantBerries = computed(() => {
  if (!draftAction.value?.pokemon) return []
  const pokemon = draftAction.value.pokemon
  const weakTypes = ALL_TYPES.filter(attackType => {
    let mult = getDefensiveMultiplier(attackType, pokemon.types)
    mult = applyAbilityDefense(mult, attackType, localAbility.value)
    return mult > 1
  })
  return weakTypes.map(type => ({
    label: BERRY_BY_TYPE[type],
    value: BERRY_BY_TYPE[type],
    type
  })).filter(b => b.label)
})

// Move selection helpers for wizard
const selectedMoveCount = computed(() => {
  return draftAction.value?.moves.filter(m => m).length || 0
})

function isMoveSelected(type) {
  return draftAction.value?.moves.includes(type)
}

function toggleMoveType(type) {
  const moves = [...(draftAction.value?.moves || [])]
  const existingIndex = moves.indexOf(type)

  if (existingIndex !== -1) {
    // Remove the move
    moves[existingIndex] = null
    // Compact the array (shift nulls to end)
    const nonNull = moves.filter(m => m)
    while (nonNull.length < 4) nonNull.push(null)
    nonNull.forEach((m, i) => updateMove({ index: i, value: m }))
  } else if (selectedMoveCount.value < 4) {
    // Add the move to first empty slot
    const emptyIndex = moves.findIndex(m => !m)
    if (emptyIndex !== -1) {
      updateMove({ index: emptyIndex, value: type })
    }
  }
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
watch(draftAction, () => {
  wizardStep.value = 'pokemon'
}, { immediate: true })

function onSelectPokemon(value) {
  const pokemon = POKEMON_DATA.find(p => p.name === value)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
  }
}

function onSearchInput(value) {
  // Only reset if the input doesn't match a valid Pokemon name
  // This prevents resetting after selection when searchQuery is set programmatically
  const matchesPokemon = POKEMON_DATA.some(p => p.name === value)
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
  overflow-y: auto;
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.wizard-header .wizard-title {
  margin-bottom: 0;
}

.wizard-title {
  font-size: 1.1rem;
  margin-bottom: var(--space-4);
  text-align: center;
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

.wizard-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-bottom: var(--space-3);
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

.move-type-option.disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

.berry-type-option .berry-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--space-4) 0;
}

.pokemon-preview .pokemon-sprite {
  width: 144px;
  height: 144px;
  object-fit: contain;
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
</style>

<template>
  <div class="draft-panel" :class="{ 'wizard-mode': isMobile }">
    <!-- Desktop: existing form -->
    <template v-if="!isMobile">
      <div class="form-header">
        <div class="form-header-fields">
          <div v-if="!hideSearch" class="form-group">
            <label class="form-label">Pokemon Name</label>
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
          </div>

          <div class="form-group">
            <label class="form-label">Ability (Optional)</label>
            <n-select
              ref="abilityInputRef"
              v-model:value="localAbility"
              :options="abilityOptions"
              placeholder="Select ability..."
              filterable
              clearable
              @update:value="handleAbilityUpdate"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Berry (Optional)</label>
            <div class="berry-select-row">
              <n-select
                ref="berryInputRef"
                v-model:value="localBerry"
                :options="berryOptions"
                placeholder="Select berry..."
                filterable
                clearable
                @update:value="handleBerryUpdate"
              />
              <img
                v-if="berrySpriteUrl"
                :src="berrySpriteUrl"
                :alt="localBerry"
                class="berry-preview"
              />
            </div>
          </div>
        </div>

        <div v-if="draftAction.pokemon" class="selected-pokemon-preview">
          <img
            v-if="selectedSpriteUrl"
            :src="selectedSpriteUrl"
            :alt="draftAction.pokemon.name"
            class="pokemon-sprite"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Move Types (Optional)</label>
        <div class="moves-grid">
          <n-auto-complete
            v-for="i in 4"
            :key="i"
            :ref="el => moveInputRefs[i-1] = el"
            v-model:value="moveQueries[i-1]"
            :options="getMoveAutocompleteOptions(i-1)"
            :placeholder="draftAction.moves[i-1] || 'Type...'"
            :get-show="() => true"
            @select="(val) => onSelectMove(i-1, val)"
            @update:value="(val) => onMoveInput(i-1, val)"
            clearable
          />
        </div>
      </div>

      <!-- Replace dropdown for box Pokemon -->
      <div v-if="draftAction.isBoxPokemon" class="form-group">
        <label class="form-label">Move to Team (Replace)</label>
        <n-select
          v-model:value="localReplaceTarget"
          :options="replaceTargetOptions"
          placeholder="Keep in box (no replace)"
          clearable
          @update:value="updateReplaceTarget"
        />
      </div>

      <div class="draft-actions">
        <button
          class="btn btn-success"
          @click="$emit('confirm')"
          :disabled="!canConfirm"
        >
          Confirm
        </button>
        <button class="btn btn-secondary" @click="$emit('cancel')">
          Cancel
        </button>
      </div>
    </template>

    <!-- Mobile: wizard flow -->
    <template v-else>
      <div class="wizard-container">
        <!-- Step: Pokemon -->
        <div v-if="wizardStep === 'pokemon'" class="wizard-step">
          <h3 class="wizard-title">Choose Pokemon</h3>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { NAutoComplete, NSelect } from 'naive-ui'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES, TYPE_COLORS, getTypeIcon } from '../data/types.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_NAMES, BERRY_BY_TYPE } from '../data/berries.js'
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
  updateReplaceTarget
} = useDraftAction()

// Mobile detection and wizard state
const isMobile = ref(window.innerWidth < 768)
const wizardStep = ref('pokemon')

// Template refs for auto-focus
const pokemonInputRef = ref(null)
const abilityInputRef = ref(null)
const berryInputRef = ref(null)
const moveInputRefs = ref([])

const searchQuery = ref('')
const localAbility = ref(null)
const localBerry = ref(null)
const moveQueries = ref(['', '', '', ''])
const localReplaceTarget = ref(null)

// Initialize form state when draftAction changes
watch(draftAction, (action) => {
  if (!action) return
  searchQuery.value = action.pokemon?.name || ''
  localAbility.value = action.ability
  localBerry.value = action.berry
  moveQueries.value = (action.moves || []).map(m => m || '')
  localReplaceTarget.value = action.replaceTarget || null
}, { immediate: true })

// Auto-focus Pokemon name field on open only if empty, and handle resize
onMounted(() => {
  nextTick(() => {
    if (!props.hideSearch && pokemonInputRef.value && !draftAction.value?.pokemon) {
      pokemonInputRef.value.focus()
    }
  })

  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
})

// Options for replace target dropdown
const replaceTargetOptions = computed(() => {
  const options = []

  // Add team members
  props.team.forEach(p => {
    options.push({
      label: p.name,
      value: p.id
    })
  })

  // Add empty slots if team has room
  const emptySlots = 6 - props.team.length
  for (let i = 1; i <= emptySlots; i++) {
    options.push({
      label: `Empty Slot ${i}`,
      value: `empty-${i}`
    })
  }

  return options
})

const canConfirm = computed(() => {
  return !!draftAction.value?.pokemon
})

const selectedSpriteUrl = computed(() => {
  if (!draftAction.value?.pokemon) return null
  return getSpriteUrl(draftAction.value.pokemon.name)
})

const berrySpriteUrl = computed(() => {
  return getBerrySprite(localBerry.value)
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

const abilityOptions = computed(() => {
  return [
    { label: 'None', value: null },
    ...ABILITY_NAMES.map(name => ({ label: name, value: name }))
  ]
})

const berryOptions = computed(() => {
  return [
    { label: 'None', value: null },
    ...BERRY_NAMES.map(name => ({ label: name, value: name }))
  ]
})

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

function confirmWizardStep() {
  if (wizardStep.value === 'pokemon') {
    if (!draftAction.value?.pokemon) {
      // No pokemon = delete action (for edits) or cancel (for adds)
      emit('confirm')
    } else {
      wizardStep.value = 'moves'
    }
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

function getMoveAutocompleteOptions(index) {
  const query = moveQueries.value[index]
  if (!query) return ALL_TYPES.map(type => ({ label: capitalize(type), value: type }))
  const lowerQuery = query.toLowerCase()
  return ALL_TYPES
    .filter(type => type.toLowerCase().includes(lowerQuery))
    .map(type => ({ label: capitalize(type), value: type }))
}

function onSelectPokemon(value) {
  const pokemon = POKEMON_DATA.find(p => p.name === value)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    // Auto-advance to ability field
    nextTick(() => {
      if (abilityInputRef.value) {
        abilityInputRef.value.focus()
      }
    })
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

function handleAbilityUpdate(value) {
  updateAbility(value)
  // Auto-advance to berry field
  nextTick(() => {
    if (berryInputRef.value) {
      berryInputRef.value.focus()
    }
  })
}

function handleBerryUpdate(value) {
  updateBerry(value)
  // Auto-advance to first move field
  nextTick(() => {
    if (moveInputRefs.value[0]) {
      moveInputRefs.value[0].focus()
    }
  })
}

function onSelectMove(index, value) {
  moveQueries.value[index] = value
  updateMove({ index, value })
  // Auto-advance to next move field (if not last)
  if (index < 3) {
    nextTick(() => {
      if (moveInputRefs.value[index + 1]) {
        moveInputRefs.value[index + 1].focus()
      }
    })
  }
}

function onMoveInput(index, value) {
  if (!value) {
    updateMove({ index, value: null })
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

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.form-header {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.form-header-fields {
  flex: 3;
}

.form-header-fields .form-group {
  margin-bottom: var(--space-3);
}

.form-header-fields .form-group:last-child {
  margin-bottom: 0;
}

.selected-pokemon-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pokemon-sprite {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

.berry-select-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.berry-select-row .n-select {
  flex: 1;
}

.berry-preview {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.moves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.draft-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
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

.btn-primary {
  background: var(--color-primary, #007bff);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-success);
}

.btn-secondary {
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-card);
  color: var(--color-text-primary);
}

.btn-danger {
  background: var(--color-danger, #dc3545);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
}

@media (max-width: 480px) {
  .moves-grid {
    grid-template-columns: 1fr;
  }
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

.btn-icon:hover:not(:disabled) {
  background: var(--color-card);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon-cancel:hover:not(:disabled) {
  background: var(--color-surface-light);
  border-color: var(--color-text-muted);
}

.btn-icon-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.btn-icon-success:hover:not(:disabled) {
  background: var(--color-success);
  box-shadow: var(--shadow-glow-success);
}

.btn-icon-danger {
  background: var(--color-danger, #dc3545);
  border-color: var(--color-danger, #dc3545);
  color: white;
}

.btn-icon-danger:hover:not(:disabled) {
  background: var(--color-danger, #dc3545);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
}

.wizard-step {
  animation: fadeSlideIn 0.2s ease;
}

.wizard-title {
  font-size: 1.1rem;
  margin-bottom: var(--space-4);
  text-align: center;
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

.move-type-option:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255, 255, 255, 0.2);
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

.berry-type-option:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255, 255, 255, 0.2);
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
  max-height: 50vh;
  overflow-y: auto;
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

.ability-option:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255, 255, 255, 0.2);
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

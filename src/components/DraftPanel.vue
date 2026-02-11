<template>
  <div class="draft-panel wizard-mode">
      <div class="wizard-container">
        <!-- Shared header with dynamic title -->
        <div class="wizard-header">
          <h3 class="wizard-title">{{ wizardStepTitle }}</h3>

          <!-- Pokemon step: suggestion button -->
          <template v-if="wizardStep === 'pokemon' && canShowSuggestion">
            <span class="suggestion-group">
              <span
                v-if="showSuggestion && swapSuggestion"
                class="suggestion-inline"
                @click="$emit('swapSuggestion', {
                  currentId: draftAction.isTeamPokemon ? draftAction.editId : draftAction.boxPokemonId,
                  candidateId: swapSuggestion.candidate.id,
                  isTeamMember: !!draftAction.isTeamPokemon,
                })"
              >
                <SpriteImg
                  :src="getSuggestionSpriteUrl(draftAction.pokemon.name, draftAction.spriteVariant, draftAction.megaSpriteId)"
                  :alt="draftAction.pokemon.name"
                  :width="24"
                  :height="24"
                />
                <span class="suggestion-swap-icon">⇄</span>
                <SpriteImg
                  :src="getSuggestionSpriteUrl(swapSuggestion.candidate.name, swapSuggestion.candidate.spriteVariant, swapSuggestion.candidate.megaSpriteId)"
                  :alt="swapSuggestion.candidate.name"
                  :width="24"
                  :height="24"
                />
                <span v-if="suggestionIndicator" :class="['suggestion-indicator', suggestionIndicator.cls]">
                  {{ suggestionIndicator.symbol }}
                </span>
              </span>
              <button
                v-else
                class="suggestion-btn"
                :class="{ active: showSuggestion }"
                @click="toggleSuggestion"
                aria-label="Swap suggestion"
              >
                ✦
              </button>
            </span>
          </template>

          <!-- Moves step: inline special move UI -->
          <template v-if="wizardStep === 'moves'">
            <!-- Selected special move badge (when not editing) -->
            <span v-if="draftAction.specialMove && !showSpecialMoveDropdown" class="special-move-badge-inline">
              {{ draftAction.specialMove }}
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
              :class="{ active: showSpecialMoveDropdown || draftAction.specialMove }"
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
            <button
              class="variant-btn"
              :class="{ active: draftAction.spriteVariant !== 'default' }"
              @click="cycleSpriteVariant"
              aria-label="Switch sprite variant"
            >
              ⇄
            </button>
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
                v-for="option in evolutionOptions"
                :key="option.isMega ? option.name : option"
                class="evolve-option-pill"
                :class="{ 'mega-selected': isCurrentMega(option) }"
                @click="evolveTo(option)"
              >
                <SpriteImg :src="getEvoSpriteUrl(option)" :alt="option.isMega ? option.name : option" :width="40" :height="40" />
              </button>
            </div>
          </div>
        </div>

        <!-- Step: Ability -->
        <div v-if="wizardStep === 'ability'" class="wizard-step">
          <n-auto-complete
            v-model:value="abilityQuery"
            :options="abilityAutocompleteOptions"
            placeholder="Search ability..."
            @select="onSelectAbility"
            @update:value="onAbilityInput"
            clearable
          />
          <div class="pokemon-preview">
            <SpriteImg
              v-if="selectedSpriteUrl"
              :src="selectedSpriteUrl"
              :alt="draftAction.pokemon?.name"
              :width="144"
              :height="144"
            />
            <!-- Selection overlays (top-left) -->
            <div class="selection-overlays">
              <div v-if="draftAction.moves?.length" class="move-icons-overlay">
                <img v-for="type in draftAction.moves" :key="type" :src="getTypeIcon(type)" class="overlay-type-icon" />
              </div>
              <SpriteImg v-if="draftAction.berry" :src="getBerrySprite(draftAction.berry)" class="overlay-berry" :width="24" :height="24" />
            </div>
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
              :class="{ selected: draftAction.berry === berry.value }"
              :style="getTypeBackground(berry.type, draftAction.berry === berry.value)"
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
import { NAutoComplete } from 'naive-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { useStorage } from '../composables/useStorage.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getMegaOptions } from '../data/megaEvolutions.js'
import { POKEMON_DATA } from '../data/pokemon.js'
import { SPECIAL_MOVE_NAMES } from '../data/specialMoves.js'
import { ALL_TYPES, getTypeIcon, TYPE_COLORS } from '../data/types.js'
import { hexToRgba } from '../utils/colors.js'
import {
  buildPokemonMember,
  getBerrySprite,
  getMegaSpriteUrl,
  getSmallSpriteUrl,
  getSpriteUrl,
} from '../utils/pokemon.js'
import {
  applyAbilityDefense,
  findBestSwap,
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

defineEmits(['confirm', 'cancel', 'swapSuggestion'])

const {
  draftAction,
  updatePokemon,
  updateAbility,
  updateBerry,
  updateMoves,
  updateSpecialMove,
  updateMegaForm,
  updateSpriteVariant,
} = useDraftAction()

const { team: storageTeam, box, defeatedGyms } = useStorage()

// Suggestion state
const showSuggestion = ref(false)

const canShowSuggestion = computed(() => {
  if (!draftAction.value) return false
  const isEditing =
    draftAction.value.isTeamPokemon || draftAction.value.isBoxPokemon
  if (!isEditing) return false
  // The opposite pool must have at least one member
  if (draftAction.value.isTeamPokemon) return box.value.length > 0
  return storageTeam.value.length > 0
})

const swapSuggestion = computed(() => {
  if (!showSuggestion.value || !canShowSuggestion.value) return null
  if (!draftAction.value?.pokemon) return null

  const isTeamMember = !!draftAction.value.isTeamPokemon
  const currentMember = buildPokemonMember(draftAction.value, {
    id: draftAction.value.editId ?? draftAction.value.boxPokemonId,
  })

  if (isTeamMember) {
    // Editing team member: find best box member to swap in
    // Build a draft team reflecting the user's current edits
    const draftTeam = props.team.map((p) =>
      p.id === currentMember.id ? currentMember : p,
    )
    return findBestSwap(
      draftTeam,
      currentMember,
      true,
      box.value,
      defeatedGyms.value,
    )
  } else {
    // Editing box member: find best team member to replace
    return findBestSwap(
      props.team,
      currentMember,
      false,
      props.team,
      defeatedGyms.value,
    )
  }
})

const suggestionIndicator = computed(() => {
  if (!swapSuggestion.value) return null
  const imp = swapSuggestion.value.improvement
  if (imp > 0) return { symbol: '\u25B2', cls: 'improvement-up' }
  if (imp < 0) return { symbol: '\u25BC', cls: 'improvement-down' }
  return { symbol: '\u2014', cls: 'improvement-neutral' }
})

function toggleSuggestion() {
  showSuggestion.value = !showSuggestion.value
}

function getSuggestionSpriteUrl(pokemonName, spriteVariant, megaSpriteId) {
  const variant = spriteVariant || 'default'
  if (megaSpriteId) return getMegaSpriteUrl(megaSpriteId, variant)
  return getSmallSpriteUrl(pokemonName, variant)
}

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
const showEvolveOptions = ref(false)
const showSpecialMoveDropdown = ref(false)
const specialMoveQuery = ref('')
const abilityQuery = ref('')

// Initialize form state when draftAction changes
watch(
  draftAction,
  (action) => {
    if (!action) return
    searchQuery.value = action.pokemon?.name || ''
    abilityQuery.value = action.ability || ''
  },
  { immediate: true, deep: true },
)

// Auto-focus Pokemon name field on open only if empty
onMounted(() => {
  nextTick(() => {
    // Scroll page to top
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Existing focus logic
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
    berry: 'Choose Item',
    moves: 'Move Types',
  }
  return titles[wizardStep.value]
})

// Probe for female sprite availability per-Pokemon
const femaleAvailable = ref(false)

watch(
  () => draftAction.value?.pokemon,
  (pokemon) => {
    femaleAvailable.value = false
    if (!pokemon) return
    const index = POKEMON_DATA.findIndex((p) => p.name === pokemon.name)
    if (index === -1) return
    const id = pokemon.spriteId ?? index + 1
    const img = new Image()
    img.onload = () => {
      femaleAvailable.value = true
    }
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/${id}.png`
  },
  { immediate: true },
)

const availableVariants = computed(() => {
  const variants = ['default', 'shiny']
  if (femaleAvailable.value && !draftAction.value?.megaSpriteId) {
    variants.push('female', 'shiny-female')
  }
  return variants
})

function cycleSpriteVariant() {
  const current = draftAction.value?.spriteVariant || 'default'
  const variants = availableVariants.value
  const currentIndex = variants.indexOf(current)
  const nextIndex = (currentIndex + 1) % variants.length
  updateSpriteVariant(variants[nextIndex])
}

const selectedSpriteUrl = computed(() => {
  if (!draftAction.value?.pokemon) return null
  const variant = draftAction.value.spriteVariant || 'default'
  // Use mega sprite if mega form is active
  if (draftAction.value.megaSpriteId) {
    return getMegaSpriteUrl(draftAction.value.megaSpriteId, variant)
  }
  return getSpriteUrl(draftAction.value.pokemon.name, variant)
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

const megaOptions = computed(() => {
  if (!draftAction.value?.pokemon) return []
  return getMegaOptions(draftAction.value.pokemon.name)
})

const canEvolve = computed(() => {
  return !!draftAction.value?.pokemon?.evolvesTo || megaOptions.value.length > 0
})

const evolutionOptions = computed(() => {
  const evo = draftAction.value?.pokemon?.evolvesTo
  const evoList = evo ? (Array.isArray(evo) ? evo : [evo]) : []
  // Add mega options as special entries
  const megas = megaOptions.value.map((mega) => ({
    isMega: true,
    form: mega.form,
    types: mega.types,
    spriteId: mega.spriteId,
    ability: mega.ability,
    name: `${draftAction.value.pokemon.name}-${mega.form}`,
  }))
  return [...evoList, ...megas]
})

function handleEvolveClick() {
  const options = evolutionOptions.value
  if (options.length === 1) {
    evolveTo(options[0])
  } else {
    showEvolveOptions.value = !showEvolveOptions.value
  }
}

function getEvoSpriteUrl(option) {
  if (option.isMega) {
    return getMegaSpriteUrl(option.spriteId)
  }
  return getSpriteUrl(option)
}

function isCurrentMega(option) {
  return option.isMega && draftAction.value?.megaForm === option.form
}

function evolveTo(option) {
  // Handle mega evolution option
  if (option.isMega) {
    // Toggle mega: if already selected, deselect
    if (draftAction.value?.megaForm === option.form) {
      updateMegaForm(null, null, null)
      // Clear ability if it was set by the mega
      if (option.ability && draftAction.value?.ability === option.ability) {
        updateAbility(null)
      }
    } else {
      updateMegaForm(option.form, option.types, option.spriteId)
      // Auto-apply ability if the mega has one
      if (option.ability) {
        updateAbility(option.ability)
      }
    }
    showEvolveOptions.value = false
    return
  }

  // Handle regular evolution (option is just a string name)
  const pokemon = POKEMON_DATA.find((p) => p.name === option)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    // Clear mega form when evolving to a different Pokemon
    updateMegaForm(null, null, null)
    showEvolveOptions.value = false
  }
}

function clearSelections() {
  updateAbility(null)
  updateBerry(null)
  updateMoves([])
  updateSpecialMove(null)
  updateMegaForm(null, null, null)
  updateSpriteVariant('default')
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getTypeBackground(type, selected = false) {
  const color = TYPE_COLORS[type].bg
  const opacity = selected ? 0.7 : 0.1
  const opacityEnd = selected ? 0.5 : 0.05
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
    mult = applyAbilityDefense(mult, attackType, draftAction.value.ability)
    return mult > 1
  })
  const berries = weakTypes
    .map((type) => ({
      label: BERRY_BY_TYPE[type],
      value: BERRY_BY_TYPE[type],
      type,
    }))
    .filter((b) => b.label)

  // Always include Nevermelt Ice if not already present
  if (!berries.some((b) => b.value === 'Nevermelt Ice')) {
    berries.push({
      label: 'Nevermelt Ice',
      value: 'Nevermelt Ice',
      type: 'ice',
    })
  }
  // Always include Air Balloon if not already present
  if (!berries.some((b) => b.value === 'Air Balloon')) {
    berries.push({
      label: 'Air Balloon',
      value: 'Air Balloon',
      type: 'ground',
    })
  }
  return berries
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

// Ability autocomplete helpers
const abilityAutocompleteOptions = computed(() => {
  if (!abilityQuery.value) {
    return ABILITY_NAMES.map((name) => ({ label: name, value: name }))
  }
  const query = abilityQuery.value.toLowerCase()
  return ABILITY_NAMES.filter((name) => name.toLowerCase().includes(query)).map(
    (name) => ({ label: name, value: name }),
  )
})

function onSelectAbility(value) {
  if (draftAction.value?.ability === value) {
    updateAbility(null)
    abilityQuery.value = ''
  } else {
    updateAbility(value)
    abilityQuery.value = value
  }
}

function onAbilityInput(value) {
  const matchesAbility = ABILITY_NAMES.includes(value)
  if (!matchesAbility) {
    updateAbility(null)
  }
}

function toggleSpecialMoveDropdown() {
  showSpecialMoveDropdown.value = !showSpecialMoveDropdown.value
  if (showSpecialMoveDropdown.value) {
    specialMoveQuery.value = ''
  }
}

function onSelectSpecialMove(value) {
  updateSpecialMove(value)
  showSpecialMoveDropdown.value = false
  specialMoveQuery.value = ''
}

function clearSpecialMove() {
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
  if (draftAction.value?.berry === value) {
    updateBerry(null)
  } else {
    updateBerry(value)
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

.suggestion-group {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.suggestion-btn {
  background: transparent;
  border: none;
  color: rgba(139, 92, 246, 1);
  font-size: 1.25rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.suggestion-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  animation: fadeSlideIn 0.2s ease;
}

.suggestion-inline:active {
  opacity: 0.7;
}

.suggestion-swap-icon {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.suggestion-indicator {
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: var(--space-1);
}

.improvement-up { color: var(--color-success); }
.improvement-down { color: var(--color-danger); }
.improvement-neutral { color: var(--color-text-muted); }

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

/* Selection overlays positioned top-left of sprite */
.selection-overlays {
  position: absolute;
  top: var(--space-2);
  left: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.move-icons-overlay {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  max-width: 80px;
}

.overlay-type-icon {
  width: 20px;
  height: 20px;
}

.overlay-berry {
  width: 24px;
  height: 24px;
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

.variant-btn {
  position: absolute;
  top: var(--space-2);
  left: var(--space-3);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  font-weight: 900;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.variant-btn:active {
  transform: scale(0.95);
}

.variant-btn.active {
  color: rgba(139, 92, 246, 1);
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
  right: var(--space-2);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-1);
  z-index: 10;
}

.evolve-option-pill {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all var(--transition-base);
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.evolve-option-pill:active {
  transform: scale(0.95);
}

.evolve-option-pill.mega-selected {
  filter: drop-shadow(0 0 3px rgba(34, 197, 94, 0.6));
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

@media (orientation: portrait) {
  .wizard-container {
    min-height: 220px;
    max-height: 390px;
  }
}
</style>

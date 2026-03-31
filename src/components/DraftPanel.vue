<template>
  <div class="draft-panel wizard-mode">
      <div class="wizard-container">
        <!-- Shared header with dynamic title -->
        <div class="wizard-header">
          <label v-if="wizardStep === 'pokemon' && draftAction.pokemon" class="wizard-title-field">
            <span v-if="!displayName" class="wizard-title-placeholder">Pokemon Name</span>
            <input
              :value="displayName"
              :size="Math.max((displayName.length || 12) + 2, 3)"
              class="wizard-title wizard-title-input"
              type="text"
              maxlength="32"
              @blur="handleNicknameBlur"
              @focus="$event.target.select()"
            />
          </label>
          <h3 v-else class="wizard-title">{{ wizardStepTitle }}</h3>

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
        <div v-if="wizardStep === 'pokemon'" class="wizard-step pokemon-step">
          <n-auto-complete
            ref="pokemonInputRef"
            v-model:value="searchQuery"
            :options="autocompleteOptions"
            placeholder="Search Pokemon..."
            :get-show="() => true"
            @select="onSelectPokemon"
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
            <div v-if="previewTypes.length" class="preview-type-list">
              <span
                v-for="(type, index) in previewTypes"
                :key="type"
                class="preview-type-label"
              >
                <span :style="getTypeTextColor(type)">
                  {{ capitalize(type) }}<span v-if="index < previewTypes.length - 1">,</span>
                </span>
              </span>
            </div>
            <SpriteImg
              v-if="selectedSpriteUrl"
              :src="selectedSpriteUrl"
              :alt="draftAction.pokemon.name"
              :width="144"
              :height="144"
            />
            <!-- Catch location display on pokemon step -->
            <span v-if="draftAction.catchLocation" class="preview-catch-location">
              {{ draftAction.catchLocation }}
            </span>
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

        <!-- Step: Catch Location -->
        <div v-if="wizardStep === 'catchLocation'" class="wizard-step catch-location-step">
          <n-auto-complete
            v-model:value="catchLocationQuery"
            :options="catchLocationOptions"
            placeholder="Enter location..."
            @select="onSelectCatchLocation"
            @update:value="onCatchLocationInput"
            clearable
          />
          <div v-if="isSoulLinkMode" class="pokemon-preview">
            <SpriteImg
              v-if="matchedPartnerForLocation"
              :src="getPartnerPreviewSpriteUrl(matchedPartnerForLocation)"
              :alt="matchedPartnerForLocation.name"
              :width="144"
              :height="144"
            />
            <svg v-else-if="draftAction.catchLocation" class="broken-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <div v-if="matchedPartnerForLocation?.types?.length" class="preview-type-list">
              <span
                v-for="(type, index) in matchedPartnerForLocation.types"
                :key="type"
                class="preview-type-label"
              >
                <span :style="getTypeTextColor(type)">
                  {{ capitalize(type) }}<span v-if="index < matchedPartnerForLocation.types.length - 1">,</span>
                </span>
              </span>
            </div>
            <span v-if="matchedPartnerForLocation?.nickname" class="preview-partner-nickname">
              {{ matchedPartnerForLocation.nickname }}
            </span>
            <span v-if="draftAction.catchLocation" class="preview-catch-location">
              {{ matchedPartnerForLocation ? draftAction.catchLocation : 'Not Yet Linked' }}
            </span>
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
              v-for="type in activeTypes"
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
import { useRunStore } from '../composables/useRunStore.js'
import { useWizardNavigation } from '../composables/useWizardNavigation.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getMegaOptions } from '../data/megaEvolutions.js'
import {
  getPokemonByName,
  getPokemonDataForRules,
  POKEMON_DATA,
} from '../data/pokemon.js'
import { SPECIAL_MOVE_NAMES } from '../data/specialMoves.js'
import { getAllTypesForRules, getTypeIcon, TYPE_COLORS } from '../data/types.js'
import { hexToRgba } from '../utils/colors.js'
import {
  getMemberTypesForRules,
  sanitizeDraftActionForRules,
} from '../utils/generationRules.js'
import {
  buildPokemonMember,
  getBerrySprite,
  getMegaSpriteUrl,
  getSpriteUrl,
  resolveSpriteUrl,
} from '../utils/pokemon.js'
import { getSuggestionIndicator } from '../utils/suggestion.js'
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
  box: {
    type: Array,
    default: null,
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
  generationRules: {
    type: String,
    default: null,
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
  updateCatchLocation,
  updateNickname,
  updateMegaForm,
  updateSpriteVariant,
} = useDraftAction()

const {
  team: storageTeam,
  box: storageBox,
  defeatedGyms: storageDefeatedGyms,
  pinnedGym: storagePinnedGym,
  generationRules: storageGenerationRules,
} = useRunStore()

// Use props when provided, fall back to solo store
const effectiveBox = computed(() => props.box ?? storageBox.value)
const effectiveDefeatedGyms = computed(
  () => props.defeatedGyms ?? storageDefeatedGyms.value,
)
const effectivePinnedGym = computed(
  () => props.pinnedGym ?? storagePinnedGym.value,
)
const effectiveGenerationRules = computed(
  () => props.generationRules ?? storageGenerationRules.value,
)

// Suggestion state
const showSuggestion = ref(false)

const canShowSuggestion = computed(() => {
  if (!draftAction.value) return false
  const isEditing =
    draftAction.value.isTeamPokemon || draftAction.value.isBoxPokemon
  if (!isEditing) return false
  // The opposite pool must have at least one member
  if (draftAction.value.isTeamPokemon) return effectiveBox.value.length > 0
  return props.team.length > 0
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
      effectiveBox.value,
      effectiveDefeatedGyms.value,
      effectivePinnedGym.value,
      effectiveGenerationRules.value,
    )
  } else {
    // Editing box member: find best team member to replace
    return findBestSwap(
      props.team,
      currentMember,
      false,
      props.team,
      effectiveDefeatedGyms.value,
      effectivePinnedGym.value,
      effectiveGenerationRules.value,
    )
  }
})

const suggestionIndicator = computed(() =>
  swapSuggestion.value
    ? getSuggestionIndicator(swapSuggestion.value.improvement)
    : null,
)

function toggleSuggestion() {
  showSuggestion.value = !showSuggestion.value
}

function getPartnerPreviewSpriteUrl(partner) {
  return resolveSpriteUrl(partner.name, {
    variant: partner.spriteVariant,
    megaSpriteId: partner.megaSpriteId,
  })
}

function getSuggestionSpriteUrl(pokemonName, spriteVariant, megaSpriteId) {
  return resolveSpriteUrl(pokemonName, {
    variant: spriteVariant,
    megaSpriteId,
    small: true,
  })
}

// Wizard state
const wizardSteps = computed(() => {
  return ['pokemon', 'catchLocation', 'moves', 'berry', 'ability']
})

const {
  currentStep: wizardStep,
  canGoPrevious,
  canGoNext,
  goToNext: goToNextStep,
  goToPrevious: goToPreviousStep,
  reset: resetWizardStep,
} = useWizardNavigation(wizardSteps, (step) => {
  if (step === 'pokemon') return !!draftAction.value?.pokemon
  if (step === 'catchLocation') return !isDuplicateCatchLocation.value
  if (step === 'ability') return false
  return true
})

// Template refs for auto-focus
const pokemonInputRef = ref(null)

function focusPokemonInput() {
  if (props.hideSearch || !pokemonInputRef.value) return

  // Skip auto-focus on touch devices (iOS blocks async programmatic focus)
  if ('ontouchstart' in globalThis || navigator.maxTouchPoints > 0) return

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

const activeTypes = computed(() =>
  getAllTypesForRules(effectiveGenerationRules.value),
)

const effectiveDraftPokemon = computed(() => {
  if (!draftAction.value?.pokemon?.name) return null
  return getPokemonDataForRules(
    draftAction.value.pokemon.name,
    effectiveGenerationRules.value,
  )
})

const previewTypes = computed(() => {
  if (draftAction.value?.megaTypes?.length) {
    return draftAction.value.megaTypes
  }

  return effectiveDraftPokemon.value?.types || []
})

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

watch(effectiveGenerationRules, (ruleset) => {
  if (!draftAction.value?.pokemon?.name) return

  const sanitizedDraft = sanitizeDraftActionForRules(draftAction.value, ruleset)
  draftAction.value = sanitizedDraft

  abilityQuery.value = sanitizedDraft.ability || ''
})

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

const displayName = computed(() => draftAction.value?.nickname || '')

function handleNicknameBlur(event) {
  const trimmed = event.target.value.trim()
  const speciesName = draftAction.value?.pokemon?.name
  updateNickname(trimmed && trimmed !== speciesName ? trimmed : null)
}

const wizardStepTitle = computed(() => {
  const name = draftAction.value?.nickname || draftAction.value?.pokemon?.name
  if (!name) return 'Choose Pokemon'
  const titles = {
    pokemon: name,
    catchLocation: 'Catch Location',
    ability: `${name}'s Ability`,
    berry: `${name}'s Item`,
    moves: `${name}'s Move Types`,
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
  return resolveSpriteUrl(draftAction.value.pokemon.name, {
    variant: draftAction.value.spriteVariant,
    megaSpriteId: draftAction.value.megaSpriteId,
  })
})

function filterOptions(
  items,
  query,
  { mapItem = (name) => ({ label: name, value: name }), limit } = {},
) {
  if (!query) return limit ? [] : items.map(mapItem)
  const q = query.toLowerCase()
  const filtered = items.filter((item) =>
    (typeof item === 'string' ? item : item.name).toLowerCase().includes(q),
  )
  return (limit ? filtered.slice(0, limit) : filtered).map(mapItem)
}

const autocompleteOptions = computed(() =>
  filterOptions(POKEMON_DATA, searchQuery.value, {
    mapItem: (p) => ({ label: p.name, value: p.name, pokemon: p }),
    limit: 20,
  }),
)

const megaOptions = computed(() => {
  if (!effectiveDraftPokemon.value) return []
  return getMegaOptions(
    effectiveDraftPokemon.value.name,
    effectiveGenerationRules.value,
  )
})

const canEvolve = computed(() => {
  return (
    !!effectiveDraftPokemon.value?.evolvesTo || megaOptions.value.length > 0
  )
})

const evolutionOptions = computed(() => {
  const evo = effectiveDraftPokemon.value?.evolvesTo
  const evoList = evo ? [evo].flat() : []
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
  const pokemon = getPokemonDataForRules(option, effectiveGenerationRules.value)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    // Clear mega form when evolving to a different Pokemon
    updateMegaForm(null, null, null)
    showEvolveOptions.value = false
  }
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

function getTypeTextColor(type) {
  return {
    color: PREVIEW_TYPE_COLORS[type] || TYPE_COLORS[type].bg,
  }
}

const PREVIEW_TYPE_COLORS = {
  normal: '#7d7d4f',
  fire: '#d94708',
  water: '#2d6fe6',
  electric: '#c79600',
  grass: '#3f9f2a',
  ice: '#2d9fb0',
  fighting: '#9f1f19',
  poison: '#812c98',
  ground: '#b88a1c',
  flying: '#6c63db',
  psychic: '#e03274',
  bug: '#7d9100',
  rock: '#90761c',
  ghost: '#53408c',
  dragon: '#4c16d1',
  dark: '#4c3b30',
  steel: '#7b86a8',
  fairy: '#d75f85',
}

// Wizard-related computed properties
const relevantBerries = computed(() => {
  if (!effectiveDraftPokemon.value) return []
  const weakTypes = activeTypes.value.filter((attackType) => {
    let mult = getDefensiveMultiplier(
      attackType,
      getMemberTypesForRules(
        effectiveDraftPokemon.value,
        effectiveGenerationRules.value,
      ),
      effectiveGenerationRules.value,
    )
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

  if (existingIndex === -1) {
    // Add the move (no limit)
    moves.push(type)
  } else {
    // Remove the move
    moves.splice(existingIndex, 1)
  }
  updateMoves(moves)
}

// Special move helpers
const specialMoveOptions = computed(() =>
  filterOptions(SPECIAL_MOVE_NAMES, specialMoveQuery.value),
)

// Ability autocomplete helpers
const abilityAutocompleteOptions = computed(() =>
  filterOptions(ABILITY_NAMES, abilityQuery.value),
)

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

// Catch location state
const catchLocationQuery = ref('')

function locationMatchesQuery(location, query) {
  return !query || location.toLowerCase().includes(query)
}

function createCatchLocationOption(location, disabled) {
  return disabled
    ? {
        label: `${location} (already used)`,
        value: location,
        disabled: true,
      }
    : { label: location, value: location }
}

function collectOwnCatchLocations(team, box, editId) {
  const ownLocations = new Set()

  for (const member of [...team, ...box]) {
    if (member.id !== editId && member.catchLocation) {
      ownLocations.add(member.catchLocation)
    }
  }

  return ownLocations
}

function collectPartnerUnlinkedCatchLocations(partnerRoster) {
  if (!partnerRoster) return []

  const partnerLocations = new Set()

  for (const member of partnerRoster) {
    if (member.catchLocation && !member.pairId) {
      partnerLocations.add(member.catchLocation)
    }
  }

  return [...partnerLocations]
}

function buildPartnerCatchLocationOptions(
  partnerLocations,
  ownLocations,
  query,
) {
  return partnerLocations
    .filter((location) => locationMatchesQuery(location, query))
    .map((location) =>
      createCatchLocationOption(location, ownLocations.has(location)),
    )
}

function buildOwnCatchLocationOptions(partnerLocations, ownLocations, query) {
  return [...ownLocations]
    .filter((location) => locationMatchesQuery(location, query))
    .filter((location) => !partnerLocations.includes(location))
    .map((location) => createCatchLocationOption(location, true))
}

watch(
  () => draftAction.value?.catchLocation,
  (catchLocation) => {
    catchLocationQuery.value = catchLocation || ''
  },
  { immediate: true },
)

const catchLocationOptions = computed(() => {
  const query = catchLocationQuery.value.toLowerCase()
  const editId = draftAction.value?.editId || draftAction.value?.boxPokemonId
  const ownLocations = collectOwnCatchLocations(props.team, props.box, editId)
  const partnerLocations = collectPartnerUnlinkedCatchLocations(
    props.partnerRoster,
  )

  return [
    ...buildPartnerCatchLocationOptions(partnerLocations, ownLocations, query),
    ...buildOwnCatchLocationOptions(partnerLocations, ownLocations, query),
  ]
})

const matchedPartnerForLocation = computed(() => {
  if (!props.partnerRoster || !catchLocationQuery.value) return null
  const query = catchLocationQuery.value.toLowerCase()
  // Include already-paired partner (same location, or directly paired by id)
  return props.partnerRoster.find(
    (m) =>
      m.catchLocation &&
      m.catchLocation.toLowerCase() === query &&
      (!m.pairId || m.id === draftAction.value?.pairId),
  )
})

function onSelectCatchLocation(value) {
  catchLocationQuery.value = value
  updateCatchLocation(value)
}

function onCatchLocationInput(value) {
  catchLocationQuery.value = value ?? ''
  const trimmed = (value ?? '').trim()
  updateCatchLocation(trimmed || null)
}

function unlinkCatchLocation() {
  catchLocationQuery.value = ''
  updateCatchLocation(null)
}

const isDuplicateCatchLocation = computed(() => {
  if (!props.isSoulLinkMode || !catchLocationQuery.value) return false
  const query = catchLocationQuery.value.trim().toLowerCase()
  if (!query) return false

  const editId = draftAction.value?.editId || draftAction.value?.boxPokemonId
  return [...props.team, ...props.box].some(
    (m) =>
      m.id !== editId &&
      m.catchLocation &&
      m.catchLocation.toLowerCase() === query,
  )
})

function toggleBerry(value) {
  if (draftAction.value?.berry === value) {
    updateBerry(null)
  } else {
    updateBerry(value)
  }
}

// Reset wizard step when panel opens
watch(draftAction, () => resetWizardStep(), { immediate: true })

function onSelectPokemon(value) {
  const pokemon = getPokemonDataForRules(value, effectiveGenerationRules.value)
  if (pokemon) {
    updatePokemon(pokemon)
    searchQuery.value = pokemon.name
    pokemonInputRef.value?.blur()
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
  padding-bottom: var(--space-3);
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
  animation: fadeSlideIn var(--transition-base);
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: var(--space-4);
}

.pokemon-step {
  overflow: visible;
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
  white-space: nowrap;
}

.wizard-title-input {
  width: auto;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: text;
  background-image: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wizard-title-field {
  position: relative;
  display: inline-block;
}

.wizard-title-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
  background-image: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wizard-title-field:focus-within .wizard-title-placeholder {
  display: none;
}

.wizard-title-input:focus {
  outline: none;
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
  animation: fadeSlideIn var(--transition-base);
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
  filter: var(--drop-shadow-icon);
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
  filter: var(--drop-shadow-icon);
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.berry-type-option:active {
  transform: scale(0.96);
}

.berry-type-option.selected {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
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
  overflow: visible;
  filter: var(--drop-shadow-icon);
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

.preview-type-list {
  position: absolute;
  bottom: -2rem;
  left: var(--space-3);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.14rem;
  padding-bottom: 0.2rem;
  overflow: visible;
  z-index: 1;
  pointer-events: none;
}

.preview-type-label {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
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

.broken-link-icon {
  width: 80px;
  height: 80px;
  color: var(--color-text-muted);
  opacity: 0.35;
}

.preview-partner-nickname {
  position: absolute;
  top: var(--space-2);
  right: var(--space-3);
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
  color: var(--color-text-primary);
  pointer-events: none;
  z-index: 1;
}

.preview-catch-location {
  position: absolute;
  bottom: -2rem;
  right: var(--space-3);
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
  color: var(--color-text-primary);
  pointer-events: none;
  z-index: 1;
}

.catch-location-step {
  overflow: visible;
}

.unlink-location-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  font-weight: 900;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
  color: var(--color-danger);
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

@media (min-width: 1024px) {
  .moves-type-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-1);
  }

  .move-type-option {
    padding: var(--space-1);
  }

  .move-type-option .type-icon {
    width: 32px;
    height: 32px;
  }

  .preview-type-label,
  .preview-catch-location,
  .preview-partner-nickname {
    font-size: 0.85rem;
  }
}
</style>

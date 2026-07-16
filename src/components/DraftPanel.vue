<template>
  <div class="draft-panel wizard-mode">
    <div class="wizard-container">
      <div class="wizard-header">
        <template v-if="activeField === null">
          <label v-if="draftAction.pokemon" class="wizard-title-field">
            <span v-if="!displayName" class="wizard-title-placeholder">{{ draftAction.pokemon?.name || 'Pokemon Name' }}</span>
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
          <h3 v-else class="wizard-title">{{ fieldTitle }}</h3>

          <div v-if="draftAction.pokemon" class="header-actions">
            <template v-if="canShowSuggestion">
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
          </div>
        </template>

        <template v-else>
          <button class="back-btn" @click="closeField" aria-label="Back">
            ←
          </button>
          <h3 class="wizard-title">{{ fieldTitle }}</h3>
          <div v-if="activeField === 'moves'" class="special-move-header">
            <span v-if="draftAction.specialMove && !showSpecialMoveDropdown" class="special-move-badge-inline">
              {{ draftAction.specialMove }}
              <button class="clear-special-move-inline" @click="clearSpecialMove">✕</button>
            </span>
            <n-auto-complete
              v-if="showSpecialMoveDropdown"
              v-model:value="specialMoveQuery"
              :options="specialMoveOptions"
              placeholder="Special move..."
              @select="onSelectSpecialMove"
              class="special-move-input-inline"
              size="small"
            />
            <button
              class="special-move-btn"
              :class="{ active: showSpecialMoveDropdown || draftAction.specialMove }"
              @click="toggleSpecialMoveDropdown"
              aria-label="Special moves"
            >
              ✦
            </button>
          </div>
          <div v-else class="wizard-header-spacer" />
        </template>
      </div>

      <div v-if="!draftAction.pokemon" class="wizard-empty-state">
        <n-auto-complete
          v-if="!hideSearch"
          ref="pokemonInputRef"
          v-model:value="searchQuery"
          :options="autocompleteOptions"
          placeholder="Search Pokemon..."
          :get-show="() => true"
          @select="onSelectPokemon"
          clearable
        />
      </div>

      <template v-else>
        <div v-if="activeField === null" class="overview-view">
          <div class="overview-search-row">
            <n-auto-complete
              v-if="!hideSearch"
              ref="pokemonInputRef"
              v-model:value="searchQuery"
              :options="autocompleteOptions"
              placeholder="Search Pokemon..."
              :get-show="() => true"
              @select="onSelectPokemon"
              clearable
              class="overview-search"
            />
            <button class="details-icon-btn" @click="openField('details')" aria-label="More details">
              🔧
            </button>
          </div>

          <PokemonPreview
              :sprite-url="selectedSpriteUrl"
              :sprite-alt="draftAction.pokemon.name"
              :types="previewTypes"
              :evolving="isEvolving"
            >
              <template #top-left>
                <button
                  class="variant-btn"
                  :class="{ active: draftAction.spriteVariant !== 'default' }"
                  @click="cycleSpriteVariant"
                  aria-label="Switch sprite variant"
                >
                  ⇄
                </button>
              </template>
              <template #top-right>
                <button v-if="canEvolve" class="evolve-btn" :disabled="isEvolving" @click="handleEvolveClick">
                  ⬆
                </button>
              </template>
              <template #bottom-right>
                <input
                  v-if="!isSoulLinkMode"
                  class="preview-location-input"
                  type="text"
                  :value="catchLocationQuery"
                  :size="Math.max((catchLocationQuery.length || 8) + 1, 3)"
                  placeholder="Location"
                  @mousedown="focusLocationInput"
                  @touchend="focusLocationInput"
                  @input="onCatchLocationInput($event.target.value)"
                  @blur="onCatchLocationInput($event.target.value)"
                />
                <button
                  v-else
                  class="preview-location-trigger"
                  @click="openField('catchLocation')"
                >
                  {{ draftAction.catchLocation || 'Location' }}
                </button>
              </template>
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
            </PokemonPreview>
        </div>

        <div v-else-if="activeField === 'catchLocation'" class="editor-view catch-location-view">
          <n-auto-complete
            v-model:value="catchLocationQuery"
            :options="catchLocationOptions"
            placeholder="Enter location..."
            @select="onSelectCatchLocation"
            @update:value="onCatchLocationInput"
            clearable
          />
          <PokemonPreview
            v-if="isSoulLinkMode"
            :sprite-url="matchedPartnerForLocation ? getPartnerPreviewSpriteUrl(matchedPartnerForLocation) : null"
            :sprite-alt="matchedPartnerForLocation?.name"
            :types="matchedPartnerForLocation?.types"
            :catch-location="draftAction.catchLocation"
            :catch-location-label="matchedPartnerForLocation ? draftAction.catchLocation : 'Not Yet Linked'"
            :show-broken-link="!matchedPartnerForLocation && !!draftAction.catchLocation"
          >
            <template #top-right>
              <span v-if="matchedPartnerForLocation?.nickname" class="preview-partner-nickname">
                {{ matchedPartnerForLocation.nickname }}
              </span>
            </template>
          </PokemonPreview>
          <PokemonPreview
            v-else
            :sprite-url="selectedSpriteUrl"
            :sprite-alt="draftAction.pokemon?.name"
            :types="previewTypes"
            :catch-location="draftAction.catchLocation"
          />
        </div>

        <div v-else-if="activeField === 'details'" class="editor-view details-editor">
          <section class="details-section">
            <h4 class="details-section-title">Ability</h4>
            <n-auto-complete
              v-model:value="abilityQuery"
              :options="abilityAutocompleteOptions"
              placeholder="Search ability..."
              @select="onSelectAbility"
              @update:value="onAbilityInput"
              clearable
            />
          </section>

          <section class="details-section">
            <h4 class="details-section-title">Item</h4>
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
          </section>
        </div>

        <div v-else-if="activeField === 'moves'" class="editor-view">
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
      </template>
    </div>

  </div>
</template>

<script setup>
import { NAutoComplete } from 'naive-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDraftAction } from '../composables/useDraftAction.js'
import { useRunStore } from '../composables/useRunStore.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getMegaOptions } from '../data/megaEvolutions.js'
import { getPokemonDataForRules, POKEMON_DATA } from '../data/pokemon.js'
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
import { capitalize } from '../utils/string.js'
import { getSuggestionIndicator } from '../utils/suggestion.js'
import {
  applyAbilityDefense,
  findBestSwap,
  getDefensiveMultiplier,
} from '../utils/typeCalc.js'
import PokemonPreview from './PokemonPreview.vue'
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

const emit = defineEmits(['confirm', 'cancel', 'swapSuggestion', 'autosave'])

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

const activeField = ref(null)

function openField(field) {
  activeField.value = field
  showEvolveOptions.value = false
}

function closeField() {
  activeField.value = null
  showSpecialMoveDropdown.value = false
}

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
const isEvolving = ref(false)
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

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

onMounted(() => {
  nextTick(() => {
    // Scroll page to top (mobile only — avoids jarring jumps on desktop)
    if (isTouchDevice) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (!draftAction.value?.pokemon) {
      focusPokemonInput()
    }
  })
})

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

const displayName = computed(() => draftAction.value?.nickname || '')

function handleNicknameBlur(event) {
  const trimmed = event.target.value.trim()
  const speciesName = draftAction.value?.pokemon?.name
  updateNickname(trimmed && trimmed !== speciesName ? trimmed : null)
}

const fieldTitle = computed(() => {
  const name = draftAction.value?.nickname || draftAction.value?.pokemon?.name
  const titles = {
    catchLocation: 'Catch Location',
    details: `${name}'s Details`,
    moves: `${name}'s Move Types`,
  }
  return titles[activeField.value] ?? name ?? 'Choose Pokemon'
})

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
  if (option.isMega) {
    // Toggle mega: if already selected, deselect (no animation)
    if (draftAction.value?.megaForm === option.form) {
      updateMegaForm(null, null, null)
      // Clear ability if it was set by the mega
      if (option.ability && draftAction.value?.ability === option.ability) {
        updateAbility(null)
      }
      showEvolveOptions.value = false
      return
    }

    // Activating mega — animate
    showEvolveOptions.value = false
    isEvolving.value = true

    setTimeout(() => {
      updateMegaForm(option.form, option.types, option.spriteId)
      if (option.ability) {
        updateAbility(option.ability)
      }
    }, 400)

    setTimeout(() => {
      isEvolving.value = false
    }, 1200)
    return
  }

  // option is a plain string name here (mega options are objects, handled above)
  const pokemon = getPokemonDataForRules(option, effectiveGenerationRules.value)
  if (pokemon) {
    showEvolveOptions.value = false
    isEvolving.value = true

    setTimeout(() => {
      updatePokemon(pokemon)
      searchQuery.value = pokemon.name
      // Clear mega form when evolving to a different Pokemon
      updateMegaForm(null, null, null)
    }, 400)

    setTimeout(() => {
      isEvolving.value = false
    }, 1200)
  }
}

function getTypeBackground(type, selected = false) {
  const color = TYPE_COLORS[type].bg
  const opacity = selected ? 0.7 : 0.1
  const opacityEnd = selected ? 0.5 : 0.05
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacityEnd)} 100%)`,
  }
}

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

const selectedMoveCount = computed(() => {
  return draftAction.value?.moves?.length || 0
})

const limitedMoveTypes = computed(() =>
  (draftAction.value?.moves || []).slice(0, 4),
)

const overflowMoveCount = computed(() =>
  Math.max((draftAction.value?.moves?.length || 0) - 4, 0),
)

function isMoveSelected(type) {
  return draftAction.value?.moves?.includes(type)
}

function toggleMoveType(type) {
  const moves = [...(draftAction.value?.moves || [])]
  const existingIndex = moves.indexOf(type)

  if (existingIndex === -1) {
    // No cap on move count
    moves.push(type)
  } else {
    moves.splice(existingIndex, 1)
  }
  updateMoves(moves)
}

const specialMoveOptions = computed(() =>
  filterOptions(SPECIAL_MOVE_NAMES, specialMoveQuery.value),
)

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

function focusLocationInput(event) {
  if (document.activeElement !== event.currentTarget) {
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    if (isTouchDevice) {
      window.scrollBy({ top: 150, behavior: 'smooth' })
    }
  }
}

function onCatchLocationInput(value) {
  catchLocationQuery.value = value ?? ''
  const trimmed = (value ?? '').trim()
  updateCatchLocation(trimmed || null)
}

function toggleBerry(value) {
  if (draftAction.value?.berry === value) {
    updateBerry(null)
  } else {
    updateBerry(value)
  }
}

watch(
  draftAction,
  () => {
    activeField.value = null
    showSuggestion.value = false
    showEvolveOptions.value = false
    showSpecialMoveDropdown.value = false
  },
  { immediate: true },
)

const autosaveSignature = computed(() => {
  const action = draftAction.value
  if (!action?.pokemon) return null

  return JSON.stringify({
    pokemon: action.pokemon.name,
    nickname: action.nickname,
    ability: action.ability,
    berry: action.berry,
    moves: action.moves ?? [],
    specialMove: action.specialMove,
    catchLocation: action.catchLocation,
    spriteVariant: action.spriteVariant,
    megaForm: action.megaForm,
    megaSpriteId: action.megaSpriteId,
    megaTypes: action.megaTypes ?? [],
  })
})

const lastAutosaveSignature = ref(null)

watch(
  () => draftAction.value,
  () => {
    lastAutosaveSignature.value = autosaveSignature.value
  },
  { immediate: true },
)

watch(autosaveSignature, (signature) => {
  if (!signature || signature === lastAutosaveSignature.value) return
  lastAutosaveSignature.value = signature
  emit('autosave')
})

function onSelectPokemon(value) {
  const pokemon = getPokemonDataForRules(value, effectiveGenerationRules.value)
  if (pokemon) {
    updatePokemon(pokemon)
    const isNewAdd = ['add', 'addToBox', 'addToDead'].includes(
      draftAction.value?.type,
    )
    if (isNewAdd && !draftAction.value.moves?.length) {
      draftAction.value.moves = [...pokemon.types]
    }
    searchQuery.value = pokemon.name
    pokemonInputRef.value?.blur()
  }
}

defineExpose({ openField })
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

.wizard-mode {
  display: flex;
  flex-direction: column;
}

.wizard-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  max-height: 520px;
}

.wizard-empty-state,
.overview-view,
.editor-view {
  animation: fadeSlideIn var(--transition-base);
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: var(--space-4);
}

.overview-view,
.catch-location-view {
  overflow: visible;
}

.overview-view {
  padding-bottom: 0;
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.wizard-title {
  font-size: 1.1rem;
  margin-bottom: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.back-btn {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: var(--space-1);
}

.special-move-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-width: 0;
  flex: 1;
}

.wizard-header-spacer {
  width: 2rem;
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

.details-icon-btn {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.05rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: color var(--transition-base), transform var(--transition-base);
}

.details-icon-btn:active {
  transform: scale(0.95);
}

.details-icon-btn:hover {
  color: var(--color-text-primary);
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

.overview-view :deep(.pokemon-preview) {
  filter: none;
  margin: var(--space-3) 0 calc(var(--space-5) + 1.5rem);
}

.overview-view :deep(.sprite-wrapper) {
  filter: var(--drop-shadow-icon);
  margin-top: 1rem;
}

.overview-view :deep(.preview-type-list) {
  bottom: -2.5rem;
}

.overview-search-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.overview-search {
  flex: 1;
}

.preview-location-trigger,
.preview-location-input {
  position: absolute;
  right: var(--space-3);
  bottom: -2.5rem;
  border: none;
  background: transparent;
  padding: 0;
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
  color: var(--color-text-primary);
  z-index: 1;
}

.preview-location-trigger {
  cursor: pointer;
}

.preview-location-input {
  cursor: text;
  text-align: right;
}

.preview-location-input:focus {
  outline: none;
  opacity: 1;
}

.preview-location-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.7;
  font-weight: 600;
}


.details-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.details-section-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
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
    min-height: 200px;
    max-height: 320px;
    padding-bottom: var(--space-2);
  }

  .wizard-header {
    margin-bottom: var(--space-2);
  }

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

  .berry-type-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-1);
  }

  .berry-type-option {
    padding: var(--space-1);
  }
}

@media (orientation: portrait) {
  .wizard-container {
    min-height: 300px;
    max-height: 520px;
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

  .preview-partner-nickname {
    font-size: 0.85rem;
  }

  .preview-location-trigger,
  .preview-location-input {
    font-size: 1rem;
  }
}
</style>

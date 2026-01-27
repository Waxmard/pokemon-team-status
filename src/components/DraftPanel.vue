<template>
  <div class="draft-panel">
      <div class="form-header">
        <div class="form-header-fields">
          <div v-if="!hideSearch" class="form-group">
            <label class="form-label">Pokemon Name</label>
            <n-auto-complete
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
              v-model:value="localAbility"
              :options="abilityOptions"
              placeholder="Select ability..."
              filterable
              clearable
              @update:value="updateAbility"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Berry (Optional)</label>
            <div class="berry-select-row">
              <n-select
                v-model:value="localBerry"
                :options="berryOptions"
                placeholder="Select berry..."
                filterable
                clearable
                @update:value="updateBerry"
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NAutoComplete, NSelect } from 'naive-ui'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES } from '../data/types.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { BERRY_NAMES } from '../data/berries.js'
import { getSpriteUrl, getBerrySprite } from '../utils/pokemon.js'

const props = defineProps({
  draftAction: {
    type: Object,
    required: true
  },
  hideSearch: {
    type: Boolean,
    default: false
  },
  team: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:pokemon', 'update:ability', 'update:berry', 'update:move', 'update:replaceTarget'])

const searchQuery = ref('')
const localAbility = ref(null)
const localBerry = ref(null)
const moveQueries = ref(['', '', '', ''])
const localReplaceTarget = ref(null)

// Initialize form state when draftAction changes
watch(() => props.draftAction, (action) => {
  searchQuery.value = action.pokemon?.name || ''
  localAbility.value = action.ability
  localBerry.value = action.berry
  moveQueries.value = (action.moves || []).map(m => m || '')
  localReplaceTarget.value = action.replaceTarget || null
}, { immediate: true })

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
  return !!props.draftAction.pokemon
})

const selectedSpriteUrl = computed(() => {
  if (!props.draftAction.pokemon) return null
  return getSpriteUrl(props.draftAction.pokemon.name)
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
    emit('update:pokemon', pokemon)
    searchQuery.value = pokemon.name
  }
}

function onSearchInput(value) {
  // Only reset if the input doesn't match a valid Pokemon name
  // This prevents resetting after selection when searchQuery is set programmatically
  const matchesPokemon = POKEMON_DATA.some(p => p.name === value)
  if (!matchesPokemon) {
    emit('update:pokemon', null)
  }
}

function updateAbility(value) {
  emit('update:ability', value)
}

function updateBerry(value) {
  emit('update:berry', value)
}

function onSelectMove(index, value) {
  moveQueries.value[index] = value
  emit('update:move', { index, value })
}

function onMoveInput(index, value) {
  if (!value) {
    emit('update:move', { index, value: null })
  }
}

function updateReplaceTarget(value) {
  emit('update:replaceTarget', value)
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
</style>

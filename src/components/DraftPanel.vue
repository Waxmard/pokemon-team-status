<template>
  <div class="draft-panel">
    <!-- Swap Preview UI -->
    <template v-if="isSwapPreview">
      <div class="swap-preview">
        <div class="swap-pokemon">
          <img
            :src="boxPokemonSpriteUrl"
            :alt="draftAction.boxPokemon.name"
            class="pokemon-sprite"
          />
          <div class="pokemon-name">{{ draftAction.boxPokemon.name }}</div>
          <div class="swap-label">From Box</div>
        </div>

        <div class="swap-arrow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
            <path d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </div>

        <div class="swap-pokemon">
          <template v-if="targetPokemon">
            <img
              :src="targetPokemonSpriteUrl"
              :alt="targetPokemon.name"
              class="pokemon-sprite"
            />
            <div class="pokemon-name">{{ targetPokemon.name }}</div>
            <div class="swap-label">To Box</div>
          </template>
          <template v-else>
            <div class="empty-slot-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div class="pokemon-name">Empty Slot</div>
            <div class="swap-label">Add to Team</div>
          </template>
        </div>
      </div>

      <div class="draft-actions">
        <button class="btn btn-success" @click="$emit('confirm')">
          Confirm Swap
        </button>
        <button class="btn btn-secondary" @click="$emit('cancel')">
          Cancel
        </button>
      </div>
    </template>

    <!-- Standard Add/Edit Form -->
    <template v-else-if="!isSwapMode">
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

      <div v-if="draftAction.pokemon" class="selected-pokemon-preview">
        <img
          v-if="selectedSpriteUrl"
          :src="selectedSpriteUrl"
          :alt="draftAction.pokemon.name"
          class="pokemon-sprite"
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NAutoComplete, NSelect } from 'naive-ui'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES } from '../data/types.js'
import { ABILITY_NAMES } from '../data/abilities.js'
import { getSpriteUrl } from '../utils/pokemon.js'

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

const emit = defineEmits(['confirm', 'cancel', 'update:pokemon', 'update:ability', 'update:move'])

const searchQuery = ref('')
const localAbility = ref(null)
const moveQueries = ref(['', '', '', ''])

// Check if this is a swap action
const isSwapMode = computed(() => props.draftAction?.type === 'swap')
const isSwapPreview = computed(() => isSwapMode.value && props.draftAction?.targetSlotId)

// Swap-related computed properties
const boxPokemonSpriteUrl = computed(() => {
  if (!isSwapMode.value || !props.draftAction?.boxPokemon) return null
  return getSpriteUrl(props.draftAction.boxPokemon.name)
})

const targetPokemon = computed(() => {
  if (!isSwapPreview.value) return null
  const targetId = props.draftAction.targetSlotId
  if (targetId.startsWith('empty-')) return null
  return props.team.find(p => p.id === targetId)
})

const targetPokemonSpriteUrl = computed(() => {
  if (!targetPokemon.value) return null
  return getSpriteUrl(targetPokemon.value.name)
})

// Initialize form state when draftAction changes (for edit mode)
watch(() => props.draftAction, (action) => {
  if (action.type !== 'swap') {
    searchQuery.value = action.pokemon?.name || ''
    localAbility.value = action.ability
    moveQueries.value = (action.moves || []).map(m => m || '')
  }
}, { immediate: true })

const canConfirm = computed(() => {
  return !!props.draftAction.pokemon
})

const selectedSpriteUrl = computed(() => {
  if (!props.draftAction.pokemon) return null
  return getSpriteUrl(props.draftAction.pokemon.name)
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

function getMoveAutocompleteOptions(index) {
  const query = moveQueries.value[index]
  if (!query) return ALL_TYPES.map(type => ({ label: type, value: type }))
  const lowerQuery = query.toLowerCase()
  return ALL_TYPES
    .filter(type => type.toLowerCase().includes(lowerQuery))
    .map(type => ({ label: type, value: type }))
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

function onSelectMove(index, value) {
  moveQueries.value[index] = value
  emit('update:move', { index, value })
}

function onMoveInput(index, value) {
  if (!value) {
    emit('update:move', { index, value: null })
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

.selected-pokemon-preview {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.pokemon-sprite {
  width: 96px;
  height: 96px;
  object-fit: contain;
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

/* Swap Preview Styles */
.swap-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}

.swap-pokemon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-width: 100px;
}

.swap-pokemon .pokemon-name {
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.swap-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.swap-arrow {
  color: var(--color-warning);
  flex-shrink: 0;
}

.empty-slot-icon {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
</style>

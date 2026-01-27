<template>
  <div class="draft-panel">
    <div class="panel-header">
      <h3 class="panel-title">{{ draftAction.type === 'add' ? 'Add Pokemon' : 'Replace Pokemon' }}</h3>
    </div>

    <div class="form-group">
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

    <div v-if="draftAction.pokemon" class="form-group">
      <label class="form-label">Types</label>
      <div class="type-badges">
        <span
          v-for="type in draftAction.pokemon.types"
          :key="type"
          class="type-badge"
          :style="{ background: getTypeGradient(type), color: getTextColor(type) }"
        >
          {{ type }}
        </span>
      </div>
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

    <!-- Preview Section -->
    <div v-if="draftAction.pokemon && scoreChanges.length" class="preview-section">
      <h4 class="preview-title">Score Changes Preview</h4>
      <div class="preview-list">
        <div
          v-for="change in scoreChanges"
          :key="change.type"
          class="preview-change"
          :class="{ positive: change.diff > 0, negative: change.diff < 0, neutral: change.diff === 0 }"
        >
          <span class="change-gym">{{ change.type }}</span>
          <span class="change-values">
            <span class="old-score">{{ change.oldScore }}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" class="arrow-icon">
              <path d="M4 6h4.5L6.5 4l.7-.7L10 6l-2.8 2.7-.7-.7 2-2H4V6z"/>
            </svg>
            <span class="new-score">{{ change.newScore }}</span>
            <span class="diff-badge" :class="{ positive: change.diff > 0, negative: change.diff < 0 }">
              {{ change.diff > 0 ? '+' : '' }}{{ change.diff }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <div class="draft-actions">
      <button
        class="btn btn-success"
        @click="$emit('confirm')"
        :disabled="!draftAction.pokemon"
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
import { ref, computed } from 'vue'
import { NAutoComplete, NSelect } from 'naive-ui'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES } from '../data/types.js'
import { ABILITY_NAMES } from '../data/abilities.js'

const props = defineProps({
  draftAction: {
    type: Object,
    required: true
  },
  scoreChanges: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:pokemon', 'update:ability', 'update:move'])

const searchQuery = ref('')
const localAbility = ref(props.draftAction.ability)
const moveQueries = ref(['', '', '', ''])

// Type colors for tags
const typeColors = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC'
}

const lightTextTypes = ['electric', 'ice', 'ground', 'steel', 'fairy']

function getTextColor(type) {
  return lightTextTypes.includes(type) ? '#1a1a2e' : '#fff'
}

function getTypeGradient(type) {
  const color = typeColors[type]
  return `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

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

function onSearchInput() {
  emit('update:pokemon', null)
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
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-glow-primary);
  animation: scaleIn var(--transition-slow) ease forwards;
}

.panel-header {
  margin-bottom: var(--space-4);
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
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

.type-badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.type-badge {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  box-shadow: var(--shadow-sm);
}

.moves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.preview-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-4);
}

.preview-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preview-change {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  background: var(--color-card);
}

.change-gym {
  text-transform: capitalize;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.change-values {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.old-score {
  color: var(--color-text-muted);
}

.arrow-icon {
  color: var(--color-text-muted);
}

.new-score {
  color: var(--color-text-primary);
  font-weight: 600;
}

.diff-badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  animation: pulse 1.5s ease-in-out infinite;
}

.diff-badge.positive {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
}

.diff-badge.negative {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
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

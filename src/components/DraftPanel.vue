<template>
  <n-card class="draft-panel" :title="draftAction.type === 'add' ? 'Add Pokemon' : 'Replace Pokemon'">
    <div class="form-group">
      <label>Pokemon Name</label>
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
      <label>Types</label>
      <div class="type-badges">
        <n-tag
          v-for="type in draftAction.pokemon.types"
          :key="type"
          :color="{ color: typeColors[type], textColor: getTextColor(type) }"
          size="small"
        >
          {{ type }}
        </n-tag>
      </div>
    </div>

    <div class="form-group">
      <label>Ability (Optional)</label>
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
      <label>Move Types (Optional)</label>
      <div class="moves-grid">
        <n-select
          v-for="i in 4"
          :key="i"
          :value="draftAction.moves[i-1]"
          :options="typeOptions"
          placeholder="None"
          clearable
          @update:value="(val) => updateMove(i-1, val)"
        />
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="draftAction.pokemon && scoreChanges.length" class="preview-section">
      <h4>Score Changes Preview</h4>
      <div
        v-for="change in scoreChanges"
        :key="change.type"
        class="preview-change"
        :class="{ positive: change.diff > 0, negative: change.diff < 0, neutral: change.diff === 0 }"
      >
        <span class="gym-name">{{ change.type }}</span>
        <span>{{ change.oldScore }} → {{ change.newScore }} ({{ change.diff > 0 ? '+' : '' }}{{ change.diff }})</span>
      </div>
    </div>

    <template #footer>
      <div class="draft-actions">
        <n-button
          type="success"
          @click="$emit('confirm')"
          :disabled="!draftAction.pokemon"
        >
          Confirm
        </n-button>
        <n-button secondary @click="$emit('cancel')">Cancel</n-button>
      </div>
    </template>
  </n-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NCard, NAutoComplete, NSelect, NButton, NTag } from 'naive-ui'
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
  return lightTextTypes.includes(type) ? '#333' : '#fff'
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

const typeOptions = computed(() => {
  return ALL_TYPES.map(type => ({ label: type, value: type }))
})

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

function updateMove(index, value) {
  emit('update:move', { index, value: value || null })
}
</script>

<style scoped>
.draft-panel {
  margin-top: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: #aaa;
}

.type-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.moves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preview-section {
  background: var(--card-color, #0f3460);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.preview-section h4 {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.preview-change {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.85rem;
}

.preview-change.positive {
  color: #2ecc71;
}

.preview-change.negative {
  color: #e74c3c;
}

.preview-change.neutral {
  color: #aaa;
}

.gym-name {
  text-transform: capitalize;
}

.draft-actions {
  display: flex;
  gap: 12px;
}
</style>

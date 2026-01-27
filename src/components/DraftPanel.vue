<template>
  <div class="draft-panel">
    <h3>{{ draftAction.type === 'add' ? 'Add Pokemon' : 'Replace Pokemon' }}</h3>

    <div class="form-group">
      <label>Pokemon Name</label>
      <div class="pokemon-search-container">
        <input
          type="text"
          v-model="searchQuery"
          @input="onSearchInput"
          @focus="showSearchResults = true"
          placeholder="Search Pokemon..."
        >
        <div v-if="showSearchResults && filteredPokemon.length" class="pokemon-search-results">
          <div
            v-for="pokemon in filteredPokemon.slice(0, 20)"
            :key="pokemon.name"
            @click="selectPokemon(pokemon)"
          >
            {{ pokemon.name }}
            <span v-for="type in pokemon.types" :key="type" class="type-badge" :class="'type-' + type">{{ type }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="draftAction.pokemon" class="form-group">
      <label>Types</label>
      <div>
        <span
          v-for="type in draftAction.pokemon.types"
          :key="type"
          class="type-badge"
          :class="'type-' + type"
        >{{ type }}</span>
      </div>
    </div>

    <div class="form-group">
      <label>Ability (Optional)</label>
      <select v-model="localAbility" @change="updateAbility">
        <option :value="null">None</option>
        <option v-for="ability in abilityNames" :key="ability" :value="ability">
          {{ ability }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label>Move Types (Optional)</label>
      <div class="moves-grid">
        <select
          v-for="i in 4"
          :key="i"
          :value="draftAction.moves[i-1]"
          @change="updateMove(i-1, $event.target.value)"
        >
          <option :value="null">None</option>
          <option v-for="type in allTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
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

    <div class="draft-actions">
      <button
        class="btn btn-success"
        @click="$emit('confirm')"
        :disabled="!draftAction.pokemon"
      >
        Confirm
      </button>
      <button class="btn btn-secondary" @click="$emit('cancel')">Cancel</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const showSearchResults = ref(false)
const localAbility = ref(props.draftAction.ability)

const allTypes = ALL_TYPES
const abilityNames = ABILITY_NAMES

const filteredPokemon = computed(() => {
  if (!searchQuery.value) return POKEMON_DATA
  const query = searchQuery.value.toLowerCase()
  return POKEMON_DATA.filter(p =>
    p.name.toLowerCase().includes(query)
  )
})

function selectPokemon(pokemon) {
  emit('update:pokemon', pokemon)
  showSearchResults.value = false
  searchQuery.value = pokemon.name
}

function onSearchInput() {
  showSearchResults.value = true
  emit('update:pokemon', null)
}

function updateAbility() {
  emit('update:ability', localAbility.value)
}

function updateMove(index, value) {
  emit('update:move', { index, value: value || null })
}

// Close search results when clicking outside
function handleClickOutside(e) {
  if (!e.target.closest('.pokemon-search-container')) {
    showSearchResults.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

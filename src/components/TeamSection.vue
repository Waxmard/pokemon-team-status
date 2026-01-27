<template>
  <div class="team-section">
    <div class="team-grid">
      <TeamSlot
        v-for="(pokemon, index) in paddedTeam"
        :key="index"
        :pokemon="pokemon"
        @remove="$emit('removePokemon', $event)"
        @edit="$emit('editPokemon', $event)"
      />
    </div>

    <div class="action-buttons">
      <n-auto-complete
        v-model:value="searchQuery"
        :options="autocompleteOptions"
        placeholder="Add Pokemon..."
        :disabled="draftActive"
        :get-show="() => true"
        @select="onSelectPokemon"
        clearable
        class="pokemon-search"
      />
    </div>

    <Transition name="scale">
      <DraftPanel
        v-if="draftAction"
        :draftAction="draftAction"
        :team="team"
        :hideSearch="draftAction.type === 'add'"
        @confirm="$emit('confirmDraft')"
        @cancel="$emit('cancelDraft')"
        @update:pokemon="$emit('updateDraftPokemon', $event)"
        @update:ability="$emit('updateDraftAbility', $event)"
        @update:move="$emit('updateDraftMove', $event)"
        @update:replaceId="$emit('updateDraftReplaceId', $event)"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NAutoComplete } from 'naive-ui'
import TeamSlot from './TeamSlot.vue'
import DraftPanel from './DraftPanel.vue'
import { POKEMON_DATA } from '../data/pokemon.js'

const props = defineProps({
  team: {
    type: Array,
    required: true
  },
  draftAction: {
    type: Object,
    default: null
  },
  draftActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'addPokemon',
  'removePokemon',
  'editPokemon',
  'confirmDraft',
  'cancelDraft',
  'updateDraftPokemon',
  'updateDraftAbility',
  'updateDraftMove',
  'updateDraftReplaceId'
])

const searchQuery = ref('')

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

function onSelectPokemon(value) {
  const pokemon = POKEMON_DATA.find(p => p.name === value)
  if (pokemon) {
    emit('addPokemon', pokemon)
    searchQuery.value = ''
  }
}

// Clear search when draft is cancelled
watch(() => props.draftAction, (action) => {
  if (!action) {
    searchQuery.value = ''
  }
})

// Pad team to always show 6 slots
const paddedTeam = computed(() => {
  const slots = [...props.team]
  while (slots.length < 6) {
    slots.push(null)
  }
  return slots
})
</script>

<style scoped>
.team-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-lg);
}

.team-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .team-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.pokemon-search {
  width: 100%;
  max-width: 300px;
}
</style>

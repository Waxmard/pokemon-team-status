<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <h1 class="app-title">
        <span class="title-accent">Weakness Calculator</span>
      </h1>

      <TeamSection
        :team="team"
        :box="box"
        :draftAction="draftAction"
        :draftActive="!!draftAction"
        @addPokemon="startAddPokemon"
        @removePokemon="removePokemon"
        @editPokemon="startEditPokemon"
        @confirmDraft="confirmDraft"
        @cancelDraft="cancelDraft"
        @updateDraftPokemon="updateDraftPokemon"
        @updateDraftAbility="updateDraftAbility"
        @updateDraftMove="updateDraftMove"
        @reorderTeam="reorderTeam"
        @addToBox="startAddToBox"
        @removeFromBox="removeFromBox"
        @startSwap="startSwap"
        @selectSwapTarget="selectSwapTarget"
      />

      <GymColumns
        :remainingGyms="remainingGyms"
        :defeatedGymsList="defeatedGymsList"
        :draftActive="!!draftAction"
        @defeatGym="defeatGym"
        @undefeatGym="undefeatGym"
      />
    </div>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { NConfigProvider } from 'naive-ui'
import TeamSection from './components/TeamSection.vue'
import GymColumns from './components/GymColumns.vue'
import { ALL_TYPES } from './data/types.js'
import { POKEMON_DATA } from './data/pokemon.js'
import { calculateScore } from './utils/typeCalc.js'
import { useStorage } from './composables/useStorage.js'
import { themeOverrides } from './theme/colors.js'

const {
  team,
  defeatedGyms,
  box,
  loadData,
  persistTeam,
  persistDefeatedGyms,
  persistBox
} = useStorage()

const draftAction = ref(null)

// Computed
const remainingGyms = computed(() => {
  return ALL_TYPES
    .filter(type => !defeatedGyms.value.includes(type))
    .map(type => {
      const score = calculateScore(type, team.value)
      let diff = 0
      if (draftAction.value?.pokemon) {
        const draftTeam = getDraftTeam()
        const newScore = calculateScore(type, draftTeam)
        diff = newScore - score
      }
      return { type, score, diff }
    })
    .sort((a, b) => a.score - b.score)
})

const defeatedGymsList = computed(() => {
  return defeatedGyms.value
    .map(type => ({
      type,
      score: calculateScore(type, team.value)
    }))
    .sort((a, b) => a.score - b.score)
})

// Helper to get draft team
function getDraftTeam() {
  if (!draftAction.value?.pokemon) {
    // Handle swap preview
    if (draftAction.value?.type === 'swap' && draftAction.value.targetSlotId) {
      const { boxPokemon, targetSlotId } = draftAction.value
      const swapMember = {
        id: 'draft',
        name: boxPokemon.name,
        types: boxPokemon.types,
        ability: boxPokemon.ability,
        moves: boxPokemon.moves
      }

      if (targetSlotId.startsWith('empty-')) {
        // Adding to empty slot
        return [...team.value, swapMember]
      } else {
        // Swapping with existing Pokemon
        return team.value.map(p =>
          p.id === targetSlotId ? swapMember : p
        )
      }
    }
    return team.value
  }

  const draftMember = {
    id: 'draft',
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    moves: draftAction.value.moves.filter(m => m)
  }

  if (draftAction.value.type === 'add' || draftAction.value.type === 'addToBox') {
    return [...team.value, draftMember]
  }
  if (draftAction.value.type === 'edit') {
    return team.value.map(p =>
      p.id === draftAction.value.editId ? draftMember : p
    )
  }
  return team.value
}

// Methods
function startAddPokemon(pokemon = null) {
  draftAction.value = {
    type: 'add',
    pokemon: pokemon,
    ability: null,
    moves: [null, null, null, null]
  }
}

function startEditPokemon(id) {
  const pokemon = team.value.find(p => p.id === id)
  if (!pokemon) return
  const pokemonData = POKEMON_DATA.find(p => p.name === pokemon.name)
  draftAction.value = {
    type: 'edit',
    editId: id,
    pokemon: pokemonData,
    ability: pokemon.ability,
    moves: [...pokemon.moves, null, null, null, null].slice(0, 4)
  }
}

function updateDraftPokemon(pokemon) {
  if (draftAction.value) {
    draftAction.value.pokemon = pokemon
  }
}

function updateDraftAbility(ability) {
  if (draftAction.value) {
    draftAction.value.ability = ability
  }
}

function updateDraftMove({ index, value }) {
  if (draftAction.value) {
    draftAction.value.moves[index] = value
  }
}

function confirmDraft() {
  // Handle swap confirmation
  if (draftAction.value?.type === 'swap' && draftAction.value.targetSlotId) {
    const { boxPokemon, targetSlotId } = draftAction.value

    const newMember = {
      id: Date.now().toString(),
      name: boxPokemon.name,
      types: boxPokemon.types,
      ability: boxPokemon.ability,
      moves: boxPokemon.moves
    }

    if (targetSlotId.startsWith('empty-')) {
      // Adding to empty slot - add to team, remove from box
      if (team.value.length < 6) {
        persistTeam([...team.value, newMember])
        persistBox(box.value.filter(p => p.id !== boxPokemon.id))
      }
    } else {
      // Swapping with existing Pokemon
      const teamPokemon = team.value.find(p => p.id === targetSlotId)
      if (teamPokemon) {
        // Add team Pokemon to box
        const boxMember = {
          id: Date.now().toString() + '-box',
          name: teamPokemon.name,
          types: teamPokemon.types,
          ability: teamPokemon.ability,
          moves: teamPokemon.moves
        }
        // Replace team Pokemon with box Pokemon
        persistTeam(team.value.map(p =>
          p.id === targetSlotId ? newMember : p
        ))
        // Update box: remove swapped Pokemon, add team Pokemon
        persistBox([
          ...box.value.filter(p => p.id !== boxPokemon.id),
          boxMember
        ])
      }
    }

    cancelDraft()
    return
  }

  if (!draftAction.value?.pokemon) return

  const newMember = {
    id: Date.now().toString(),
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    moves: draftAction.value.moves.filter(m => m)
  }

  if (draftAction.value.type === 'add') {
    if (team.value.length < 6) {
      persistTeam([...team.value, newMember])
    }
  } else if (draftAction.value.type === 'addToBox') {
    if (box.value.length < 3) {
      persistBox([...box.value, newMember])
    }
  } else if (draftAction.value.type === 'edit') {
    persistTeam(team.value.map(p =>
      p.id === draftAction.value.editId
        ? { ...newMember, id: draftAction.value.editId }
        : p
    ))
  }

  cancelDraft()
}

function cancelDraft() {
  draftAction.value = null
}

function removePokemon(id) {
  persistTeam(team.value.filter(m => m.id !== id))
}

function reorderTeam(newOrder) {
  persistTeam(newOrder)
}

// Box functions
function startAddToBox() {
  draftAction.value = {
    type: 'addToBox',
    pokemon: null,
    ability: null,
    moves: [null, null, null, null]
  }
}

function removeFromBox(id) {
  persistBox(box.value.filter(p => p.id !== id))
}

function startSwap(boxPokemonId) {
  const pokemon = box.value.find(p => p.id === boxPokemonId)
  if (!pokemon) return

  draftAction.value = {
    type: 'swap',
    boxPokemon: { ...pokemon },
    targetSlotId: null
  }
}

function selectSwapTarget(slotId) {
  if (draftAction.value?.type === 'swap') {
    draftAction.value.targetSlotId = slotId
  }
}

function defeatGym(type) {
  if (!defeatedGyms.value.includes(type)) {
    persistDefeatedGyms([...defeatedGyms.value, type])
  }
}

function undefeatGym(type) {
  persistDefeatedGyms(defeatedGyms.value.filter(t => t !== type))
}

// Load data on mount
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.app-container {
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn var(--transition-slow) ease forwards;
}

.app-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: var(--space-6);
}

.title-accent {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>

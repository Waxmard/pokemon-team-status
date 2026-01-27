<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-layout class="app-layout">
      <h1>Pokemon Team Weakness Calculator</h1>

      <TeamSection
        :team="team"
        :draftAction="draftAction"
        :draftActive="!!draftAction"
        :scoreChanges="draftScoreChanges"
        @addPokemon="startAddPokemon"
        @removePokemon="removePokemon"
        @confirmDraft="confirmDraft"
        @cancelDraft="cancelDraft"
        @updateDraftPokemon="updateDraftPokemon"
        @updateDraftAbility="updateDraftAbility"
        @updateDraftMove="updateDraftMove"
      />

      <GymColumns
        :remainingGyms="remainingGyms"
        :defeatedGymsList="defeatedGymsList"
        @defeatGym="defeatGym"
        @undefeatGym="undefeatGym"
      />
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { darkTheme, NConfigProvider, NLayout } from 'naive-ui'
import TeamSection from './components/TeamSection.vue'
import GymColumns from './components/GymColumns.vue'
import { ALL_TYPES } from './data/types.js'
import { calculateScore } from './utils/typeCalc.js'
import { useStorage } from './composables/useStorage.js'
import { themeOverrides } from './theme/colors.js'

const {
  team,
  defeatedGyms,
  loadData,
  persistTeam,
  persistDefeatedGyms
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

const draftScoreChanges = computed(() => {
  if (!draftAction.value?.pokemon) return []

  const draftTeam = getDraftTeam()

  return ALL_TYPES.map(type => {
    const oldScore = calculateScore(type, team.value)
    const newScore = calculateScore(type, draftTeam)
    return {
      type,
      oldScore,
      newScore,
      diff: newScore - oldScore
    }
  }).filter(c => c.diff !== 0)
})

// Helper to get draft team
function getDraftTeam() {
  if (!draftAction.value?.pokemon) return team.value

  const draftMember = {
    id: 'draft',
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    moves: draftAction.value.moves.filter(m => m)
  }

  if (draftAction.value.type === 'add') {
    return [...team.value, draftMember]
  }
  return team.value
}

// Methods
function startAddPokemon() {
  draftAction.value = {
    type: 'add',
    pokemon: null,
    ability: null,
    moves: [null, null, null, null]
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
  if (!draftAction.value?.pokemon) return

  const newMember = {
    id: Date.now().toString(),
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    moves: draftAction.value.moves.filter(m => m)
  }

  if (draftAction.value.type === 'add' && team.value.length < 6) {
    persistTeam([...team.value, newMember])
  }

  cancelDraft()
}

function cancelDraft() {
  draftAction.value = null
}

function removePokemon(id) {
  persistTeam(team.value.filter(m => m.id !== id))
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
.app-layout {
  background: transparent;
  min-height: 100vh;
}
</style>

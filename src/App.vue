<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <h1 class="app-title">
        <span class="title-accent">Weakness Calculator</span>
      </h1>

      <TeamSection
        :team="team"
        :box="box"
        @confirmDraft="confirmDraft"
        @reorderTeam="reorderTeam"
      />

      <GymColumns
        :remainingGyms="remainingGyms"
        :defeatedGymsList="defeatedGymsList"
        :draftActive="isActive"
        @defeatGym="defeatGym"
        @undefeatGym="undefeatGym"
      />
    </div>
  </n-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { NConfigProvider } from 'naive-ui'
import TeamSection from './components/TeamSection.vue'
import GymColumns from './components/GymColumns.vue'
import { ALL_TYPES } from './data/types.js'
import { calculateScore, calculateBerryTiebreaker } from './utils/typeCalc.js'
import { useStorage } from './composables/useStorage.js'
import { useDraftAction } from './composables/useDraftAction.js'
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

const { draftAction, isActive, cancel } = useDraftAction()

// Computed
const remainingGyms = computed(() => {
  return ALL_TYPES
    .filter(type => !defeatedGyms.value.includes(type))
    .map(type => {
      const score = calculateScore(type, team.value)
      const berryCount = calculateBerryTiebreaker(type, team.value)
      let diff = 0
      if (draftAction.value?.pokemon) {
        const draftTeam = getDraftTeam()
        const newScore = calculateScore(type, draftTeam)
        diff = newScore - score
      }
      return { type, score, berryCount, diff }
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return a.berryCount - b.berryCount
    })
})

const defeatedGymsList = computed(() => {
  return defeatedGyms.value
    .map(type => ({
      type,
      score: calculateScore(type, team.value),
      berryCount: calculateBerryTiebreaker(type, team.value)
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return a.berryCount - b.berryCount
    })
})

// Helper to get draft team
function getDraftTeam() {
  if (!draftAction.value?.pokemon) {
    return team.value
  }

  const draftMember = {
    id: 'draft',
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    berry: draftAction.value.berry,
    moves: draftAction.value.moves.filter(m => m)
  }

  if (draftAction.value.type === 'add' || draftAction.value.type === 'addToBox') {
    return [...team.value, draftMember]
  }
  if (draftAction.value.type === 'edit') {
    // For box Pokemon edits with a replace target, show the draft in place of the target
    if (draftAction.value.isBoxPokemon && draftAction.value.replaceTarget) {
      if (draftAction.value.replaceTarget.startsWith('empty-')) {
        return [...team.value, draftMember]
      }
      return team.value.map(p =>
        p.id === draftAction.value.replaceTarget ? draftMember : p
      )
    }
    // For regular team edits
    if (!draftAction.value.isBoxPokemon) {
      return team.value.map(p =>
        p.id === draftAction.value.editId ? draftMember : p
      )
    }
  }
  return team.value
}

// Methods
function confirmDraft() {
  if (!draftAction.value) return

  // Handle deletion (wizard mode: confirmed with no pokemon)
  if (!draftAction.value.pokemon) {
    if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
      // Delete team Pokemon
      persistTeam(team.value.filter(p => p.id !== draftAction.value.editId))
    } else if (draftAction.value.type === 'edit' && draftAction.value.isBoxPokemon) {
      // Delete box Pokemon
      persistBox(box.value.filter(p => p.id !== draftAction.value.boxPokemonId))
    }
    // For 'add' type with no pokemon, just cancel
    cancel()
    return
  }

  const newMember = {
    id: Date.now().toString(),
    name: draftAction.value.pokemon.name,
    types: draftAction.value.pokemon.types,
    ability: draftAction.value.ability,
    berry: draftAction.value.berry,
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
    if (draftAction.value.isBoxPokemon) {
      // Editing a box Pokemon
      const boxIndex = box.value.findIndex(p => p.id === draftAction.value.boxPokemonId)
      const updatedPokemon = {
        id: draftAction.value.boxPokemonId,
        name: draftAction.value.pokemon.name,
        types: draftAction.value.pokemon.types,
        ability: draftAction.value.ability,
        berry: draftAction.value.berry,
        moves: draftAction.value.moves.filter(m => m)
      }

      if (draftAction.value.replaceTarget) {
        // Move to team
        if (draftAction.value.replaceTarget.startsWith('empty-')) {
          // Add to team
          if (team.value.length < 6) {
            persistTeam([...team.value, { ...updatedPokemon, id: Date.now().toString() }])
            persistBox(box.value.filter(p => p.id !== draftAction.value.boxPokemonId))
          }
        } else {
          // Replace existing team member
          const targetIndex = team.value.findIndex(p => p.id === draftAction.value.replaceTarget)
          if (targetIndex !== -1) {
            const replacedPokemon = team.value[targetIndex]
            // Move replaced Pokemon to box
            const boxMember = {
              id: Date.now().toString() + '-box',
              name: replacedPokemon.name,
              types: replacedPokemon.types,
              ability: replacedPokemon.ability,
              berry: replacedPokemon.berry,
              moves: replacedPokemon.moves
            }
            // Replace team Pokemon with box Pokemon
            persistTeam(team.value.map(p =>
              p.id === draftAction.value.replaceTarget
                ? { ...updatedPokemon, id: Date.now().toString() }
                : p
            ))
            // Update box: remove edited Pokemon, add replaced team Pokemon
            persistBox([
              ...box.value.filter(p => p.id !== draftAction.value.boxPokemonId),
              boxMember
            ])
          }
        }
      } else {
        // Just update in box (no move to team)
        const newBox = [...box.value]
        newBox[boxIndex] = updatedPokemon
        persistBox(newBox)
      }
    } else {
      // Editing a team Pokemon
      persistTeam(team.value.map(p =>
        p.id === draftAction.value.editId
          ? { ...newMember, id: draftAction.value.editId }
          : p
      ))
    }
  }

  cancel()
}

function reorderTeam(newOrder) {
  persistTeam(newOrder)
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

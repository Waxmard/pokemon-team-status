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
        @immediateSwap="handleImmediateSwap"
        @deleteTeamPokemon="deleteTeamPokemon"
        @deleteBoxPokemon="deleteBoxPokemon"
        @cancelSwap="handleCancelSwap"
        @deletePokemon="handleDeleteFromDraft"
      />

      <GymColumns
        :remainingGyms="remainingGyms"
        :defeatedGymsList="defeatedGymsList"
        :draftActive="hasDraft"
        @defeatGym="defeatGym"
        @undefeatGym="undefeatGym"
      />
    </div>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import GymColumns from './components/GymColumns.vue'
import TeamSection from './components/TeamSection.vue'
import { useDraftAction } from './composables/useDraftAction.js'
import { useStorage } from './composables/useStorage.js'
import { POKEMON_DATA } from './data/pokemon.js'
import { ALL_TYPES } from './data/types.js'
import { themeOverrides } from './theme/colors.js'
import { buildPokemonMember, generatePokemonId } from './utils/pokemon.js'
import { calculateBerryTiebreaker, calculateScore } from './utils/typeCalc.js'

const {
  team,
  defeatedGyms,
  box,
  loadData,
  persistTeam,
  persistDefeatedGyms,
  persistBox,
} = useStorage()

const {
  draftAction,
  swapMode,
  enterSwapMode,
  exitSwapMode,
  updateInHandPokemon,
  cancel,
} = useDraftAction()

// Store original state when swap mode starts
const swapOriginalState = ref(null)

watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    // Only capture if not already captured (e.g., by confirmDraft for add-replace)
    if (!swapOriginalState.value) {
      swapOriginalState.value = {
        team: structuredClone(team.value),
        box: structuredClone(box.value),
      }
    }
  } else {
    swapOriginalState.value = null
  }
})

function handleCancelSwap() {
  if (swapOriginalState.value) {
    persistTeam(swapOriginalState.value.team)
    persistBox(swapOriginalState.value.box)
  }
  exitSwapMode()
}

// Helper to construct the hypothetical draft team
function getDraftTeam() {
  if (!draftAction.value?.pokemon) return team.value

  const draft = buildPokemonMember(draftAction.value)

  if (draftAction.value.type === 'add') {
    return [...team.value, draft]
  } else if (
    draftAction.value.type === 'edit' &&
    !draftAction.value.isBoxPokemon
  ) {
    // Editing a team Pokemon
    return team.value.map((p) =>
      p.id === draftAction.value.editId ? draft : p,
    )
  } else if (
    draftAction.value.isBoxPokemon &&
    draftAction.value.replaceTarget
  ) {
    // Box Pokemon swapping with team slot
    if (draftAction.value.replaceTarget.startsWith('empty-')) {
      // Adding to empty slot
      return [...team.value, draft]
    } else {
      // Replacing existing team member
      return team.value.map((p) =>
        p.id === draftAction.value.replaceTarget ? draft : p,
      )
    }
  }
  return team.value
}

// Computed
const hasDraft = computed(() => {
  return (
    draftAction.value?.pokemon &&
    (draftAction.value.type === 'add' ||
      (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) ||
      (draftAction.value.isBoxPokemon && draftAction.value.replaceTarget))
  )
})

// Cache all gym scores in a single computed to avoid duplicate calculations
const allGymScores = computed(() => {
  const effectiveTeam = hasDraft.value ? getDraftTeam() : team.value

  return ALL_TYPES.map((type) => ({
    type,
    score: calculateScore(type, effectiveTeam),
    berryCount: calculateBerryTiebreaker(type, effectiveTeam),
  }))
})

const remainingGyms = computed(() => {
  return allGymScores.value
    .filter((gym) => !defeatedGyms.value.includes(gym.type))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return a.berryCount - b.berryCount
    })
})

const defeatedGymsList = computed(() => {
  return allGymScores.value
    .filter((gym) => defeatedGyms.value.includes(gym.type))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return a.berryCount - b.berryCount
    })
})

// Handle immediate swap when clicking a slot in swap mode
function handleImmediateSwap(targetId) {
  if (!draftAction.value?.pokemon) return

  const inHandPokemon = buildPokemonMember(draftAction.value)

  if (draftAction.value.isBoxPokemon) {
    // Box → Team swap
    const boxPokemonId = draftAction.value.boxPokemonId

    if (targetId === null) {
      // Moving to empty team slot - remove from box, add to team
      if (team.value.length >= 6) return // Team full

      const newTeamMember = buildPokemonMember(draftAction.value, {
        source: 'team',
      })
      persistTeam([...team.value, newTeamMember])
      persistBox(box.value.filter((p) => p.id !== boxPokemonId))

      // Exit swap mode - no chain swap when moving to empty slot
      exitSwapMode()
      return
    }

    const targetPokemon = team.value.find((p) => p.id === targetId)
    if (!targetPokemon) return

    const replacedPokemonData = POKEMON_DATA.find(
      (p) => p.name === targetPokemon.name,
    )

    // Place in-hand pokemon in team slot
    const newTeam = team.value.map((p) =>
      p.id === targetId
        ? { ...inHandPokemon, id: generatePokemonId('team') }
        : p,
    )
    persistTeam(newTeam)

    // Remove old box pokemon, add replaced team pokemon to box
    const newBoxMember = buildPokemonMember(targetPokemon, { source: 'box' })
    persistBox([
      ...box.value.filter((p) => p.id !== boxPokemonId),
      newBoxMember,
    ])

    // Update "in hand" to be the replaced pokemon for chain swapping
    updateInHandPokemon(
      replacedPokemonData,
      targetPokemon.ability,
      targetPokemon.berry,
      targetPokemon.moves,
      targetPokemon.specialMove,
      targetPokemon.megaForm,
      targetPokemon.megaTypes,
      targetPokemon.megaSpriteId,
    )
    draftAction.value.boxPokemonId = newBoxMember.id
  } else if (draftAction.value.isTeamPokemon) {
    // Team → Box swap (new logic)
    const teamPokemonId = draftAction.value.editId

    if (targetId === null) {
      // Moving to empty box slot - remove from team, add to box
      const newBoxMember = buildPokemonMember(draftAction.value, {
        source: 'box',
      })
      persistBox([...box.value, newBoxMember])
      persistTeam(team.value.filter((p) => p.id !== teamPokemonId))

      // Exit swap mode - no chain swap possible when moving to empty slot
      exitSwapMode()
    } else {
      // Swap with existing box Pokemon
      const targetPokemon = box.value.find((p) => p.id === targetId)
      if (!targetPokemon) return

      const replacedPokemonData = POKEMON_DATA.find(
        (p) => p.name === targetPokemon.name,
      )

      // Place in-hand pokemon in box slot
      const newBox = box.value.map((p) =>
        p.id === targetId
          ? { ...inHandPokemon, id: generatePokemonId('box') }
          : p,
      )
      persistBox(newBox)

      // Replace team pokemon with box pokemon
      const newTeamMember = buildPokemonMember(targetPokemon, {
        source: 'team',
      })
      persistTeam(
        team.value.map((p) => (p.id === teamPokemonId ? newTeamMember : p)),
      )

      // Update "in hand" to be the replaced box pokemon for chain swapping
      updateInHandPokemon(
        replacedPokemonData,
        targetPokemon.ability,
        targetPokemon.berry,
        targetPokemon.moves,
        targetPokemon.specialMove,
        targetPokemon.megaForm,
        targetPokemon.megaTypes,
        targetPokemon.megaSpriteId,
      )
      draftAction.value.editId = newTeamMember.id
    }
  }
}

// Methods
function confirmDraft() {
  if (!draftAction.value) return

  // Handle deletion (wizard mode: confirmed with no pokemon)
  if (!draftAction.value.pokemon) {
    if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
      // Delete team Pokemon
      persistTeam(team.value.filter((p) => p.id !== draftAction.value.editId))
    } else if (
      draftAction.value.type === 'edit' &&
      draftAction.value.isBoxPokemon
    ) {
      // Delete box Pokemon
      persistBox(
        box.value.filter((p) => p.id !== draftAction.value.boxPokemonId),
      )
    }
    // For 'add' type with no pokemon, just cancel
    cancel()
    return
  }

  const newMember = buildPokemonMember(draftAction.value, { source: 'team' })

  if (draftAction.value.type === 'add') {
    if (team.value.length < 6) {
      // Normal add - team has room
      persistTeam([...team.value, newMember])
    } else {
      // Team is full - enter replace mode
      // Capture state BEFORE adding temp Pokemon (so cancel discards it)
      swapOriginalState.value = {
        team: structuredClone(team.value),
        box: structuredClone(box.value),
      }

      // 1. Add new Pokemon to box temporarily
      const tempBoxMember = buildPokemonMember(draftAction.value, {
        source: 'temp',
      })
      persistBox([...box.value, tempBoxMember])

      // 2. Set up draftAction for swap mode with this Pokemon "in hand"
      draftAction.value = {
        ...draftAction.value,
        type: 'edit',
        isBoxPokemon: true,
        isAddReplace: true, // Flag for cancel behavior
        boxPokemonId: tempBoxMember.id,
      }

      // 3. Enter swap mode
      enterSwapMode()
      return // Don't call cancel() - stay in swap mode
    }
  } else if (draftAction.value.type === 'addToBox') {
    persistBox([...box.value, newMember])
  } else if (draftAction.value.type === 'edit') {
    if (draftAction.value.isBoxPokemon) {
      // Editing a box Pokemon
      const boxIndex = box.value.findIndex(
        (p) => p.id === draftAction.value.boxPokemonId,
      )
      const updatedPokemon = buildPokemonMember(draftAction.value, {
        id: draftAction.value.boxPokemonId,
      })

      if (draftAction.value.replaceTarget) {
        // Move to team
        if (draftAction.value.replaceTarget.startsWith('empty-')) {
          // Add to team
          if (team.value.length < 6) {
            persistTeam([
              ...team.value,
              buildPokemonMember(draftAction.value, { source: 'team' }),
            ])
            persistBox(
              box.value.filter((p) => p.id !== draftAction.value.boxPokemonId),
            )
          }
        } else {
          // Replace existing team member
          const targetIndex = team.value.findIndex(
            (p) => p.id === draftAction.value.replaceTarget,
          )
          if (targetIndex !== -1) {
            const replacedPokemon = team.value[targetIndex]
            // Move replaced Pokemon to box
            const boxMember = buildPokemonMember(replacedPokemon, {
              source: 'box',
            })
            // Replace team Pokemon with box Pokemon
            persistTeam(
              team.value.map((p) =>
                p.id === draftAction.value.replaceTarget
                  ? buildPokemonMember(draftAction.value, { source: 'team' })
                  : p,
              ),
            )
            // Update box: remove edited Pokemon, add replaced team Pokemon
            persistBox([
              ...box.value.filter(
                (p) => p.id !== draftAction.value.boxPokemonId,
              ),
              boxMember,
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
      persistTeam(
        team.value.map((p) =>
          p.id === draftAction.value.editId
            ? buildPokemonMember(draftAction.value, {
                id: draftAction.value.editId,
              })
            : p,
        ),
      )
    }
  }

  cancel()
}

function deleteTeamPokemon(id) {
  persistTeam(team.value.filter((p) => p.id !== id))
}

function deleteBoxPokemon(id) {
  persistBox(box.value.filter((p) => p.id !== id))
}

function handleDeleteFromDraft() {
  if (!draftAction.value) return

  if (draftAction.value.isBoxPokemon) {
    deleteBoxPokemon(draftAction.value.boxPokemonId)
  } else if (draftAction.value.editId) {
    deleteTeamPokemon(draftAction.value.editId)
  }
  cancel()
}

function defeatGym(type) {
  persistDefeatedGyms([...defeatedGyms.value, type])
}

function undefeatGym(type) {
  persistDefeatedGyms(defeatedGyms.value.filter((t) => t !== type))
}

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

@media (orientation: landscape) and (max-height: 500px) {
  .app-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
    max-width: 100%;
  }

  .app-title {
    flex: 0 0 100%;
    margin-bottom: var(--space-2);
  }

  .app-container > :nth-child(2) {
    flex: 1;
    min-width: 0;
  }

  .app-container > :nth-child(3) {
    flex: 1;
    min-width: 0;
  }
}
</style>

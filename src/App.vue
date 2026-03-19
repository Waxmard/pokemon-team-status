<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <div v-if="loadError" class="load-error-banner" @click="retryLoad">
        Failed to load saved data. Tap to retry.
      </div>
      <button class="reset-btn" @click="showResetDialog = true" aria-label="Reset">✦</button>
      <h1 class="app-title">
        <span v-if="isSoloMode" class="title-accent">{{ appTitle }}</span>
        <span v-else class="title-player-row">
          <label class="title-player-field">
            <input
              ref="playerNameInput"
              :value="viewedSoulLinkPlayerName"
              class="title-player-input"
              type="text"
              maxlength="32"
              aria-label="Viewed Soul Link player name"
              @change="handleRenameViewedSoulLinkPlayerInput"
            />
          </label>
          <button
            class="title-rename-button"
            type="button"
            aria-label="Rename viewed player"
            @click="focusPlayerNameInput"
          >
            ✎
          </button>
        </span>
      </h1>

      <template v-if="isSoloMode">
        <TeamSection :team="team" :box="box" @confirmDraft="confirmDraft" @immediateSwap="handleImmediateSwap"
          :generation-rules="generationRules"
          @deleteTeamPokemon="deleteTeamPokemon" @deleteBoxPokemon="deleteBoxPokemon" @cancelSwap="handleCancelSwap"
          @deletePokemon="handleDeleteFromDraft" @swapSuggestion="handleSwapSuggestion" />

        <GymColumns :team="team" :box="box" :remainingGyms="remainingGyms" :defeatedGymsList="defeatedGymsList"
          :defeated-gym-types="defeatedGyms" :pinned-type="pinnedGym" :persist-pinned-gym="persistPinnedGym" :generation-rules="generationRules"
          :draftActive="hasDraft"
          @defeatGym="defeatGym" @undefeatGym="undefeatGym" @swapSuggestion="handleSwapSuggestion" />
      </template>

      <SoulLinkShell
        v-else
        :generation-rules="soulLinkGenerationRules"
        :viewed-player-board="viewedSoulLinkPlayerBoard"
      />
    </div>
  </n-config-provider>

  <Teleport to="body">
    <div v-if="showResetDialog" class="reset-overlay" @click.self="showResetDialog = false">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Options</h3>
        <div class="reset-dialog-options">
          <button class="reset-option" @click="toggleGenerationRules">
            {{ generationRulesLabel }}
          </button>
          <div v-if="!isSoloMode" class="reset-option-section">
            <p class="reset-option-section-label">Viewing Player</p>
            <div class="reset-option-group reset-option-group-inline">
              <button
                v-for="player in soulLinkPlayerSummaries"
                :key="player.id"
                class="reset-option"
                :class="{ 'reset-option-active': player.isViewed }"
                type="button"
                @click="handleViewSoulLinkPlayer(player.id)"
              >
                {{ player.name }}
              </button>
            </div>
          </div>
          <button class="reset-option" :disabled="!isSoloMode" @click="resetPokemon">
            Reset Team & Box
          </button>
          <button class="reset-option" :disabled="!isSoloMode" @click="resetGyms">
            Reset Gyms
          </button>
          <div class="reset-option-group">
            <button class="reset-option" @click="startNewRun(RUN_MODES.SOLO)">
              New Solo Run
            </button>
            <button class="reset-option" @click="startNewRun(RUN_MODES.SOUL_LINK)">
              New Soul Link Run
            </button>
          </div>
        </div>
        <button class="reset-dialog-cancel" @click="showResetDialog = false">✕</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import GymColumns from './components/GymColumns.vue'
import SoulLinkShell from './components/SoulLinkShell.vue'
import TeamSection from './components/TeamSection.vue'
import { useDraftAction } from './composables/useDraftAction.js'
import { useRunModeStore } from './composables/useRunModeStore.js'
import { useRunStore } from './composables/useRunStore.js'
import { useSoulLinkStore } from './composables/useSoulLinkStore.js'
import { getPokemonDataForRules } from './data/pokemon.js'
import { GENERATION_RULESETS, getAllTypesForRules } from './data/types.js'
import { themeOverrides } from './theme/colors.js'
import {
  sanitizeDraftActionForRules,
  sanitizePokemonCollectionForRules,
} from './utils/generationRules.js'
import { buildPokemonMember, generatePokemonId } from './utils/pokemon.js'
import { RUN_MODES } from './utils/runSnapshot.js'
import { buildSoulLinkPlayerBoard } from './utils/soulLinkUi.js'
import { calculateBerryTiebreaker, calculateScore } from './utils/typeCalc.js'

const {
  team,
  defeatedGyms,
  box,
  loadData,
  loadError,
  persistTeam,
  persistBox,
  generationRules,
  persistGenerationRules,
  startNewSoloRun,
  resetTeamAndBox,
  resetGyms: resetGymsInStore,
  pinnedGym,
  deleteTeamPokemon,
  deleteBoxPokemon,
  defeatGym,
  undefeatGym,
  persistPinnedGym,
} = useRunStore()

const {
  players: soulLinkPlayers,
  rosters: soulLinkRosters,
  gymProgress: soulLinkGymProgress,
  generationRules: soulLinkGenerationRules,
  localPreferences: soulLinkLocalPreferences,
  setGenerationRules: setSoulLinkGenerationRules,
  setCachedPlayerSlot,
  updatePlayer: updateSoulLinkPlayer,
  startNewLocalSoulLinkRun,
} = useSoulLinkStore()

const {
  draftAction,
  swapMode,
  enterSwapMode,
  exitSwapMode,
  updateInHandPokemon,
  cancel,
} = useDraftAction()

const { currentRunMode, loadCurrentRunMode, setCurrentRunMode } =
  useRunModeStore()

const showResetDialog = ref(false)
const playerNameInput = ref(null)
const isSoloMode = computed(() => currentRunMode.value === RUN_MODES.SOLO)
const appTitle = computed(() =>
  isSoloMode.value ? 'Weakness Calculator' : viewedSoulLinkPlayerName.value,
)

const activeGenerationRules = computed(() =>
  isSoloMode.value ? generationRules.value : soulLinkGenerationRules.value,
)

function retryLoad() {
  loadData()
}

function resetPokemon() {
  if (!isSoloMode.value) return

  resetTeamAndBox()
  cancel()
  showResetDialog.value = false
}

function resetGyms() {
  if (!isSoloMode.value) return

  resetGymsInStore()
  showResetDialog.value = false
}

function toggleGenerationRules() {
  const nextRuleset =
    activeGenerationRules.value === GENERATION_RULESETS.PRE_GEN_6
      ? GENERATION_RULESETS.POST_GEN_6
      : GENERATION_RULESETS.PRE_GEN_6

  if (isSoloMode.value) {
    persistGenerationRules(nextRuleset)
    return
  }

  setSoulLinkGenerationRules(nextRuleset)
}

const generationRulesLabel = computed(() => {
  return activeGenerationRules.value === GENERATION_RULESETS.PRE_GEN_6
    ? 'Using Pre-Gen 6 Rules'
    : 'Using Post-Gen 6 Rules'
})

const activeTypes = computed(() => getAllTypesForRules(generationRules.value))

const viewedSoulLinkPlayerId = computed(() => {
  const preferredPlayerId = soulLinkLocalPreferences.value.preferredPlayerId
  const cachedPlayerSlot = soulLinkLocalPreferences.value.cachedPlayerSlot
  const devicePlayerId = soulLinkLocalPreferences.value.devicePlayerId

  return preferredPlayerId ?? cachedPlayerSlot ?? devicePlayerId
})

const viewedSoulLinkPlayer = computed(() => {
  return (
    soulLinkPlayers.value.find(
      (player) => player.id === viewedSoulLinkPlayerId.value,
    ) ?? soulLinkPlayers.value[0]
  )
})

const viewedSoulLinkPlayerName = computed(
  () => viewedSoulLinkPlayer.value?.name ?? 'Unknown Player',
)

const soulLinkPlayerSummaries = computed(() => {
  return soulLinkPlayers.value.map((player) => {
    const roster = soulLinkRosters.value[player.id] ?? { team: [], box: [] }
    const progress = soulLinkGymProgress.value[player.id] ?? {
      defeatedGyms: [],
      pinnedGym: null,
    }

    return {
      id: player.id,
      name: player.name,
      isViewed: player.id === viewedSoulLinkPlayerId.value,
      roleLabel: player.isLocal ? 'Local' : 'Partner',
      teamCount: roster.team.length,
      boxCount: roster.box.length,
      defeatedGymCount: progress.defeatedGyms.length,
      pinnedGymLabel: progress.pinnedGym ?? 'None',
    }
  })
})

const viewedSoulLinkPlayerBoard = computed(() => {
  if (!viewedSoulLinkPlayer.value) {
    return {
      team: [],
      box: [],
      remainingGyms: [],
      defeatedGymsList: [],
      pinnedGym: null,
    }
  }

  return buildSoulLinkPlayerBoard(
    viewedSoulLinkPlayer.value.id,
    soulLinkRosters.value,
    soulLinkGymProgress.value,
    soulLinkGenerationRules.value,
  )
})

function handleViewSoulLinkPlayer(playerId) {
  setCachedPlayerSlot(playerId)
}

function handleRenameViewedSoulLinkPlayer(nextName) {
  const player = viewedSoulLinkPlayer.value
  const trimmedName = nextName.trim()

  if (!player || !trimmedName || trimmedName === player.name) return

  updateSoulLinkPlayer(player.id, { name: trimmedName })
}

function handleRenameViewedSoulLinkPlayerInput(event) {
  handleRenameViewedSoulLinkPlayer(event.target.value)
}

function focusPlayerNameInput() {
  playerNameInput.value?.focus()
  playerNameInput.value?.select()
}

function getRulesetPokemonData(name) {
  return getPokemonDataForRules(name, generationRules.value)
}

// Store original state when swap mode starts
const swapOriginalState = ref(null)

watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    // Only capture if not already captured (e.g., by confirmDraft for add-replace)
    if (!swapOriginalState.value) {
      swapOriginalState.value = {
        team: JSON.parse(JSON.stringify(team.value)),
        box: JSON.parse(JSON.stringify(box.value)),
      }
    }
  } else {
    swapOriginalState.value = null
  }
})

watch(generationRules, (ruleset) => {
  if (draftAction.value) {
    draftAction.value = sanitizeDraftActionForRules(draftAction.value, ruleset)
  }

  if (swapOriginalState.value) {
    swapOriginalState.value = {
      team: sanitizePokemonCollectionForRules(
        swapOriginalState.value.team,
        ruleset,
      ),
      box: sanitizePokemonCollectionForRules(
        swapOriginalState.value.box,
        ruleset,
      ),
    }
  }
})

async function handleCancelSwap() {
  if (swapOriginalState.value) {
    await Promise.all([
      persistTeam(
        sanitizePokemonCollectionForRules(
          swapOriginalState.value.team,
          generationRules.value,
        ),
      ),
      persistBox(
        sanitizePokemonCollectionForRules(
          swapOriginalState.value.box,
          generationRules.value,
        ),
      ),
    ])
  }
  exitSwapMode()
}

async function clearTransientUiState() {
  if (swapMode.value) {
    await handleCancelSwap()
    return
  }

  cancel()
  swapOriginalState.value = null
}

async function startNewRun(mode) {
  await clearTransientUiState()

  if (mode === RUN_MODES.SOLO) {
    await startNewSoloRun()
    setCurrentRunMode(RUN_MODES.SOLO)
  } else {
    startNewLocalSoulLinkRun()
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
  }

  showResetDialog.value = false
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

  return activeTypes.value.map((type) => ({
    type,
    score: calculateScore(type, effectiveTeam, generationRules.value),
    berryCount: calculateBerryTiebreaker(
      type,
      effectiveTeam,
      generationRules.value,
    ),
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

    const replacedPokemonData = getRulesetPokemonData(targetPokemon.name)

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
      targetPokemon.spriteVariant,
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

      const replacedPokemonData = getRulesetPokemonData(targetPokemon.name)

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
        targetPokemon.spriteVariant,
      )
      draftAction.value.editId = newTeamMember.id
    }
  }
}

function handleSwapSuggestion({ currentId, candidateId, isTeamMember }) {
  swapOriginalState.value = {
    team: JSON.parse(JSON.stringify(team.value)),
    box: JSON.parse(JSON.stringify(box.value)),
  }

  if (isTeamMember) {
    // Editing team Pokemon A (currentId), candidate is box Pokemon B (candidateId)
    const teamPokemon = team.value.find((p) => p.id === currentId)
    const boxPokemon = box.value.find((p) => p.id === candidateId)
    if (!teamPokemon || !boxPokemon) return

    // B goes to team where A was
    const newTeamMember = buildPokemonMember(boxPokemon, { source: 'team' })
    persistTeam(team.value.map((p) => (p.id === currentId ? newTeamMember : p)))

    // A goes to box where B was
    const newBoxMember = buildPokemonMember(teamPokemon, { source: 'box' })
    persistBox(box.value.map((p) => (p.id === candidateId ? newBoxMember : p)))

    // Set A as "in hand" box Pokemon for chain swapping
    const pokemonData = getRulesetPokemonData(teamPokemon.name)
    draftAction.value = {
      type: 'edit',
      isBoxPokemon: true,
      isTeamPokemon: false,
      boxPokemonId: newBoxMember.id,
      pokemon: pokemonData,
      ability: teamPokemon.ability,
      berry: teamPokemon.berry,
      moves: [...(teamPokemon.moves || [])],
      specialMove: teamPokemon.specialMove || null,
      megaForm: teamPokemon.megaForm || null,
      megaTypes: teamPokemon.megaTypes || null,
      megaSpriteId: teamPokemon.megaSpriteId || null,
      spriteVariant: teamPokemon.spriteVariant || 'default',
    }
  } else {
    // Box editing: handleImmediateSwap already sets correct perspective
    handleImmediateSwap(candidateId)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
  enterSwapMode()
}

// Methods
function confirmDraft() {
  if (!draftAction.value) return

  // Handle deletion (wizard mode: confirmed with no pokemon)
  if (!draftAction.value.pokemon) {
    if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
      // Delete team Pokemon
      deleteTeamPokemon(draftAction.value.editId)
    } else if (
      draftAction.value.type === 'edit' &&
      draftAction.value.isBoxPokemon
    ) {
      // Delete box Pokemon
      deleteBoxPokemon(draftAction.value.boxPokemonId)
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
        team: JSON.parse(JSON.stringify(team.value)),
        box: JSON.parse(JSON.stringify(box.value)),
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

function handleDeleteFromDraft() {
  if (!draftAction.value) return

  if (draftAction.value.isBoxPokemon) {
    deleteBoxPokemon(draftAction.value.boxPokemonId)
  } else if (draftAction.value.editId) {
    deleteTeamPokemon(draftAction.value.editId)
  }
  cancel()
}

onMounted(() => {
  const initialRunMode = loadCurrentRunMode()

  if (initialRunMode === RUN_MODES.SOLO) {
    loadData()
    return
  }

  startNewLocalSoulLinkRun(soulLinkGenerationRules.value)
})
</script>

<style scoped>
.app-container {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn var(--transition-slow) ease forwards;
}

.app-title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: var(--space-6);
}

.title-player-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  max-width: min(100%, 28rem);
}

.title-player-field {
  flex: 0 1 auto;
  min-width: 0;
}

.title-accent {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-player-input {
  width: auto;
  max-width: min(100%, 24rem);
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  background-image: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-player-input:focus {
  outline: none;
}

.title-player-input::selection {
  -webkit-text-fill-color: var(--color-text-primary);
}

.title-rename-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--transition-base);
}

.title-rename-button:hover,
.title-rename-button:focus-visible {
  color: var(--color-primary);
  outline: none;
}

.reset-btn {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.reset-btn:hover,
.reset-btn:active {
  color: rgba(139, 92, 246, 1);
}

@media (orientation: landscape) and (max-height: 500px) {
  .app-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
    max-width: 100%;
  }

  .load-error-banner {
    background: var(--color-danger);
    color: white;
    text-align: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    animation: fadeIn var(--transition-base) ease forwards;
  }

  .app-title {
    flex: 0 0 100%;
    margin-bottom: var(--space-2);
  }

  .app-container> :nth-child(3) {
    flex: 1;
    min-width: 0;
  }

  .app-container> :nth-child(4) {
    flex: 1;
    min-width: 0;
  }

  .reset-btn {
    top: auto;
    bottom: 0;
  }
}
</style>

<style>
.reset-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--transition-fast) ease forwards;
}

.reset-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--space-6);
  min-width: 220px;
  text-align: center;
  position: relative;
  animation: scaleIn var(--transition-base) ease forwards;
}

.reset-dialog-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.reset-dialog-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.reset-option {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  -webkit-appearance: none;
  appearance: none;
  padding: var(--space-2) var(--space-4);
  font-size: 0.95rem;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);
  -webkit-tap-highlight-color: transparent;
}

.reset-option:focus,
.reset-option:focus-visible,
.reset-option:active {
  background: transparent;
  outline: none;
}

.reset-option-danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.reset-option-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.reset-option-group-inline {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.reset-option-section {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
}

.reset-option-section-label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.reset-option-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.reset-option:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  opacity: 0.7;
}

@media (hover: hover) and (pointer: fine) {
  .reset-option:hover:not(:disabled) {
    background: var(--color-surface-light);
    border-color: var(--color-text-muted);
  }

  .reset-option-danger:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: var(--color-danger);
  }
}

.reset-dialog-cancel {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.reset-dialog-cancel:hover {
  color: var(--color-text-primary);
}
</style>

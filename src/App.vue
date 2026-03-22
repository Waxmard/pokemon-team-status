<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <div v-if="activeLoadError" class="load-error-banner" @click="retryLoad">
        Failed to load saved data. Tap to retry.
      </div>
      <div class="header-btns">
        <button class="header-btn" @click="showResetDialog = true" aria-label="Options">✦</button>
        <button v-if="!isSoloMode" class="header-btn header-btn-link" @click="showSoulLinkDialog = true" aria-label="Soul Link">🔗</button>
      </div>
      <h1 class="app-title">
        <span v-if="isSoloMode" class="title-accent">{{ appTitle }}</span>
        <span v-else class="title-player-row">
          <label class="title-player-field">
            <input
              ref="playerNameInput"
              :value="viewedSoulLinkPlayerName"
              :size="Math.max(viewedSoulLinkPlayerName.length, 1)"
              class="title-player-input"
              type="text"
              maxlength="32"
              aria-label="Viewed Soul Link player name"
              @blur="handleRenameViewedSoulLinkPlayerInput"
              @focus="selectPlayerNameInput"
            />
          </label>
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
        :draft-active="hasDraft"
        :persist-pinned-gym="handleSoulLinkPersistPinnedGym"
        :partner-roster="soulLinkPartnerRoster"
        @confirmDraft="handleSoulLinkConfirmDraft"
        @immediateSwap="handleSoulLinkImmediateSwap"
        @deleteTeamPokemon="handleSoulLinkDeleteTeamPokemon"
        @deleteBoxPokemon="handleSoulLinkDeleteBoxPokemon"
        @cancelSwap="handleSoulLinkCancelSwap"
        @deletePokemon="handleSoulLinkDeleteFromDraft"
        @swapSuggestion="handleSoulLinkSwapSuggestion"
        @defeatGym="handleSoulLinkDefeatGym"
        @undefeatGym="handleSoulLinkUndefeatGym"
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
          <div class="reset-option-group">
            <button class="reset-option" @click="resetPokemon">
              Reset Team & Box
            </button>
            <button class="reset-option" @click="resetGyms">
              Reset Gyms
            </button>
          </div>
          <div class="reset-option-group">
            <button class="reset-option" @click="startNewRun(RUN_MODES.SOLO)">
              New Solo Run
            </button>
          </div>
        </div>
        <button class="reset-dialog-cancel" @click="showResetDialog = false">✕</button>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="linkedDeleteTarget" class="reset-overlay"
         @click.self="linkedDeleteTarget = null">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Delete Linked Pair</h3>
        <p class="linked-delete-text">
          This linked Pokemon and its partner will both be deleted.
        </p>
        <div class="reset-dialog-options">
          <button class="reset-option reset-option-danger"
                  @click="confirmLinkedDelete">
            Delete Both
          </button>
        </div>
        <button class="reset-dialog-cancel"
                @click="linkedDeleteTarget = null">✕</button>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="showSoulLinkDialog" class="reset-overlay" @click.self="showSoulLinkDialog = false">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Soul Link</h3>
        <div class="reset-dialog-options">
          <button class="reset-option" @click="handleViewOtherSoulLinkPlayer">
            View {{ otherSoulLinkPlayerName }}
          </button>
          <div v-if="hasRemoteSession && isSupabaseAvailable" class="reset-option-group">
            <div class="session-code-display" @click="copyInviteCode">
              {{ soulLinkSessionMetadata.inviteCode }}
              <span class="session-code-hint">{{ copyLabel }}</span>
            </div>
          </div>
          <div class="reset-option-group">
            <button class="reset-option" @click="startNewRun(RUN_MODES.SOUL_LINK)">
              New Soul Link Run
            </button>
            <template v-if="isSupabaseAvailable">
              <template v-if="showJoinInput">
                <div class="session-input-row">
                  <input
                    ref="joinCodeInput"
                    v-model="joinCodeValue"
                    class="session-code-input"
                    type="text"
                    maxlength="6"
                    placeholder="Invite code"
                    @keydown.enter="handleJoinSession"
                  />
                  <button class="reset-option session-confirm-btn" @click="handleJoinSession" :disabled="sessionActionPending">
                    Join
                  </button>
                </div>
              </template>
              <button v-else class="reset-option" @click="showJoinInput = true">
                Join Soul Link Run
              </button>
            </template>
          </div>
          <button v-if="hasRemoteSession && isSupabaseAvailable" class="sync-now-link" @click="handleSyncNow" :disabled="isSyncing">
            {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
          </button>
        </div>
        <button class="reset-dialog-cancel" @click="showSoulLinkDialog = false">✕</button>
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
import { supabase } from './services/supabaseClient.js'
import { themeOverrides } from './theme/colors.js'
import {
  sanitizeDraftActionForRules,
  sanitizePokemonCollectionForRules,
} from './utils/generationRules.js'
import { buildPokemonMember, generatePokemonId } from './utils/pokemon.js'
import { RUN_MODES } from './utils/runSnapshot.js'
import {
  adaptSoulLinkMemberToUiMember,
  adaptUiMemberToSoulLinkMember,
  buildSoulLinkMemberFromDraft,
  buildSoulLinkPlayerBoard,
} from './utils/soulLinkUi.js'
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
  sessionMetadata: soulLinkSessionMetadata,
  activity: soulLinkActivity,
  loadSoulLinkData,
  loadError: soulLinkLoadError,
  setGenerationRules: setSoulLinkGenerationRules,
  setCachedPlayerSlot,
  updatePlayer: updateSoulLinkPlayer,
  startNewLocalSoulLinkRun,
  getPlayerRoster,
  getPlayerGymProgress,
  setPlayerRoster,
  addRosterMember,
  updateRosterMember,
  removeRosterMember: removeSoulLinkRosterMember,
  updatePlayerGymProgress,
  resetPlayerRoster,
  resetPlayerGymProgress,
  createSession: createSoulLinkSession,
  joinSession: joinSoulLinkSession,
  pushState: pushSoulLinkState,
  syncSession: syncSoulLinkSession,
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
const showSoulLinkDialog = ref(false)
const linkedDeleteTarget = ref(null)
const playerNameInput = ref(null)
const joinCodeInput = ref(null)
const joinCodeValue = ref('')
const showJoinInput = ref(false)
const sessionActionPending = ref(false)
const copyLabel = ref('tap to copy')
const isSoloMode = computed(() => currentRunMode.value === RUN_MODES.SOLO)
const isSupabaseAvailable = !!supabase
const hasRemoteSession = computed(
  () => !isSoloMode.value && !!soulLinkSessionMetadata.value?.sessionId,
)
const isSyncing = computed(
  () => soulLinkActivity.value?.syncState === 'syncing',
)
const appTitle = computed(() =>
  isSoloMode.value ? 'Weakness Calculator' : viewedSoulLinkPlayerName.value,
)

const activeGenerationRules = computed(() =>
  isSoloMode.value ? generationRules.value : soulLinkGenerationRules.value,
)

const activeLoadError = computed(() =>
  isSoloMode.value ? loadError.value : soulLinkLoadError.value,
)

function retryLoad() {
  if (isSoloMode.value) {
    loadData()
  } else {
    loadSoulLinkData()
  }
}

function resetPokemon() {
  if (isSoloMode.value) {
    resetTeamAndBox()
    cancel()
  } else {
    resetPlayerRoster(viewedSoulLinkPlayerId.value)
    cancel()
  }
  showResetDialog.value = false
}

function resetGyms() {
  if (isSoloMode.value) {
    resetGymsInStore()
  } else {
    resetPlayerGymProgress(viewedSoulLinkPlayerId.value)
  }
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

const otherSoulLinkPlayerName = computed(() => {
  const other = soulLinkPlayers.value.find(
    (player) => player.id !== viewedSoulLinkPlayerId.value,
  )
  return other?.name ?? 'Other Player'
})

const soulLinkPartnerRoster = computed(() => {
  const partnerId = soulLinkPlayers.value.find(
    (p) => p.id !== viewedSoulLinkPlayerId.value,
  )?.id
  if (!partnerId) return null
  const roster = getPlayerRoster(partnerId)
  return [...roster.team, ...roster.box]
    .map(adaptSoulLinkMemberToUiMember)
    .filter(Boolean)
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
    soulLinkPartnerRoster.value,
  )
})

function handleViewOtherSoulLinkPlayer() {
  const other = soulLinkPlayers.value.find(
    (player) => player.id !== viewedSoulLinkPlayerId.value,
  )
  if (other) {
    setCachedPlayerSlot(other.id)
  }
  showResetDialog.value = false
  showSoulLinkDialog.value = false
}

function handleRenameViewedSoulLinkPlayer(nextName) {
  const player = viewedSoulLinkPlayer.value
  const trimmedName = nextName.trim()

  if (!player || !trimmedName || trimmedName === player.name) return

  updateSoulLinkPlayer(player.id, { name: trimmedName })
  scheduleSyncPush()
}

function handleRenameViewedSoulLinkPlayerInput(event) {
  handleRenameViewedSoulLinkPlayer(event.target.value)
}

function selectPlayerNameInput() {
  playerNameInput.value?.select()
}

// --- Session management ---

let syncPushTimer = null
function scheduleSyncPush() {
  if (!hasRemoteSession.value) return
  clearTimeout(syncPushTimer)
  syncPushTimer = setTimeout(() => {
    pushSoulLinkState().catch((err) => console.error('Auto-push failed:', err))
  }, 5000)
}

async function handleJoinSession() {
  const code = joinCodeValue.value.trim()
  if (!code) return
  sessionActionPending.value = true
  try {
    await joinSoulLinkSession(code)
    showJoinInput.value = false
    joinCodeValue.value = ''
  } catch (error) {
    console.error('Failed to join session:', error)
  } finally {
    sessionActionPending.value = false
  }
}

async function handleSyncNow() {
  clearTimeout(syncPushTimer)
  await syncSoulLinkSession()
}

function copyInviteCode() {
  const code = soulLinkSessionMetadata.value?.inviteCode
  if (!code) return

  function onSuccess() {
    copyLabel.value = 'copied!'
    setTimeout(() => {
      copyLabel.value = 'tap to copy'
    }, 2000)
  }

  function tryFallback() {
    if (fallbackCopy(code)) {
      onSuccess()
    } else {
      copyLabel.value = 'copy failed'
    }
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(code).then(onSuccess).catch(tryFallback)
  } else {
    tryFallback()
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

function getRulesetPokemonData(name) {
  return getPokemonDataForRules(name, generationRules.value)
}

// Store original state when swap mode starts
const swapOriginalState = ref(null)
const soulLinkSwapOriginalRoster = ref(null)

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
    if (isSoloMode.value) {
      await handleCancelSwap()
    } else {
      handleSoulLinkCancelSwap()
    }
    return
  }

  cancel()
  swapOriginalState.value = null
  soulLinkSwapOriginalRoster.value = null
}

async function startNewRun(mode) {
  await clearTransientUiState()

  if (mode === RUN_MODES.SOLO) {
    await startNewSoloRun()
    setCurrentRunMode(RUN_MODES.SOLO)
  } else {
    startNewLocalSoulLinkRun()
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    if (isSupabaseAvailable) {
      try {
        await createSoulLinkSession()
      } catch (err) {
        console.error('Failed to create session for new Soul Link run:', err)
      }
    }
  }

  showResetDialog.value = false
  showSoulLinkDialog.value = false
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

// --- Soul Link helpers ---

function getSoulLinkRoster() {
  return getPlayerRoster(viewedSoulLinkPlayerId.value)
}

function getSoulLinkGenRulesPokemonData(name) {
  return getPokemonDataForRules(name, soulLinkGenerationRules.value)
}

// --- Soul Link gym handlers ---

function handleSoulLinkDefeatGym(type) {
  const pid = viewedSoulLinkPlayerId.value
  const progress = getPlayerGymProgress(pid)
  updatePlayerGymProgress(pid, {
    defeatedGyms: [...progress.defeatedGyms, type],
  })
  scheduleSyncPush()
}

function handleSoulLinkUndefeatGym(type) {
  const pid = viewedSoulLinkPlayerId.value
  const progress = getPlayerGymProgress(pid)
  updatePlayerGymProgress(pid, {
    defeatedGyms: progress.defeatedGyms.filter((g) => g !== type),
  })
  scheduleSyncPush()
}

function handleSoulLinkPersistPinnedGym(type) {
  updatePlayerGymProgress(viewedSoulLinkPlayerId.value, { pinnedGym: type })
  scheduleSyncPush()
}

// --- Soul Link delete handlers ---

function findLinkedDeleteTarget(playerId, memberId, rosterKey) {
  const roster = getPlayerRoster(playerId)
  const member = roster[rosterKey].find((m) => m.id === memberId)
  if (!member?.pairId) return null

  const partnerId = findPartnerPlayerId()
  if (!partnerId) return null

  const partnerRoster = getPlayerRoster(partnerId)
  const partnerMember = [...partnerRoster.team, ...partnerRoster.box].find(
    (m) => m.id === member.pairId,
  )
  if (!partnerMember) return null

  const partnerRosterKey = partnerRoster.team.some(
    (m) => m.id === partnerMember.id,
  )
    ? 'team'
    : 'box'

  return {
    memberId,
    rosterKey,
    partnerPlayerId: partnerId,
    partnerMemberId: partnerMember.id,
    partnerRosterKey,
  }
}

function confirmLinkedDelete() {
  if (!linkedDeleteTarget.value) return
  const pid = viewedSoulLinkPlayerId.value
  const t = linkedDeleteTarget.value

  removeSoulLinkRosterMember(pid, t.rosterKey, t.memberId)
  removeSoulLinkRosterMember(
    t.partnerPlayerId,
    t.partnerRosterKey,
    t.partnerMemberId,
  )

  linkedDeleteTarget.value = null
  cancel()
  scheduleSyncPush()
}

function handleSoulLinkDeleteTeamPokemon(id) {
  const target = findLinkedDeleteTarget(
    viewedSoulLinkPlayerId.value,
    id,
    'team',
  )
  if (target) {
    linkedDeleteTarget.value = target
    return
  }
  removeSoulLinkRosterMember(viewedSoulLinkPlayerId.value, 'team', id)
  scheduleSyncPush()
}

function handleSoulLinkDeleteBoxPokemon(id) {
  const target = findLinkedDeleteTarget(viewedSoulLinkPlayerId.value, id, 'box')
  if (target) {
    linkedDeleteTarget.value = target
    return
  }
  removeSoulLinkRosterMember(viewedSoulLinkPlayerId.value, 'box', id)
  scheduleSyncPush()
}

function handleSoulLinkDeleteFromDraft() {
  if (!draftAction.value) return
  const pid = viewedSoulLinkPlayerId.value

  if (draftAction.value.isBoxPokemon) {
    const target = findLinkedDeleteTarget(
      pid,
      draftAction.value.boxPokemonId,
      'box',
    )
    if (target) {
      linkedDeleteTarget.value = target
      return
    }
    removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
  } else if (draftAction.value.editId) {
    const target = findLinkedDeleteTarget(pid, draftAction.value.editId, 'team')
    if (target) {
      linkedDeleteTarget.value = target
      return
    }
    removeSoulLinkRosterMember(pid, 'team', draftAction.value.editId)
  }
  cancel()
}

// --- Soul Link pairing helpers ---

function findPartnerPlayerId() {
  return soulLinkPlayers.value.find(
    (p) => p.id !== viewedSoulLinkPlayerId.value,
  )?.id
}

function reconcileSoulLinkPairing(playerId, memberId, rosterKey) {
  const roster = getPlayerRoster(playerId)
  const member = roster[rosterKey].find((m) => m.id === memberId)
  if (!member) return

  const partnerId = findPartnerPlayerId()
  if (!partnerId) return

  const partnerRoster = getPlayerRoster(partnerId)
  const allPartnerMembers = [...partnerRoster.team, ...partnerRoster.box]

  const normalizedCatchLocation = member.catchLocation?.toLowerCase() ?? null
  const existingPartner = member.pairId
    ? allPartnerMembers.find((m) => m.id === member.pairId)
    : null

  // If catchLocation is empty, clear pairing
  if (!normalizedCatchLocation) {
    if (existingPartner) {
      const existingPartnerKey = partnerRoster.team.includes(existingPartner)
        ? 'team'
        : 'box'
      updateRosterMember(partnerId, existingPartnerKey, existingPartner.id, {
        pairId: null,
      })
    }
    updateRosterMember(playerId, rosterKey, memberId, { pairId: null })
    return
  }

  if (
    existingPartner?.catchLocation?.toLowerCase() === normalizedCatchLocation
  ) {
    if (existingPartner.pairId !== memberId) {
      const existingPartnerKey = partnerRoster.team.includes(existingPartner)
        ? 'team'
        : 'box'
      updateRosterMember(partnerId, existingPartnerKey, existingPartner.id, {
        pairId: memberId,
      })
    }
    return
  }

  // Clear old pair if member previously had a different pairId
  if (existingPartner) {
    const oldPartnerKey = partnerRoster.team.includes(existingPartner)
      ? 'team'
      : 'box'
    updateRosterMember(partnerId, oldPartnerKey, existingPartner.id, {
      pairId: null,
    })
  }

  // Find partner member with same catchLocation (case-insensitive) that is unlinked
  const matchingPartner = allPartnerMembers.find(
    (m) =>
      m.catchLocation &&
      m.catchLocation.toLowerCase() === normalizedCatchLocation &&
      m.id !== member.pairId,
  )

  if (matchingPartner) {
    // Clear matching partner's old pair if it had one
    if (matchingPartner.pairId && matchingPartner.pairId !== memberId) {
      // Find and clear the old partner's partner
      const myRoster = getPlayerRoster(playerId)
      const allMyMembers = [...myRoster.team, ...myRoster.box]
      const oldPairOfPartner = allMyMembers.find(
        (m) => m.id === matchingPartner.pairId,
      )
      if (oldPairOfPartner) {
        const oldPairKey = myRoster.team.includes(oldPairOfPartner)
          ? 'team'
          : 'box'
        updateRosterMember(playerId, oldPairKey, oldPairOfPartner.id, {
          pairId: null,
        })
      }
    }

    const partnerKey = partnerRoster.team.includes(matchingPartner)
      ? 'team'
      : 'box'
    updateRosterMember(playerId, rosterKey, memberId, {
      pairId: matchingPartner.id,
    })
    updateRosterMember(partnerId, partnerKey, matchingPartner.id, {
      pairId: memberId,
    })
  } else {
    // No matching partner — clear own pairId
    updateRosterMember(playerId, rosterKey, memberId, { pairId: null })
  }
}

function preserveSoulLinkPairingFields(member, sourceMember) {
  if (!member) return member

  const hasMemberCatchLocation = Object.hasOwn(member, 'catchLocation')
  const hasMemberPairId = Object.hasOwn(member, 'pairId')

  return {
    ...member,
    catchLocation: hasMemberCatchLocation
      ? member.catchLocation
      : (sourceMember?.catchLocation ?? null),
    pairId: hasMemberPairId ? member.pairId : (sourceMember?.pairId ?? null),
  }
}

function refreshSoulLinkDraftMetadata(member) {
  if (!draftAction.value) return

  draftAction.value.catchLocation = member?.catchLocation ?? null
  draftAction.value.pairId = member?.pairId ?? null
}

function updateReciprocalSoulLinkPairId(previousMemberId, nextMemberId) {
  if (!previousMemberId || !nextMemberId || previousMemberId === nextMemberId) {
    return
  }

  const partnerId = findPartnerPlayerId()
  if (!partnerId) return

  const partnerRoster = getPlayerRoster(partnerId)
  const partnerMember = [...partnerRoster.team, ...partnerRoster.box].find(
    (member) => member.pairId === previousMemberId,
  )
  if (!partnerMember) return

  const partnerKey = partnerRoster.team.some(
    (member) => member.id === partnerMember.id,
  )
    ? 'team'
    : 'box'

  updateRosterMember(partnerId, partnerKey, partnerMember.id, {
    pairId: nextMemberId,
  })
}

// --- Soul Link confirm draft handler ---

function handleSoulLinkConfirmDraft() {
  if (!draftAction.value) return
  const pid = viewedSoulLinkPlayerId.value

  // Handle deletion (wizard mode: confirmed with no pokemon)
  if (!draftAction.value.pokemon) {
    if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
      removeSoulLinkRosterMember(pid, 'team', draftAction.value.editId)
    } else if (
      draftAction.value.type === 'edit' &&
      draftAction.value.isBoxPokemon
    ) {
      removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
    }
    cancel()
    return
  }

  const newMember = buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team')

  if (draftAction.value.type === 'add') {
    const roster = getSoulLinkRoster()
    if (roster.team.length < 6) {
      addRosterMember(pid, 'team', newMember)
      reconcileSoulLinkPairing(pid, newMember.id, 'team')
    } else {
      // Team full — enter replace mode
      soulLinkSwapOriginalRoster.value = getSoulLinkRoster()

      const tempMember = buildSoulLinkMemberFromDraft(
        draftAction.value,
        pid,
        'temp',
      )
      addRosterMember(pid, 'box', tempMember)

      draftAction.value = {
        ...draftAction.value,
        type: 'edit',
        isBoxPokemon: true,
        isAddReplace: true,
        boxPokemonId: tempMember.id,
      }

      enterSwapMode()
      return
    }
  } else if (draftAction.value.type === 'addToBox') {
    const boxMember = buildSoulLinkMemberFromDraft(
      draftAction.value,
      pid,
      'box',
    )
    addRosterMember(pid, 'box', boxMember)
    reconcileSoulLinkPairing(pid, boxMember.id, 'box')
  } else if (draftAction.value.type === 'edit') {
    if (draftAction.value.isBoxPokemon) {
      if (draftAction.value.replaceTarget) {
        const roster = getSoulLinkRoster()
        if (draftAction.value.replaceTarget.startsWith('empty-')) {
          if (roster.team.length < 6) {
            const boxedMember = roster.box.find(
              (m) => m.id === draftAction.value.boxPokemonId,
            )
            const movedMember = preserveSoulLinkPairingFields(
              newMember,
              boxedMember,
            )
            addRosterMember(pid, 'team', movedMember)
            removeSoulLinkRosterMember(
              pid,
              'box',
              draftAction.value.boxPokemonId,
            )
            updateReciprocalSoulLinkPairId(
              draftAction.value.boxPokemonId,
              movedMember.id,
            )
            reconcileSoulLinkPairing(pid, movedMember.id, 'team')
          }
        } else {
          // Replace existing team member — atomic via setPlayerRoster
          const boxedMember = roster.box.find(
            (m) => m.id === draftAction.value.boxPokemonId,
          )
          const replacedTeamMember = roster.team.find(
            (m) => m.id === draftAction.value.replaceTarget,
          )
          if (boxedMember && replacedTeamMember) {
            const nextTeamMember = preserveSoulLinkPairingFields(
              newMember,
              boxedMember,
            )
            const uiReplaced = {
              id: generatePokemonId('box'),
              name: replacedTeamMember.speciesName,
              types: replacedTeamMember.types,
              ability: replacedTeamMember.ability,
              berry: replacedTeamMember.berry,
              moves: replacedTeamMember.moves,
              specialMove: replacedTeamMember.specialMove,
              megaForm: replacedTeamMember.megaForm,
              megaTypes: replacedTeamMember.megaTypes,
              megaSpriteId: replacedTeamMember.megaSpriteId,
              spriteVariant: replacedTeamMember.spriteVariant,
              catchLocation: replacedTeamMember.catchLocation,
              pairId: replacedTeamMember.pairId,
            }
            const boxMember = preserveSoulLinkPairingFields(
              adaptUiMemberToSoulLinkMember(uiReplaced, pid),
              replacedTeamMember,
            )

            setPlayerRoster(pid, {
              team: roster.team.map((m) =>
                m.id === draftAction.value.replaceTarget ? nextTeamMember : m,
              ),
              box: [
                ...roster.box.filter(
                  (m) => m.id !== draftAction.value.boxPokemonId,
                ),
                boxMember,
              ],
            })

            updateReciprocalSoulLinkPairId(
              draftAction.value.boxPokemonId,
              nextTeamMember.id,
            )
            updateReciprocalSoulLinkPairId(
              draftAction.value.replaceTarget,
              boxMember.id,
            )
            reconcileSoulLinkPairing(pid, nextTeamMember.id, 'team')
            reconcileSoulLinkPairing(pid, boxMember.id, 'box')
          }
        }
      } else {
        // Just update in box
        const uiMember = buildPokemonMember(draftAction.value, {
          id: draftAction.value.boxPokemonId,
        })
        const slMember = adaptUiMemberToSoulLinkMember(
          {
            ...uiMember,
            catchLocation: draftAction.value.catchLocation ?? null,
          },
          pid,
        )
        const { id: _id, ownerPlayerId: _ownerId, ...updates } = slMember
        updateRosterMember(pid, 'box', draftAction.value.boxPokemonId, updates)
        reconcileSoulLinkPairing(pid, draftAction.value.boxPokemonId, 'box')
      }
    } else {
      // Editing a team Pokemon
      const uiMember = buildPokemonMember(draftAction.value, {
        id: draftAction.value.editId,
      })
      const slMember = adaptUiMemberToSoulLinkMember(
        { ...uiMember, catchLocation: draftAction.value.catchLocation ?? null },
        pid,
      )
      const { id: _id, ownerPlayerId: _ownerId, ...updates } = slMember
      updateRosterMember(pid, 'team', draftAction.value.editId, updates)
      reconcileSoulLinkPairing(pid, draftAction.value.editId, 'team')
    }
  }

  cancel()
  scheduleSyncPush()
}

// --- Soul Link swap handlers ---

function handleSoulLinkCancelSwap() {
  if (soulLinkSwapOriginalRoster.value) {
    setPlayerRoster(
      viewedSoulLinkPlayerId.value,
      soulLinkSwapOriginalRoster.value,
    )
  }
  exitSwapMode()
  soulLinkSwapOriginalRoster.value = null
}

function handleSoulLinkImmediateSwap(targetId) {
  if (!draftAction.value?.pokemon) return

  const pid = viewedSoulLinkPlayerId.value
  const roster = getSoulLinkRoster()

  if (draftAction.value.isBoxPokemon) {
    const boxPokemonId = draftAction.value.boxPokemonId
    const boxedMember = roster.box.find((member) => member.id === boxPokemonId)
    const inHandMember = preserveSoulLinkPairingFields(
      buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
      boxedMember,
    )

    if (targetId === null) {
      if (roster.team.length >= 6) return
      addRosterMember(pid, 'team', inHandMember)
      removeSoulLinkRosterMember(pid, 'box', boxPokemonId)
      updateReciprocalSoulLinkPairId(boxPokemonId, inHandMember.id)
      reconcileSoulLinkPairing(pid, inHandMember.id, 'team')
      exitSwapMode()
      return
    }

    const targetMember = roster.team.find((m) => m.id === targetId)
    if (!targetMember) return

    const replacedPokemonData = getSoulLinkGenRulesPokemonData(
      targetMember.speciesName,
    )

    const nextTeamMember = { ...inHandMember, id: generatePokemonId('team') }
    const newBoxMember = preserveSoulLinkPairingFields(
      adaptUiMemberToSoulLinkMember(
        {
          id: generatePokemonId('box'),
          name: targetMember.speciesName,
          types: targetMember.types,
          ability: targetMember.ability,
          berry: targetMember.berry,
          moves: targetMember.moves,
          specialMove: targetMember.specialMove,
          megaForm: targetMember.megaForm,
          megaTypes: targetMember.megaTypes,
          megaSpriteId: targetMember.megaSpriteId,
          spriteVariant: targetMember.spriteVariant,
        },
        pid,
      ),
      targetMember,
    )

    setPlayerRoster(pid, {
      team: roster.team.map((m) => (m.id === targetId ? nextTeamMember : m)),
      box: [...roster.box.filter((m) => m.id !== boxPokemonId), newBoxMember],
    })

    updateReciprocalSoulLinkPairId(boxPokemonId, nextTeamMember.id)
    updateReciprocalSoulLinkPairId(targetId, newBoxMember.id)

    updateInHandPokemon(
      replacedPokemonData,
      targetMember.ability,
      targetMember.berry,
      targetMember.moves,
      targetMember.specialMove,
      targetMember.megaForm,
      targetMember.megaTypes,
      targetMember.megaSpriteId,
      targetMember.spriteVariant,
    )
    refreshSoulLinkDraftMetadata(targetMember)
    draftAction.value.boxPokemonId = newBoxMember.id
  } else if (draftAction.value.isTeamPokemon) {
    const teamPokemonId = draftAction.value.editId
    const teamMember = roster.team.find((member) => member.id === teamPokemonId)
    const inHandMember = preserveSoulLinkPairingFields(
      buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
      teamMember,
    )

    if (targetId === null) {
      const boxMember = preserveSoulLinkPairingFields(
        buildSoulLinkMemberFromDraft(draftAction.value, pid, 'box'),
        teamMember,
      )
      addRosterMember(pid, 'box', boxMember)
      removeSoulLinkRosterMember(pid, 'team', teamPokemonId)
      updateReciprocalSoulLinkPairId(teamPokemonId, boxMember.id)
      reconcileSoulLinkPairing(pid, boxMember.id, 'box')
      exitSwapMode()
    } else {
      const targetMember = roster.box.find((m) => m.id === targetId)
      if (!targetMember) return

      const replacedPokemonData = getSoulLinkGenRulesPokemonData(
        targetMember.speciesName,
      )

      const newTeamMember = preserveSoulLinkPairingFields(
        adaptUiMemberToSoulLinkMember(
          {
            id: generatePokemonId('team'),
            name: targetMember.speciesName,
            types: targetMember.types,
            ability: targetMember.ability,
            berry: targetMember.berry,
            moves: targetMember.moves,
            specialMove: targetMember.specialMove,
            megaForm: targetMember.megaForm,
            megaTypes: targetMember.megaTypes,
            megaSpriteId: targetMember.megaSpriteId,
            spriteVariant: targetMember.spriteVariant,
          },
          pid,
        ),
        targetMember,
      )
      const nextBoxMember = { ...inHandMember, id: generatePokemonId('box') }

      setPlayerRoster(pid, {
        team: roster.team.map((m) =>
          m.id === teamPokemonId ? newTeamMember : m,
        ),
        box: roster.box.map((m) => (m.id === targetId ? nextBoxMember : m)),
      })

      updateReciprocalSoulLinkPairId(targetId, newTeamMember.id)
      updateReciprocalSoulLinkPairId(teamPokemonId, nextBoxMember.id)

      updateInHandPokemon(
        replacedPokemonData,
        targetMember.ability,
        targetMember.berry,
        targetMember.moves,
        targetMember.specialMove,
        targetMember.megaForm,
        targetMember.megaTypes,
        targetMember.megaSpriteId,
        targetMember.spriteVariant,
      )
      refreshSoulLinkDraftMetadata(targetMember)
      draftAction.value.editId = newTeamMember.id
    }
  }
}

function handleSoulLinkSwapSuggestion({
  currentId,
  candidateId,
  isTeamMember,
}) {
  const pid = viewedSoulLinkPlayerId.value
  const roster = getSoulLinkRoster()
  soulLinkSwapOriginalRoster.value = roster

  if (isTeamMember) {
    const teamMember = roster.team.find((m) => m.id === currentId)
    const boxMember = roster.box.find((m) => m.id === candidateId)
    if (!teamMember || !boxMember) return

    const newTeamMember = preserveSoulLinkPairingFields(
      adaptUiMemberToSoulLinkMember(
        {
          id: generatePokemonId('team'),
          name: boxMember.speciesName,
          types: boxMember.types,
          ability: boxMember.ability,
          berry: boxMember.berry,
          moves: boxMember.moves,
          specialMove: boxMember.specialMove,
          megaForm: boxMember.megaForm,
          megaTypes: boxMember.megaTypes,
          megaSpriteId: boxMember.megaSpriteId,
          spriteVariant: boxMember.spriteVariant,
        },
        pid,
      ),
      boxMember,
    )

    const newBoxMember = preserveSoulLinkPairingFields(
      adaptUiMemberToSoulLinkMember(
        {
          id: generatePokemonId('box'),
          name: teamMember.speciesName,
          types: teamMember.types,
          ability: teamMember.ability,
          berry: teamMember.berry,
          moves: teamMember.moves,
          specialMove: teamMember.specialMove,
          megaForm: teamMember.megaForm,
          megaTypes: teamMember.megaTypes,
          megaSpriteId: teamMember.megaSpriteId,
          spriteVariant: teamMember.spriteVariant,
        },
        pid,
      ),
      teamMember,
    )

    setPlayerRoster(pid, {
      team: roster.team.map((m) => (m.id === currentId ? newTeamMember : m)),
      box: roster.box.map((m) => (m.id === candidateId ? newBoxMember : m)),
    })

    updateReciprocalSoulLinkPairId(candidateId, newTeamMember.id)
    updateReciprocalSoulLinkPairId(currentId, newBoxMember.id)

    const pokemonData = getSoulLinkGenRulesPokemonData(teamMember.speciesName)
    draftAction.value = {
      type: 'edit',
      isBoxPokemon: true,
      isTeamPokemon: false,
      boxPokemonId: newBoxMember.id,
      pokemon: pokemonData,
      ability: teamMember.ability,
      berry: teamMember.berry,
      moves: [...(teamMember.moves || [])],
      specialMove: teamMember.specialMove || null,
      megaForm: teamMember.megaForm || null,
      megaTypes: teamMember.megaTypes || null,
      megaSpriteId: teamMember.megaSpriteId || null,
      spriteVariant: teamMember.spriteVariant || 'default',
      catchLocation: teamMember.catchLocation || null,
      pairId: teamMember.pairId || null,
    }
  } else {
    handleSoulLinkImmediateSwap(candidateId)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
  enterSwapMode()
}

onMounted(async () => {
  const initialRunMode = loadCurrentRunMode()

  if (initialRunMode === RUN_MODES.SOLO) {
    loadData()
    return
  }

  await loadSoulLinkData()

  if (soulLinkSessionMetadata.value?.sessionId) {
    syncSoulLinkSession().catch((err) =>
      console.error('Auto-sync on mount failed:', err),
    )
  }
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
  max-width: min(100%, 28rem);
}

.title-player-field {
  display: inline-flex;
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
  cursor: text;
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

.header-btns {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  display: flex;
  gap: var(--space-1);
}

.header-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.header-btn:hover,
.header-btn:active {
  color: rgba(139, 92, 246, 1);
}

.header-btn-link {
  font-size: 0.6rem;
  filter: grayscale(1);
  opacity: 0.5;
}

.header-btn-link:hover,
.header-btn-link:active {
  filter: grayscale(0);
  opacity: 1;
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

  .header-btns {
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

.linked-delete-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.sync-now-link {
  background: transparent;
  border: none;
  -webkit-appearance: none;
  appearance: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: var(--space-1) 0;
  transition: color var(--transition-base);
}

.sync-now-link:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .sync-now-link:hover:not(:disabled) {
    color: var(--color-text-primary);
  }
}

.session-input-row {
  display: flex;
  gap: var(--space-2);
}

.session-code-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-light);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-align: center;
}

.session-code-input::placeholder {
  text-transform: none;
  letter-spacing: normal;
  color: var(--color-text-muted);
}

.session-confirm-btn {
  flex-shrink: 0;
}

.session-code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: monospace;
  font-size: 0.95rem;
  letter-spacing: 0.15em;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-base);
}

.session-code-hint {
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: normal;
  color: var(--color-text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .session-code-display:hover {
    background: var(--color-surface-light);
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .app-container .team-section-wrapper {
    flex: 1;
    min-width: 0;
  }

  .app-container .gym-section-wrapper {
    flex: 1;
    min-width: 0;
  }
}
</style>

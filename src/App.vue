<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <div v-if="activeLoadError" class="load-error-banner" @click="retryLoad">
        Failed to load saved data. Tap to retry.
      </div>
      <div class="header-btns">
        <button class="header-btn" @click="showResetDialog = true" aria-label="Options">✦</button>
        <button v-if="!isSoloMode && hasRemoteSession" class="header-btn header-btn-link" @click="showSoulLinkDialog = true" aria-label="Soul Link">🔗</button>
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
    <Transition name="dialog">
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
            <button class="reset-option" @click="switchToSoloMode">
              Solo Mode
            </button>
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
        </div>
        <button class="reset-dialog-cancel" @click="showResetDialog = false">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="dialog">
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
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="dialog">
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
        </div>
        <button class="reset-dialog-cancel" @click="showSoulLinkDialog = false">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
  findLinkedDeleteTarget as findLinkedDeleteTargetUtil,
  preserveSoulLinkPairingFields,
  reconcileSoulLinkPairing as reconcileSoulLinkPairingUtil,
  updateReciprocalSoulLinkPairId as updateReciprocalSoulLinkPairIdUtil,
} from './utils/soulLinkPairing.js'
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
  subscribeToSessionUpdates: subscribeSoulLink,
  unsubscribeFromSession: unsubscribeSoulLink,
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
  triggerSync()
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
  triggerSync()
}

function handleRenameViewedSoulLinkPlayerInput(event) {
  handleRenameViewedSoulLinkPlayer(event.target.value)
}

function selectPlayerNameInput() {
  playerNameInput.value?.select()
}

// --- Session management ---

function triggerSync() {
  if (!hasRemoteSession.value) return
  pushSoulLinkState().catch((err) => console.error('Push failed:', err))
}

async function handleJoinSession() {
  const code = joinCodeValue.value.trim()
  if (!code) return
  sessionActionPending.value = true
  try {
    unsubscribeSoulLink()
    await joinSoulLinkSession(code)
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    subscribeSoulLink()
    showJoinInput.value = false
    joinCodeValue.value = ''
    showResetDialog.value = false
  } catch (error) {
    console.error('Failed to join session:', error)
  } finally {
    sessionActionPending.value = false
  }
}

function onCopySuccess() {
  copyLabel.value = 'copied!'
  setTimeout(() => {
    copyLabel.value = 'tap to copy'
  }, 2000)
}

function copyInviteCode() {
  const code = soulLinkSessionMetadata.value?.inviteCode
  if (!code) return

  function tryFallback() {
    if (fallbackCopy(code)) {
      onCopySuccess()
    } else {
      copyLabel.value = 'copy failed'
    }
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(code).then(onCopySuccess).catch(tryFallback)
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
    textarea.remove()
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
    if (!isSoloMode.value && !soulLinkSwapOriginalRoster.value) {
      soulLinkSwapOriginalRoster.value = getSoulLinkRoster()
    }
  } else {
    swapOriginalState.value = null
    if (!isSoloMode.value) {
      triggerSync()
    }
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

async function switchToSoloMode() {
  await clearTransientUiState()
  unsubscribeSoulLink()
  setCurrentRunMode(RUN_MODES.SOLO)
  showResetDialog.value = false
  showSoulLinkDialog.value = false
}

async function startNewRun(mode) {
  await clearTransientUiState()
  unsubscribeSoulLink()

  if (mode === RUN_MODES.SOLO) {
    await startNewSoloRun()
    setCurrentRunMode(RUN_MODES.SOLO)
  } else {
    startNewLocalSoulLinkRun()
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    if (isSupabaseAvailable) {
      try {
        await createSoulLinkSession()
        subscribeSoulLink()
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

function swapInHandToTarget(targetPokemon) {
  const replacedPokemonData = getRulesetPokemonData(targetPokemon.name)
  updateInHandPokemon({
    pokemonData: replacedPokemonData,
    ability: targetPokemon.ability,
    berry: targetPokemon.berry,
    moves: targetPokemon.moves,
    specialMove: targetPokemon.specialMove,
    megaForm: targetPokemon.megaForm,
    megaTypes: targetPokemon.megaTypes,
    megaSpriteId: targetPokemon.megaSpriteId,
    spriteVariant: targetPokemon.spriteVariant,
  })
}

function handleBoxToTeamSwap(targetId, inHandPokemon) {
  const boxPokemonId = draftAction.value.boxPokemonId

  if (targetId === null) {
    if (team.value.length >= 6) return
    const newTeamMember = buildPokemonMember(draftAction.value, {
      source: 'team',
    })
    persistTeam([...team.value, newTeamMember])
    persistBox(box.value.filter((p) => p.id !== boxPokemonId))
    exitSwapMode()
    return
  }

  const targetPokemon = team.value.find((p) => p.id === targetId)
  if (!targetPokemon) return

  const newTeam = team.value.map((p) =>
    p.id === targetId ? { ...inHandPokemon, id: generatePokemonId('team') } : p,
  )
  persistTeam(newTeam)

  const newBoxMember = buildPokemonMember(targetPokemon, { source: 'box' })
  persistBox([...box.value.filter((p) => p.id !== boxPokemonId), newBoxMember])

  swapInHandToTarget(targetPokemon)
  draftAction.value.boxPokemonId = newBoxMember.id
}

function handleTeamToBoxSwap(targetId, inHandPokemon) {
  const teamPokemonId = draftAction.value.editId

  if (targetId === null) {
    const newBoxMember = buildPokemonMember(draftAction.value, {
      source: 'box',
    })
    persistBox([...box.value, newBoxMember])
    persistTeam(team.value.filter((p) => p.id !== teamPokemonId))
    exitSwapMode()
    return
  }

  const targetPokemon = box.value.find((p) => p.id === targetId)
  if (!targetPokemon) return

  const newBox = box.value.map((p) =>
    p.id === targetId ? { ...inHandPokemon, id: generatePokemonId('box') } : p,
  )
  persistBox(newBox)

  const newTeamMember = buildPokemonMember(targetPokemon, {
    source: 'team',
  })
  persistTeam(
    team.value.map((p) => (p.id === teamPokemonId ? newTeamMember : p)),
  )

  swapInHandToTarget(targetPokemon)
  draftAction.value.editId = newTeamMember.id
}

// Handle immediate swap when clicking a slot in swap mode
function handleImmediateSwap(targetId) {
  if (!draftAction.value?.pokemon) return

  const inHandPokemon = buildPokemonMember(draftAction.value)

  if (draftAction.value.isBoxPokemon) {
    handleBoxToTeamSwap(targetId, inHandPokemon)
  } else if (draftAction.value.isTeamPokemon) {
    handleTeamToBoxSwap(targetId, inHandPokemon)
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

function confirmBoxPokemonEdit() {
  const boxIndex = box.value.findIndex(
    (p) => p.id === draftAction.value.boxPokemonId,
  )
  const updatedPokemon = buildPokemonMember(draftAction.value, {
    id: draftAction.value.boxPokemonId,
  })

  if (!draftAction.value.replaceTarget) {
    const newBox = [...box.value]
    newBox[boxIndex] = updatedPokemon
    persistBox(newBox)
    return
  }

  if (draftAction.value.replaceTarget.startsWith('empty-')) {
    if (team.value.length < 6) {
      persistTeam([
        ...team.value,
        buildPokemonMember(draftAction.value, { source: 'team' }),
      ])
      persistBox(
        box.value.filter((p) => p.id !== draftAction.value.boxPokemonId),
      )
    }
    return
  }

  const targetIndex = team.value.findIndex(
    (p) => p.id === draftAction.value.replaceTarget,
  )
  if (targetIndex !== -1) {
    const replacedPokemon = team.value[targetIndex]
    const boxMember = buildPokemonMember(replacedPokemon, { source: 'box' })
    persistTeam(
      team.value.map((p) =>
        p.id === draftAction.value.replaceTarget
          ? buildPokemonMember(draftAction.value, { source: 'team' })
          : p,
      ),
    )
    persistBox([
      ...box.value.filter((p) => p.id !== draftAction.value.boxPokemonId),
      boxMember,
    ])
  }
}

function handleDraftDeletion() {
  if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
    deleteTeamPokemon(draftAction.value.editId)
  } else if (
    draftAction.value.type === 'edit' &&
    draftAction.value.isBoxPokemon
  ) {
    deleteBoxPokemon(draftAction.value.boxPokemonId)
  }
}

function enterAddReplaceMode() {
  swapOriginalState.value = {
    team: JSON.parse(JSON.stringify(team.value)),
    box: JSON.parse(JSON.stringify(box.value)),
  }

  const tempBoxMember = buildPokemonMember(draftAction.value, {
    source: 'temp',
  })
  persistBox([...box.value, tempBoxMember])

  draftAction.value = {
    ...draftAction.value,
    type: 'edit',
    isBoxPokemon: true,
    isAddReplace: true,
    boxPokemonId: tempBoxMember.id,
  }

  enterSwapMode()
}

// Methods
function confirmDraft() {
  if (!draftAction.value) return

  if (!draftAction.value.pokemon) {
    handleDraftDeletion()
    cancel()
    return
  }

  const newMember = buildPokemonMember(draftAction.value, { source: 'team' })

  if (draftAction.value.type === 'add') {
    if (team.value.length < 6) {
      persistTeam([...team.value, newMember])
    } else {
      enterAddReplaceMode()
      return
    }
  } else if (draftAction.value.type === 'addToBox') {
    persistBox([...box.value, newMember])
  } else if (draftAction.value.type === 'edit') {
    if (draftAction.value.isBoxPokemon) {
      confirmBoxPokemonEdit()
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
}

function handleSoulLinkUndefeatGym(type) {
  const pid = viewedSoulLinkPlayerId.value
  const progress = getPlayerGymProgress(pid)
  updatePlayerGymProgress(pid, {
    defeatedGyms: progress.defeatedGyms.filter((g) => g !== type),
  })
}

function handleSoulLinkPersistPinnedGym(type) {
  updatePlayerGymProgress(viewedSoulLinkPlayerId.value, { pinnedGym: type })
}

// --- Soul Link delete handlers ---

function findLinkedDeleteTarget(playerId, memberId, rosterKey) {
  return findLinkedDeleteTargetUtil(
    playerId,
    memberId,
    rosterKey,
    getPairingContext(),
  )
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
  triggerSync()
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
  triggerSync()
}

function handleSoulLinkDeleteBoxPokemon(id) {
  const target = findLinkedDeleteTarget(viewedSoulLinkPlayerId.value, id, 'box')
  if (target) {
    linkedDeleteTarget.value = target
    return
  }
  removeSoulLinkRosterMember(viewedSoulLinkPlayerId.value, 'box', id)
  triggerSync()
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

function getPairingContext() {
  return {
    getPlayerRoster,
    updateRosterMember,
    partnerId: findPartnerPlayerId(),
  }
}

function reconcileSoulLinkPairing(playerId, memberId, rosterKey) {
  reconcileSoulLinkPairingUtil(
    playerId,
    memberId,
    rosterKey,
    getPairingContext(),
  )
}

function updateReciprocalSoulLinkPairId(previousMemberId, nextMemberId) {
  updateReciprocalSoulLinkPairIdUtil(
    previousMemberId,
    nextMemberId,
    getPairingContext(),
  )
}

function refreshSoulLinkDraftMetadata(member) {
  if (!draftAction.value) return
  draftAction.value.catchLocation = member?.catchLocation ?? null
  draftAction.value.pairId = member?.pairId ?? null
  draftAction.value.nickname = member?.nickname ?? null
}

// --- Soul Link confirm draft handler ---

function confirmSoulLinkBoxPokemonReplace(pid, newMember) {
  const roster = getSoulLinkRoster()

  if (draftAction.value.replaceTarget.startsWith('empty-')) {
    if (roster.team.length >= 6) return
    const boxedMember = roster.box.find(
      (m) => m.id === draftAction.value.boxPokemonId,
    )
    const movedMember = preserveSoulLinkPairingFields(newMember, boxedMember)
    addRosterMember(pid, 'team', movedMember)
    removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
    updateReciprocalSoulLinkPairId(
      draftAction.value.boxPokemonId,
      movedMember.id,
    )
    reconcileSoulLinkPairing(pid, movedMember.id, 'team')
    return
  }

  const boxedMember = roster.box.find(
    (m) => m.id === draftAction.value.boxPokemonId,
  )
  const replacedTeamMember = roster.team.find(
    (m) => m.id === draftAction.value.replaceTarget,
  )
  if (!boxedMember || !replacedTeamMember) return

  const nextTeamMember = preserveSoulLinkPairingFields(newMember, boxedMember)
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
    box: roster.box.map((m) =>
      m.id === draftAction.value.boxPokemonId ? boxMember : m,
    ),
  })

  updateReciprocalSoulLinkPairId(
    draftAction.value.boxPokemonId,
    nextTeamMember.id,
  )
  updateReciprocalSoulLinkPairId(draftAction.value.replaceTarget, boxMember.id)
  reconcileSoulLinkPairing(pid, nextTeamMember.id, 'team')
  reconcileSoulLinkPairing(pid, boxMember.id, 'box')
}

function confirmSoulLinkMemberUpdate(pid, rosterKey, memberId) {
  const uiMember = buildPokemonMember(draftAction.value, { id: memberId })
  const slMember = adaptUiMemberToSoulLinkMember(
    { ...uiMember, catchLocation: draftAction.value.catchLocation ?? null },
    pid,
  )
  const { id, ownerPlayerId, ...updates } = slMember
  updateRosterMember(pid, rosterKey, memberId, updates)
  reconcileSoulLinkPairing(pid, memberId, rosterKey)
}

function handleSoulLinkDraftDeletion(pid) {
  if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
    removeSoulLinkRosterMember(pid, 'team', draftAction.value.editId)
  } else if (
    draftAction.value.type === 'edit' &&
    draftAction.value.isBoxPokemon
  ) {
    removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
  }
}

function enterSoulLinkAddReplaceMode(pid) {
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
}

function handleSoulLinkConfirmEdit(pid, newMember) {
  if (draftAction.value.isBoxPokemon) {
    if (draftAction.value.replaceTarget) {
      confirmSoulLinkBoxPokemonReplace(pid, newMember)
    } else {
      confirmSoulLinkMemberUpdate(pid, 'box', draftAction.value.boxPokemonId)
    }
  } else {
    confirmSoulLinkMemberUpdate(pid, 'team', draftAction.value.editId)
  }
}

function handleSoulLinkConfirmDraft() {
  if (!draftAction.value) return
  const pid = viewedSoulLinkPlayerId.value

  if (!draftAction.value.pokemon) {
    handleSoulLinkDraftDeletion(pid)
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
      enterSoulLinkAddReplaceMode(pid)
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
    handleSoulLinkConfirmEdit(pid, newMember)
  }

  cancel()
  triggerSync()
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

function soulLinkMemberToUiFields(member) {
  return {
    name: member.speciesName,
    types: member.types,
    ability: member.ability,
    berry: member.berry,
    moves: member.moves,
    specialMove: member.specialMove,
    megaForm: member.megaForm,
    megaTypes: member.megaTypes,
    megaSpriteId: member.megaSpriteId,
    spriteVariant: member.spriteVariant,
    nickname: member.nickname,
    catchLocation: member.catchLocation,
    pairId: member.pairId,
  }
}

function handleSoulLinkBoxToTeamSwap(targetId, pid, roster) {
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

  const nextTeamMember = { ...inHandMember, id: generatePokemonId('team') }
  const newBoxMember = preserveSoulLinkPairingFields(
    adaptUiMemberToSoulLinkMember(
      {
        id: generatePokemonId('box'),
        ...soulLinkMemberToUiFields(targetMember),
      },
      pid,
    ),
    targetMember,
  )

  setPlayerRoster(pid, {
    team: roster.team.map((m) => (m.id === targetId ? nextTeamMember : m)),
    box: roster.box.map((m) => (m.id === boxPokemonId ? newBoxMember : m)),
  })

  updateReciprocalSoulLinkPairId(boxPokemonId, nextTeamMember.id)
  updateReciprocalSoulLinkPairId(targetId, newBoxMember.id)

  updateInHandPokemon({
    pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
    ...soulLinkMemberToUiFields(targetMember),
  })
  refreshSoulLinkDraftMetadata(targetMember)
  draftAction.value.boxPokemonId = newBoxMember.id
}

function handleSoulLinkTeamToBoxSwap(targetId, pid, roster) {
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
    return
  }

  const targetMember = roster.box.find((m) => m.id === targetId)
  if (!targetMember) return

  const newTeamMember = preserveSoulLinkPairingFields(
    adaptUiMemberToSoulLinkMember(
      {
        id: generatePokemonId('team'),
        ...soulLinkMemberToUiFields(targetMember),
      },
      pid,
    ),
    targetMember,
  )
  const nextBoxMember = { ...inHandMember, id: generatePokemonId('box') }

  setPlayerRoster(pid, {
    team: roster.team.map((m) => (m.id === teamPokemonId ? newTeamMember : m)),
    box: roster.box.map((m) => (m.id === targetId ? nextBoxMember : m)),
  })

  updateReciprocalSoulLinkPairId(targetId, newTeamMember.id)
  updateReciprocalSoulLinkPairId(teamPokemonId, nextBoxMember.id)

  updateInHandPokemon({
    pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
    ...soulLinkMemberToUiFields(targetMember),
  })
  refreshSoulLinkDraftMetadata(targetMember)
  draftAction.value.editId = newTeamMember.id
}

function handleSoulLinkImmediateSwap(targetId) {
  if (!draftAction.value?.pokemon) return

  const pid = viewedSoulLinkPlayerId.value
  const roster = getSoulLinkRoster()

  if (draftAction.value.isBoxPokemon) {
    handleSoulLinkBoxToTeamSwap(targetId, pid, roster)
  } else if (draftAction.value.isTeamPokemon) {
    handleSoulLinkTeamToBoxSwap(targetId, pid, roster)
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
          ...soulLinkMemberToUiFields(boxMember),
        },
        pid,
      ),
      boxMember,
    )

    const newBoxMember = preserveSoulLinkPairingFields(
      adaptUiMemberToSoulLinkMember(
        {
          id: generatePokemonId('box'),
          ...soulLinkMemberToUiFields(teamMember),
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
      nickname: teamMember.nickname || null,
    }
  } else {
    handleSoulLinkImmediateSwap(candidateId)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
  enterSwapMode()
}

function handleVisibilityChange() {
  if (document.hidden || isSoloMode.value || !hasRemoteSession.value) return
  syncSoulLinkSession().catch((err) =>
    console.error('Foreground re-sync failed:', err),
  )
}

onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const initialRunMode = loadCurrentRunMode()

  if (initialRunMode === RUN_MODES.SOLO) {
    loadData()
    return
  }

  await loadSoulLinkData()

  if (soulLinkSessionMetadata.value?.sessionId) {
    syncSoulLinkSession()
      .then(() => subscribeSoulLink())
      .catch((err) => console.error('Auto-sync on mount failed:', err))
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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

@media (min-width: 1024px) {
  .app-container {
    max-width: 1200px;
  }
}
</style>

<style>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--transition-base);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .reset-dialog,
.dialog-leave-active .reset-dialog {
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.dialog-enter-from .reset-dialog,
.dialog-leave-to .reset-dialog {
  opacity: 0;
  transform: scale(0.95);
}

.reset-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--space-6);
  min-width: 220px;
  text-align: center;
  position: relative;
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
  font-size: 1rem;
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

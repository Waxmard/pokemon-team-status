<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <div v-if="activeLoadError" class="load-error-banner" @click="retryLoad">
        Failed to load saved data. Tap to retry.
      </div>
      <AppHeader>
        <template #actions>
          <button @click="showResetDialog = true" aria-label="Options">⚙️</button>
          <button @click="showSoloDialog = true" aria-label="Solo Run">⚔️</button>
          <button @click="showSoulLinkDialog = true" aria-label="Soul Link">🔗</button>
        </template>
        <template #title>
          <span v-if="isSoloMode" class="title-player-row">
            <label class="title-player-field">
              <input
                ref="soloRunNameInput"
                :value="soloRunDisplayName"
                :size="Math.max(soloRunDisplayName.length, 1)"
                class="title-player-input"
                type="text"
                maxlength="32"
                placeholder="Weakness Calculator"
                aria-label="Solo run name"
                @blur="handleRenameSoloRun"
                @focus="soloRunNameInput?.select()"
              />
            </label>
          </span>
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
        </template>
      </AppHeader>

      <template v-if="ready">
      <template v-if="isSoloMode">
        <TeamSection :team="team" :box="box" :dead="dead" :has-death-box="true" :death-box-mode="deathBoxMode"
          @confirmDraft="confirmDraft" @immediateSwap="handleImmediateSwap" :generation-rules="generationRules"
          @deleteTeamPokemon="deleteTeamPokemon" @deleteBoxPokemon="deleteBoxPokemon" @cancelSwap="handleCancelSwap"
          @deletePokemon="handleDeleteFromDraft" @swapSuggestion="handleSwapSuggestion"
          @killPokemon="handleSoloKillPokemon" @revivePokemon="handleSoloRevivePokemon"
          @deleteDeadPokemon="handleSoloDeleteDeadPokemon" @exitDeathBox="deathBoxMode = false" />

        <GymColumns :team="team" :box="box" :remainingGyms="remainingGyms" :defeatedGymsList="defeatedGymsList"
          :defeated-gym-types="defeatedGyms" :pinned-type="pinnedGym" :persist-pinned-gym="persistPinnedGym" :generation-rules="generationRules"
          :draftActive="hasDraft"
          @defeatGym="defeatGym" @undefeatGym="undefeatGym" @swapSuggestion="handleSwapSuggestion" />
      </template>

      <SoulLinkShell
        v-else-if="!isSoloMode"
        :generation-rules="soulLinkGenerationRules"
        :viewed-player-board="viewedSoulLinkPlayerBoard"
        :draft-active="hasDraft"
        :persist-pinned-gym="handleSoulLinkPersistPinnedGym"
        :partner-roster="soulLinkPartnerRoster"
        :player-id="viewedSoulLinkPlayerId"
        :death-box-mode="deathBoxMode"
        @confirmDraft="handleSoulLinkConfirmDraft"
        @immediateSwap="handleSoulLinkImmediateSwap"
        @deleteTeamPokemon="handleSoulLinkDeleteTeamPokemon"
        @deleteBoxPokemon="handleSoulLinkDeleteBoxPokemon"
        @cancelSwap="handleSoulLinkCancelSwap"
        @deletePokemon="handleSoulLinkDeleteFromDraft"
        @swapSuggestion="handleSoulLinkSwapSuggestion"
        @defeatGym="handleSoulLinkDefeatGym"
        @undefeatGym="handleSoulLinkUndefeatGym"
        @killPokemon="(e) => { handleSoulLinkKillPokemon(e); deathBoxMode = true }"
        @revivePokemon="(e) => { handleSoulLinkRevivePokemon(e); deathBoxMode = false }"
        @exitDeathBox="deathBoxMode = false"
        @deleteDeadPokemon="handleSoulLinkDeleteDeadPokemon"
      />
      </template>
    </div>
  </n-config-provider>

  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="showResetDialog" class="reset-overlay" @click.self="showResetDialog = false">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Options</h3>
        <div class="reset-dialog-options">
          <DialogActionSection>
            <button class="reset-option" @click="toggleGenerationRules">
              {{ generationRulesLabel }}
            </button>
          </DialogActionSection>
          <DialogActionSection v-if="allInactiveRuns.length > 0">
            <div class="reset-option-group">
              <div class="my-runs-header">Switch Run</div>
              <button
                v-for="run in allInactiveRuns"
                :key="run.id"
                class="reset-option"
                @click="run.type === 'solo' ? handleSwitchSoloRun(run.id) : handleSwitchRun(run.id)"
              >
                {{ run.label }}
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection>
            <div class="reset-option-group">
              <button class="reset-option" @click="resetPokemon">
                Reset Team & Box
              </button>
              <button class="reset-option" @click="resetGyms">
                Reset Gyms
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection v-if="hasSoloRemoteSession && isSoloMode">
            <button class="reset-option" @click="handleLeaveSoloSession">
              Leave This Run
            </button>
          </DialogActionSection>
          <DialogActionSection v-if="currentActiveRunId">
            <div class="reset-option-group">
              <button class="reset-option reset-option-danger" @click="deleteRunTarget = currentActiveRunId; showResetDialog = false">
                Delete This Run
              </button>
            </div>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel" @click="showResetDialog = false">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="deleteRunTarget" class="reset-overlay"
         @click.self="deleteRunTarget = null">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Delete Run</h3>
        <p class="linked-delete-text">
          This run and all its data will be permanently deleted.
        </p>
        <div class="reset-dialog-options">
          <DialogActionSection>
            <button class="reset-option reset-option-danger"
                    @click="isSoloDeleteTarget ? handleDeleteSoloRun(deleteRunTarget) : handleDeleteRun(deleteRunTarget)">
              Delete
            </button>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel"
                @click="deleteRunTarget = null">✕</button>
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
          <DialogActionSection>
            <button class="reset-option reset-option-danger"
                    @click="confirmLinkedDelete">
              Delete Both
            </button>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel"
                @click="linkedDeleteTarget = null">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <SessionDialog
    v-model:visible="showSoulLinkDialog"
    title="Soul Link"
    :session-code="soulLinkSessionMetadata?.inviteCode"
    :copy-label="copyLabel"
    :has-remote-session="hasRemoteSession && isSupabaseAvailable"
    :show-view-player="!isSoloMode"
    :other-player-name="otherSoulLinkPlayerName"
    new-run-label="New Soul Link Run"
    join-run-label="Join Soul Link Run"
    :is-sync-available="isSupabaseAvailable"
    :session-action-pending="sessionActionPending"
    :join-error="soulLinkJoinError"
    @copy-code="copyInviteCode"
    @view-death-box="handleViewDeathBox('soulLink')"
    @view-other-player="handleViewOtherSoulLinkPlayer"
    @new-run="startNewRun(RUN_MODES.SOUL_LINK)"
    @join-session="handleJoinSession"
  />

  <SessionDialog
    v-model:visible="showSoloDialog"
    title="Solo Run"
    :session-code="soloInviteCode"
    :copy-label="soloCopyLabel"
    :has-remote-session="hasSoloRemoteSession && isSoloSyncAvailable"
    new-run-label="New Solo Run"
    join-run-label="Join Solo Run"
    :is-sync-available="isSoloSyncAvailable"
    :session-action-pending="sessionActionPending"
    :join-error="soloJoinError"
    @copy-code="copySoloInviteCode"
    @view-death-box="handleViewDeathBox('solo')"
    @new-run="startNewRun(RUN_MODES.SOLO)"
    @join-session="handleSoloJoinSession"
  />
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import DialogActionSection from './components/DialogActionSection.vue'
import GymColumns from './components/GymColumns.vue'
import SessionDialog from './components/SessionDialog.vue'
import SoulLinkShell from './components/SoulLinkShell.vue'
import TeamSection from './components/TeamSection.vue'
import { useDraftAction } from './composables/useDraftAction.js'
import { useRunModeStore } from './composables/useRunModeStore.js'
import {
  registerSoloSyncScheduler,
  useRunStore,
} from './composables/useRunStore.js'
import { useSoloRunManager } from './composables/useSoloRunManager.js'
import { useSoloSync } from './composables/useSoloSync.js'
import { useSoulLinkHandlers } from './composables/useSoulLinkHandlers.js'
import { useSoulLinkRunManager } from './composables/useSoulLinkRunManager.js'
import { useSoulLinkStore } from './composables/useSoulLinkStore.js'
import { getPokemonDataForRules } from './data/pokemon.js'
import { GENERATION_RULESETS, getAllTypesForRules } from './data/types.js'
import { supabase } from './services/supabaseClient.js'
import { themeOverrides } from './theme/colors.js'
import { copyToClipboard } from './utils/clipboard.js'
import {
  sanitizeDraftActionForRules,
  sanitizePokemonCollectionForRules,
} from './utils/generationRules.js'
import { buildPokemonMember, pickMemberFields } from './utils/pokemon.js'
import {
  isEmptySoloRun,
  mapSoloRunStateToPersistedSnapshot,
  RUN_MODES,
} from './utils/runSnapshot.js'
import { resolveMostRecentRunMode } from './utils/runStartup.js'
import {
  adaptSoulLinkMemberToUiMember,
  buildSoulLinkPlayerBoard,
} from './utils/soulLinkUi.js'
import { calculateBerryTiebreaker, calculateScore } from './utils/typeCalc.js'

const {
  runState: soloRunState,
  team,
  defeatedGyms,
  box,
  dead,
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
  killTeamPokemon,
  killBoxPokemon,
  revivePokemon,
  deleteDeadPokemon,
  defeatGym,
  undefeatGym,
  persistPinnedGym,
  applyRemoteSnapshot: applySoloRemoteSnapshot,
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
  getFullPlayerRoster,
  setPlayerRoster: setSoulLinkPlayerRoster,
  resetPlayerRoster,
  resetPlayerGymProgress,
  createSession: createSoulLinkSession,
  joinSession: joinSoulLinkSession,
  updateRosterMember: updateSoulLinkRosterMember,
  removeRosterMember: removeSoulLinkRosterMember,
  syncSession: syncSoulLinkSession,
  pullState: pullSoulLinkState,
  pushState: pushSoulLinkState,
  subscribeToSessionUpdates: subscribeSoulLink,
  unsubscribeFromSession: unsubscribeSoulLink,
  buildPersistableSnapshot: buildSoulLinkSnapshot,
} = useSoulLinkStore()

const {
  draftAction,
  swapMode,
  startEditBox,
  enterSwapMode,
  exitSwapMode,
  sanitizeDraft,
  updateBoxPokemonId,
  updateEditId,
  convertToBoxEdit,
  updateInHandPokemon,
  cancel,
} = useDraftAction()

const { currentRunMode, loadCurrentRunMode, setCurrentRunMode } =
  useRunModeStore()

const {
  runList,
  activeRunId,
  activeRunSummary,
  loadRunIndex,
  saveCurrentRunToIndex,
  switchToRun,
  registerNewRun,
  deleteRun,
} = useSoulLinkRunManager()

const {
  initSyncSession: initSoloSyncSession,
  syncSession: syncSoloSession,
  subscribeToSession: subscribeSolo,
  unsubscribeFromSession: unsubscribeSolo,
  scheduleAutoSync: scheduleSoloAutoSync,
  inviteCode: soloInviteCode,
  sessionId: soloSessionId,
  isAvailable: isSoloSyncAvailable,
  createSession: createSoloSession,
  joinSession: joinSoloSession,
  leaveSession: leaveSoloSession,
  deleteRemoteSession: deleteSoloRemoteSession,
} = useSoloSync()

registerSoloSyncScheduler(scheduleSoloAutoSync)

const {
  runList: soloRunList,
  activeRunId: soloActiveRunId,
  activeRunSummary: soloActiveRunSummary,
  loadRunIndex: loadSoloRunIndex,
  saveCurrentRunToIndex: saveSoloRunToIndex,
  switchToRun: switchToSoloRun,
  registerNewRun: registerNewSoloRun,
  deleteRun: deleteSoloRun,
  renameRun: renameSoloRun,
  updateRunMeta: updateSoloRunMeta,
} = useSoloRunManager()

const showResetDialog = ref(false)
const showSoloDialog = ref(false)
const deleteRunTarget = ref(null)
const showSoulLinkDialog = ref(false)
const deathBoxMode = ref(false)

function dismissAllDialogs() {
  deathBoxMode.value = false
  showResetDialog.value = false
  showSoloDialog.value = false
  showSoulLinkDialog.value = false
}

function buildSoloSessionCallbacks() {
  return {
    loadSessionId: () => {
      const run = soloRunList.value.find((r) => r.id === soloActiveRunId.value)
      return run?.sessionId ?? null
    },
    saveSessionId: (id, code) =>
      updateSoloRunMeta(soloActiveRunId.value, {
        sessionId: id,
        inviteCode: code,
      }),
  }
}

function setupSoloSync() {
  if (!isSoloSyncAvailable) return
  initSoloSyncSession(
    () => buildSoloSnapshot(),
    (s) => applySoloRemoteSnapshot(s),
    buildSoloSessionCallbacks(),
  )
    .then(() => subscribeSolo())
    .catch((err) => console.error('Failed to init solo sync session:', err))
}

const playerNameInput = ref(null)
const soloRunNameInput = ref(null)
const ready = ref(false)
const sessionActionPending = ref(false)
const soloJoinError = ref(null)
const soulLinkJoinError = ref(null)
const copyLabel = ref('tap to copy')
const soloCopyLabel = ref('tap to copy')
const isSoloMode = computed(() => currentRunMode.value === RUN_MODES.SOLO)
const currentActiveRunId = computed(() =>
  isSoloMode.value ? soloActiveRunId.value : activeRunId.value,
)
const isSupabaseAvailable = !!supabase
const hasRemoteSession = computed(
  () => !isSoloMode.value && !!soulLinkSessionMetadata.value?.sessionId,
)
const hasSoloRemoteSession = computed(() => !!soloSessionId.value)
const appTitle = computed(() =>
  isSoloMode.value ? 'Weakness Calculator' : viewedSoulLinkPlayerName.value,
)

const soloRunDisplayName = computed(() => {
  const activeRun = soloRunList.value.find(
    (r) => r.id === soloActiveRunId.value,
  )
  return activeRun?.name || 'Weakness Calculator'
})

const activeGenerationRules = computed(() =>
  isSoloMode.value ? generationRules.value : soulLinkGenerationRules.value,
)

const inactiveRuns = computed(() =>
  runList.value.filter((r) => r.id !== activeRunId.value),
)

const inactiveSoloRuns = computed(() =>
  soloRunList.value.filter((r) => r.id !== soloActiveRunId.value),
)

const allInactiveRuns = computed(() => {
  const soloSource = isSoloMode.value
    ? inactiveSoloRuns.value
    : soloRunList.value
  const soulLinkSource = isSoloMode.value ? runList.value : inactiveRuns.value
  const solo = soloSource.map((r) => ({
    ...r,
    type: 'solo',
    label: r.name || 'Weakness Calculator',
  }))
  const soulLink = soulLinkSource.map((r) => ({
    ...r,
    type: 'soul-link',
    label: r.name || r.playerNames?.join(' & ') || 'Soul Link',
  }))
  return [...solo, ...soulLink]
})

const isSoloDeleteTarget = computed(() =>
  soloRunList.value.some((r) => r.id === deleteRunTarget.value),
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
  } else {
    resetPlayerRoster(viewedSoulLinkPlayerId.value)
  }
  cancel()
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
  const roster = getFullPlayerRoster(partnerId)
  return [...roster.team, ...roster.box, ...(roster.dead ?? [])]
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

const {
  linkedDeleteTarget,
  soulLinkSwapOriginalRoster,
  handleSoulLinkConfirmDraft: confirmSoulLinkDraft,
  handleSoulLinkImmediateSwap,
  handleSoulLinkCancelSwap,
  handleSoulLinkSwapSuggestion,
  handleSoulLinkDeleteTeamPokemon,
  handleSoulLinkDeleteBoxPokemon,
  handleSoulLinkDeleteFromDraft,
  handleSoulLinkDefeatGym,
  handleSoulLinkUndefeatGym,
  handleSoulLinkPersistPinnedGym,
  confirmLinkedDelete,
  handleSoulLinkKillPokemon,
  handleSoulLinkRevivePokemon,
  handleSoulLinkDeleteDeadPokemon,
} = useSoulLinkHandlers(
  viewedSoulLinkPlayerId,
  soulLinkGenerationRules,
  soulLinkPlayers,
)

function handleSoulLinkConfirmDraft() {
  const result = confirmSoulLinkDraft()
  if (result?.placedInDead) {
    deathBoxMode.value = true
  }
}

function handleViewDeathBox(mode) {
  deathBoxMode.value = true
  if (mode === 'soulLink') showSoulLinkDialog.value = false
  else if (mode === 'solo') showSoloDialog.value = false
}

async function createFreshSoloRun() {
  await startNewSoloRun()
  setCurrentRunMode(RUN_MODES.SOLO)
  const freshSnapshot = buildSoloSnapshot()
  freshSnapshot.name = null
  await registerNewSoloRun(freshSnapshot)
  dismissAllDialogs()
  setupSoloSync()
}

async function handleLeaveSoloSession() {
  await clearTransientUiState()
  unsubscribeSolo()
  await leaveSoloSession()

  const result = await deleteSoloRun(soloActiveRunId.value)

  if (!result?.wasActive) return

  if (result.nextRunId) {
    await switchToSoloRunCore(result.nextRunId, null)
  } else {
    await createFreshSoloRun()
  }
}

function handleViewOtherSoulLinkPlayer() {
  const other = soulLinkPlayers.value.find(
    (player) => player.id !== viewedSoulLinkPlayerId.value,
  )
  if (other) {
    setCachedPlayerSlot(other.id)
  }
  dismissAllDialogs()
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

function handleRenameSoloRun(event) {
  const trimmed = event.target.value.trim()
  if (!soloActiveRunId.value) return
  const currentName = soloRunDisplayName.value
  // If cleared or set to default, store null (shows placeholder)
  const nextName =
    !trimmed || trimmed === 'Weakness Calculator' ? null : trimmed
  const currentStored =
    currentName === 'Weakness Calculator' ? null : currentName
  if (nextName === currentStored) return
  renameSoloRun(soloActiveRunId.value, nextName)
}

function selectPlayerNameInput() {
  playerNameInput.value?.select()
}

// --- Session management ---

async function joinSessionFlow({
  saveCurrentRun,
  unsubscribe,
  joinSession,
  mode,
  registerRun,
  subscribe,
  clearUI,
}) {
  sessionActionPending.value = true
  try {
    if (saveCurrentRun) await saveCurrentRun()
    unsubscribe()
    await joinSession()
    setCurrentRunMode(mode)
    await registerRun()
    subscribe()
    clearUI()
  } finally {
    sessionActionPending.value = false
  }
}

async function handleJoinSession(code) {
  soulLinkJoinError.value = null
  try {
    await joinSessionFlow({
      saveCurrentRun: isSoloMode.value
        ? null
        : () => saveCurrentRunToIndex(buildSoulLinkSnapshot()),
      unsubscribe: unsubscribeSoulLink,
      joinSession: () => joinSoulLinkSession(code),
      mode: RUN_MODES.SOUL_LINK,
      registerRun: () => registerNewRun(buildSoulLinkSnapshot()),
      subscribe: subscribeSoulLink,
      clearUI: () => {
        showSoulLinkDialog.value = false
      },
    })
  } catch (error) {
    console.error('Failed to join session:', error)
    soulLinkJoinError.value = error?.message || 'Failed to join session'
  }
}

async function handleSwitchRun(runId) {
  if (runId === activeRunId.value && !isSoloMode.value) return
  await clearTransientUiState()
  unsubscribeSoulLink()
  await switchToRun(runId, isSoloMode.value ? null : buildSoulLinkSnapshot())
  await loadSoulLinkData()
  setCurrentRunMode(RUN_MODES.SOUL_LINK)

  if (soulLinkSessionMetadata.value?.sessionId) {
    syncSoulLinkSession()
      .then(() => subscribeSoulLink())
      .catch((err) => console.error('Sync after run switch failed:', err))
  } else if (isSupabaseAvailable) {
    createSoulLinkSession()
      .then(() => subscribeSoulLink())
      .catch((err) =>
        console.error('Session creation after run switch failed:', err),
      )
  }

  dismissAllDialogs()
}

async function handleDeleteRun(runId) {
  const { wasActive, nextRunId } = await deleteRun(runId)
  deleteRunTarget.value = null

  if (!wasActive) return

  if (nextRunId) {
    await handleSwitchRun(nextRunId)
  } else {
    await switchToSoloMode()
  }
}

function copyInviteCode() {
  copyToClipboard(soulLinkSessionMetadata.value?.inviteCode, copyLabel)
}

function copySoloInviteCode() {
  copyToClipboard(soloInviteCode.value, soloCopyLabel)
}

async function handleSoloJoinSession(code) {
  soloJoinError.value = null
  const previousRunId = soloActiveRunId.value
  const previousRunIsEmpty = isEmptySoloRun(buildSoloSnapshot())
  let joinedRunName = null
  let joinedSessionId = null
  let joinedInviteCode = null
  try {
    await joinSessionFlow({
      saveCurrentRun:
        isSoloMode.value && soloActiveRunId.value && !previousRunIsEmpty
          ? () => saveSoloRunToIndex(buildSoloSnapshot())
          : null,
      unsubscribe: unsubscribeSolo,
      joinSession: async () => {
        const result = await joinSoloSession(code)
        joinedRunName = result.state?.name ?? null
        joinedSessionId = result.sessionId
        joinedInviteCode = result.inviteCode
      },
      mode: RUN_MODES.SOLO,
      registerRun: async () => {
        const snapshot = buildSoloSnapshot()
        snapshot.name = joinedRunName
        await registerNewSoloRun(snapshot)
        await updateSoloRunMeta(soloActiveRunId.value, {
          sessionId: joinedSessionId,
          inviteCode: joinedInviteCode,
        })
      },
      subscribe: subscribeSolo,
      clearUI: () => {
        showSoloDialog.value = false
      },
    })

    // Clean up the empty default run that was created on first load
    if (
      previousRunIsEmpty &&
      previousRunId &&
      previousRunId !== soloActiveRunId.value
    ) {
      await deleteSoloRun(previousRunId)
    }
  } catch (error) {
    console.error('Failed to join solo session:', error)
    soloJoinError.value = error?.message || 'Failed to join'
  }
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
    if (!isSoloMode.value && !soulLinkSwapOriginalRoster.value) {
      soulLinkSwapOriginalRoster.value = getPlayerRoster(
        viewedSoulLinkPlayerId.value,
      )
    }
  } else {
    swapOriginalState.value = null
  }
})

watch(generationRules, (ruleset) => {
  sanitizeDraft((draft) => sanitizeDraftActionForRules(draft, ruleset))

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
  dismissAllDialogs()
}

async function startNewRun(mode) {
  await clearTransientUiState()
  unsubscribeSoulLink()
  unsubscribeSolo()

  if (mode === RUN_MODES.SOLO) {
    // Save current solo run before starting a new one
    if (isSoloMode.value && soloActiveRunId.value) {
      await saveSoloRunToIndex(buildSoloSnapshot())
    }
    await startNewSoloRun()
    setCurrentRunMode(RUN_MODES.SOLO)
    const freshSnapshot = buildSoloSnapshot()
    freshSnapshot.name = null
    await registerNewSoloRun(freshSnapshot)
    if (isSoloSyncAvailable) {
      await deleteSoloRemoteSession()
    }
    setupSoloSync()
  } else {
    if (!isSoloMode.value) {
      await saveCurrentRunToIndex(buildSoulLinkSnapshot())
    }
    startNewLocalSoulLinkRun()
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    await registerNewRun(buildSoulLinkSnapshot())
    if (isSupabaseAvailable) {
      try {
        await createSoulLinkSession()
        subscribeSoulLink()
      } catch (err) {
        console.error('Failed to create session for new Soul Link run:', err)
      }
    }
  }

  dismissAllDialogs()
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
  }
  return team.value
}

// Computed
const hasDraft = computed(() => {
  return (
    draftAction.value?.pokemon &&
    (draftAction.value.type === 'add' ||
      (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon))
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
  updateInHandPokemon({
    pokemonData: getRulesetPokemonData(targetPokemon.name),
    ...pickMemberFields(targetPokemon),
  })
}

async function handleBoxToTeamSwap(targetId, inHandPokemon) {
  const boxPokemonId = draftAction.value.boxPokemonId

  if (targetId === null) {
    if (team.value.length >= 6) return
    const newTeamMember = buildPokemonMember(draftAction.value, {
      source: 'team',
      id: boxPokemonId,
    })
    await Promise.all([
      persistTeam([...team.value, newTeamMember]),
      persistBox(box.value.filter((p) => p.id !== boxPokemonId)),
    ])
    exitSwapMode()
    return
  }

  const targetPokemon = team.value.find((p) => p.id === targetId)
  if (!targetPokemon) return

  const newTeam = team.value.map((p) =>
    p.id === targetId ? { ...inHandPokemon, id: boxPokemonId } : p,
  )

  const newBoxMember = buildPokemonMember(targetPokemon, {
    source: 'box',
    id: targetId,
  })
  await Promise.all([
    persistTeam(newTeam),
    persistBox([
      newBoxMember,
      ...box.value.filter((p) => p.id !== boxPokemonId),
    ]),
  ])

  swapInHandToTarget(targetPokemon)
  updateBoxPokemonId(newBoxMember.id)
}

async function handleTeamToBoxSwap(targetId, inHandPokemon) {
  const teamPokemonId = draftAction.value.editId

  if (targetId === null) {
    const newBoxMember = buildPokemonMember(draftAction.value, {
      source: 'box',
      id: teamPokemonId,
    })
    await Promise.all([
      persistBox([...box.value, newBoxMember]),
      persistTeam(team.value.filter((p) => p.id !== teamPokemonId)),
    ])
    exitSwapMode()
    return
  }

  const targetPokemon = box.value.find((p) => p.id === targetId)
  if (!targetPokemon) return

  const newBox = box.value.map((p) =>
    p.id === targetId ? { ...inHandPokemon, id: teamPokemonId } : p,
  )

  const newTeamMember = buildPokemonMember(targetPokemon, {
    source: 'team',
    id: targetId,
  })
  await Promise.all([
    persistBox(newBox),
    persistTeam(
      team.value.map((p) => (p.id === teamPokemonId ? newTeamMember : p)),
    ),
  ])

  swapInHandToTarget(targetPokemon)
  updateEditId(newTeamMember.id)
}

// Handle immediate swap when clicking a slot in swap mode
async function handleImmediateSwap(targetId) {
  if (!draftAction.value?.pokemon) return

  const inHandPokemon = buildPokemonMember(draftAction.value)

  if (draftAction.value.isBoxPokemon) {
    await handleBoxToTeamSwap(targetId, inHandPokemon)
  } else if (draftAction.value.isTeamPokemon) {
    await handleTeamToBoxSwap(targetId, inHandPokemon)
  }
}

async function handleSwapSuggestion({ currentId, candidateId, isTeamMember }) {
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
    const newTeamMember = buildPokemonMember(boxPokemon, {
      source: 'team',
      id: candidateId,
    })
    // A goes to box where B was
    const newBoxMember = buildPokemonMember(teamPokemon, {
      source: 'box',
      id: currentId,
    })

    await Promise.all([
      persistTeam(
        team.value.map((p) => (p.id === currentId ? newTeamMember : p)),
      ),
      persistBox(
        box.value.map((p) => (p.id === candidateId ? newBoxMember : p)),
      ),
    ])

    // Set A as "in hand" box Pokemon for chain swapping
    startEditBox({
      id: newBoxMember.id,
      pokemonData: getRulesetPokemonData(teamPokemon.name),
      ...pickMemberFields(teamPokemon),
      moves: [...(teamPokemon.moves || [])],
    })
  } else {
    // Box editing: handleImmediateSwap already sets correct perspective
    await handleImmediateSwap(candidateId)
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

  const newBox = [...box.value]
  newBox[boxIndex] = updatedPokemon
  persistBox(newBox)
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

  convertToBoxEdit(tempBoxMember.id)
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
    persistBox([newMember, ...box.value])
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

function handleSoloKillPokemon({ id, rosterKey }) {
  if (rosterKey === 'team') killTeamPokemon(id)
  else killBoxPokemon(id)
  cancel()
}

function handleSoloRevivePokemon(memberId) {
  revivePokemon(memberId)
}

function handleSoloDeleteDeadPokemon({ id }) {
  deleteDeadPokemon(id)
  cancel()
}

function buildSoloSnapshot() {
  const snapshot = mapSoloRunStateToPersistedSnapshot(soloRunState.value)
  snapshot.name = soloActiveRunSummary.value?.name ?? null
  return snapshot
}

async function switchToSoloRunCore(runId, currentSnapshot) {
  await clearTransientUiState()
  unsubscribeSoulLink()
  unsubscribeSolo()
  const snapshot = await switchToSoloRun(runId, currentSnapshot)
  if (snapshot) {
    await loadData()
  }
  setCurrentRunMode(RUN_MODES.SOLO)
  dismissAllDialogs()
  setupSoloSync()
}

async function handleSwitchSoloRun(runId) {
  if (runId === soloActiveRunId.value && isSoloMode.value) return
  await switchToSoloRunCore(
    runId,
    isSoloMode.value ? buildSoloSnapshot() : null,
  )
}

async function handleDeleteSoloRun(runId) {
  const result = await deleteSoloRun(runId)
  deleteRunTarget.value = null

  if (!result?.wasActive) return

  if (result.nextRunId) {
    await switchToSoloRunCore(result.nextRunId, null)
  } else if (activeRunId.value) {
    // No more solo runs — switch to the active soul link run
    await clearTransientUiState()
    unsubscribeSolo()
    await switchToRun(activeRunId.value, null)
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    await loadSoulLinkData()
    dismissAllDialogs()
    if (soulLinkSessionMetadata.value?.sessionId) {
      syncSoulLinkSession()
        .then(() => subscribeSoulLink())
        .catch((err) =>
          console.error('Sync after last solo delete failed:', err),
        )
    }
  } else {
    // No runs of any kind — create a fresh solo run
    await createFreshSoloRun()
  }
}

function handleVisibilityChange() {
  if (document.hidden) return
  if (isSoloMode.value) {
    if (hasSoloRemoteSession.value) {
      syncSoloSession().catch((err) =>
        console.error('Solo foreground re-sync failed:', err),
      )
    }
  } else if (hasRemoteSession.value) {
    syncSoulLinkSession().catch((err) =>
      console.error('Foreground re-sync failed:', err),
    )
  }
}

async function restoreMostRecentRun(preferredMode) {
  await Promise.all([loadRunIndex(), loadSoloRunIndex()])

  const startupMode = resolveMostRecentRunMode({
    preferredMode,
    soloRun: soloActiveRunSummary.value,
    soulLinkRun: activeRunSummary.value,
  })

  if (startupMode === RUN_MODES.SOUL_LINK && activeRunId.value) {
    await switchToRun(activeRunId.value, null)
    setCurrentRunMode(RUN_MODES.SOUL_LINK)
    await loadSoulLinkData()
    return RUN_MODES.SOUL_LINK
  }

  if (soloActiveRunId.value) {
    await switchToSoloRun(soloActiveRunId.value, null)
  }

  setCurrentRunMode(RUN_MODES.SOLO)
  await loadData()
  return RUN_MODES.SOLO
}

onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const initialRunMode = loadCurrentRunMode()

  const startupMode = await restoreMostRecentRun(initialRunMode)

  // Init sync session and sync before showing content so session metadata
  // and merged state are final on first render (avoids team reorder flash)
  if (startupMode === RUN_MODES.SOLO && isSoloSyncAvailable) {
    try {
      await initSoloSyncSession(
        () => buildSoloSnapshot(),
        (snapshot) => applySoloRemoteSnapshot(snapshot),
        buildSoloSessionCallbacks(),
      )
    } catch (err) {
      console.error('Failed to init solo sync session:', err)
    }
    if (hasSoloRemoteSession.value) {
      try {
        await syncSoloSession()
        await saveSoloRunToIndex(buildSoloSnapshot())
        subscribeSolo()
      } catch (err) {
        console.error('Solo auto-sync on mount failed:', err)
      }
    }
  }

  ready.value = true

  if (
    startupMode !== RUN_MODES.SOLO &&
    soulLinkSessionMetadata.value?.sessionId
  ) {
    syncSoulLinkSession()
      .then(() => subscribeSoulLink())
      .catch((err) => console.error('Auto-sync on mount failed:', err))
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  unsubscribeSolo()
})

if (import.meta.env.DEV) {
  import('./utils/devTools.js').then(({ createDevTools }) => {
    window.__sl = createDevTools({
      players: soulLinkPlayers,
      rosters: soulLinkRosters,
      sessionMetadata: soulLinkSessionMetadata,
      updateRosterMember: updateSoulLinkRosterMember,
      removeRosterMember: removeSoulLinkRosterMember,
      setPlayerRoster: setSoulLinkPlayerRoster,
      pullState: pullSoulLinkState,
      pushState: pushSoulLinkState,
    })
  })
}
</script>

<style scoped>
.app-container {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn var(--transition-slow) ease forwards;
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

.title-player-input {
  width: auto;
  max-width: min(100%, 24rem);
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
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

@media (orientation: landscape) and (max-height: 500px) {
  .app-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
    max-width: 100%;
  }

  .app-container :deep(.app-header) {
    flex: 0 0 100%;
    margin-bottom: var(--space-2);
  }

  .app-container :deep(.app-header .header-actions) {
    justify-self: center;
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

.session-join-error {
  color: var(--color-danger);
  font-size: 0.8rem;
  margin-top: var(--space-1);
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

.my-runs-header {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
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

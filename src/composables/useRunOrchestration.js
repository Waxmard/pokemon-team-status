import { computed, onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'
import { copyToClipboard } from '../utils/clipboard.js'
import {
  isEmptySoloRun,
  mapSoloRunStateToPersistedSnapshot,
  RUN_MODES,
} from '../utils/runSnapshot.js'
import { resolveMostRecentRunMode } from '../utils/runStartup.js'
import { useDraftAction } from './useDraftAction.js'
import { useRunModeStore } from './useRunModeStore.js'
import { registerSoloSyncScheduler, useRunStore } from './useRunStore.js'
import { useSoloRunManager } from './useSoloRunManager.js'
import { useSoloSync } from './useSoloSync.js'
import { useSoulLinkRunManager } from './useSoulLinkRunManager.js'
import { useSoulLinkStore } from './useSoulLinkStore.js'

export function useRunOrchestration({
  viewedSoulLinkPlayerId,
  cancelSwap,
  resetSwapOriginal,
  handleSoulLinkCancelSwap,
  soulLinkSwapOriginalRoster,
}) {
  const {
    runState: soloRunState,
    loadData,
    loadError,
    startNewSoloRun,
    resetTeamAndBox,
    resetGyms: resetGymsInStore,
    applyRemoteSnapshot: applySoloRemoteSnapshot,
  } = useRunStore()

  const { cancel, swapMode } = useDraftAction()

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
    players: soulLinkPlayers,
    sessionMetadata: soulLinkSessionMetadata,
    loadSoulLinkData,
    loadError: soulLinkLoadError,
    createSession: createSoulLinkSession,
    syncSession: syncSoulLinkSession,
    subscribeToSessionUpdates: subscribeSoulLink,
    leaveSession: leaveSoulLinkSession,
    unsubscribeFromSession: unsubscribeSoulLink,
    updatePlayer: updateSoulLinkPlayer,
    setCachedPlayerSlot,
    startNewLocalSoulLinkRun,
    joinSession: joinSoulLinkSession,
    resetPlayerRoster,
    resetPlayerGymProgress,
    buildPersistableSnapshot: buildSoulLinkSnapshot,
  } = useSoulLinkStore()

  const {
    initSyncSession: initSoloSyncSession,
    syncSession: syncSoloSession,
    subscribeToSession: subscribeSolo,
    unsubscribeFromSession: unsubscribeSolo,
    scheduleAutoSync: scheduleSoloAutoSync,
    inviteCode: soloInviteCode,
    sessionId: soloSessionId,
    isAvailable: isSoloSyncAvailable,
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

  const viewedSoulLinkPlayer = computed(() => {
    return (
      soulLinkPlayers.value.find(
        (player) => player.id === viewedSoulLinkPlayerId.value,
      ) ?? soulLinkPlayers.value[0]
    )
  })

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
    resetOptionsJoinState()
  }

  function buildSoloSessionCallbacks() {
    return {
      loadSessionId: () => {
        const run = soloRunList.value.find(
          (r) => r.id === soloActiveRunId.value,
        )
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

  const ready = ref(false)
  const sessionActionPending = ref(false)
  const showOptionsJoinInput = ref(false)
  const optionsJoinCode = ref('')

  const joinRunError = ref(null)
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
  const hasSoloRemoteSession = computed(
    () => isSoloMode.value && !!soloSessionId.value,
  )

  const soloRunDisplayName = computed(() => {
    const activeRun = soloRunList.value.find(
      (r) => r.id === soloActiveRunId.value,
    )
    return activeRun?.name || 'Weakness Calculator'
  })

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

  async function handleLeaveSoulLinkSession() {
    await clearTransientUiState()
    unsubscribeSoulLink()
    leaveSoulLinkSession()
    await deleteRun(activeRunId.value)
    await switchToSoloMode()
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

  function resetOptionsJoinState() {
    showOptionsJoinInput.value = false
    optionsJoinCode.value = ''
    joinRunError.value = null
  }

  async function handleJoinRun() {
    const code = optionsJoinCode.value.trim()
    if (!code) return

    joinRunError.value = null
    try {
      const repo = createSupabaseRepository()
      const session = await repo.fetchSessionByInviteCode(
        code.toUpperCase().trim(),
      )

      if (!session) {
        throw new Error('No session found with that invite code.')
      }

      const isSoulLink = Array.isArray(session.state?.players)
      if (isSoulLink) {
        await handleJoinSoulLinkSession(code)
      } else {
        await handleSoloJoinSession(code)
      }

      resetOptionsJoinState()
      showResetDialog.value = false
    } catch (error) {
      console.error('Failed to join run:', error)
      joinRunError.value = error?.message || 'Failed to join run'
    }
  }

  async function handleJoinSoulLinkSession(code) {
    await joinSessionFlow({
      saveCurrentRun: isSoloMode.value
        ? null
        : () => saveCurrentRunToIndex(buildSoulLinkSnapshot()),
      unsubscribe: unsubscribeSoulLink,
      joinSession: () => joinSoulLinkSession(code),
      mode: RUN_MODES.SOUL_LINK,
      registerRun: () => registerNewRun(buildSoulLinkSnapshot()),
      subscribe: subscribeSoulLink,
      clearUI: () => {},
    })
  }

  async function handleSwitchRun(runId) {
    if (runId === activeRunId.value && !isSoloMode.value) return
    await clearTransientUiState()
    unsubscribeSoulLink()
    if (runId !== activeRunId.value) {
      await switchToRun(
        runId,
        isSoloMode.value ? null : buildSoulLinkSnapshot(),
      )
    }
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
    const previousRunId = soloActiveRunId.value
    const previousRunIsEmpty = isEmptySoloRun(buildSoloSnapshot())
    let joinedRunName = null
    let joinedSessionId = null
    let joinedInviteCode = null

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
      clearUI: () => {},
    })

    // Clean up the run that was displaced by the join
    if (previousRunId && previousRunId !== soloActiveRunId.value) {
      await deleteSoloRun(previousRunId)
    }
  }

  async function clearTransientUiState() {
    if (swapMode.value) {
      if (isSoloMode.value) {
        await cancelSwap()
      } else {
        handleSoulLinkCancelSwap()
      }
      return
    }

    cancel()
    resetSwapOriginal()
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
      await startFreshSoloRun()
    } else {
      await startFreshSoulLinkRun()
    }

    dismissAllDialogs()
  }

  async function startFreshSoloRun() {
    if (isSoloMode.value && soloActiveRunId.value) {
      const currentSnapshot = buildSoloSnapshot()
      if (isEmptySoloRun(currentSnapshot)) {
        await deleteSoloRun(soloActiveRunId.value)
      } else {
        await saveSoloRunToIndex(currentSnapshot)
      }
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
  }

  async function startFreshSoulLinkRun() {
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

  function buildSoloSnapshot() {
    const snapshot = mapSoloRunStateToPersistedSnapshot(soloRunState.value)
    snapshot.name = soloActiveRunSummary.value?.name ?? null
    return snapshot
  }

  async function switchToSoloRunCore(runId, currentSnapshot) {
    await clearTransientUiState()
    if (!isSoloMode.value) {
      await saveCurrentRunToIndex(buildSoulLinkSnapshot())
    }
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

    // Sync must settle before first render to avoid a team-reorder flash;
    // race a timeout so offline users aren't stuck waiting on Supabase.
    if (startupMode === RUN_MODES.SOLO && isSoloSyncAvailable) {
      const syncPromise = (async () => {
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
      })()

      await Promise.race([
        syncPromise,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
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
    unsubscribeSoulLink()
  })

  return {
    deathBoxMode,
    showResetDialog,
    showSoloDialog,
    showSoulLinkDialog,
    deleteRunTarget,
    ready,
    isSoloMode,
    currentActiveRunId,
    isSupabaseAvailable,
    hasRemoteSession,
    hasSoloRemoteSession,
    activeLoadError,
    soloRunDisplayName,
    allInactiveRuns,
    isSoloDeleteTarget,
    sessionActionPending,
    showOptionsJoinInput,
    optionsJoinCode,
    joinRunError,
    copyLabel,
    soloCopyLabel,
    retryLoad,
    resetPokemon,
    resetGyms,
    handleJoinRun,
    handleSwitchRun,
    handleSwitchSoloRun,
    handleDeleteRun,
    handleDeleteSoloRun,
    handleLeaveSoloSession,
    handleLeaveSoulLinkSession,
    handleViewDeathBox,
    handleViewOtherSoulLinkPlayer,
    handleRenameSoloRun,
    handleRenameViewedSoulLinkPlayerInput,
    copyInviteCode,
    copySoloInviteCode,
    startNewRun,
  }
}

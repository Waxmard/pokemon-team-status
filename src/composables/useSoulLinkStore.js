import { computed, ref } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'
import { cloneValue } from '../utils/clone.js'
import {
  assertSoulLinkRunState,
  createDefaultSoulLinkRunState,
  normalizeGenerationRules,
} from '../utils/runSnapshot.js'
import {
  buildRemoteState,
  createDefaultSoulLinkPlayerProgress,
  createDefaultSoulLinkPlayerRoster,
  generateInviteCode,
  mergeRemoteState,
  repairPairings,
  SOUL_LINK_PLAYER_IDS,
  SOUL_LINK_SYNC_STATES,
} from '../utils/soulLinkModel.js'
import {
  assertPlayerIdInSet,
  assertRosterKey,
  assertUniquePlayerIds,
  getPlayerIdsFromPlayers,
  normalizeCreateLocalRunOptions,
  normalizeLocalPreferences,
  normalizePlayers,
  normalizeRosterMembers,
  sanitizeSoulLinkProgressForRules,
  sanitizeSoulLinkRostersForRules,
} from '../utils/soulLinkNormalization.js'

const repository = createLocalSoloRunRepository()
const internalRunState = ref(createDefaultSoulLinkRunState())
const loadError = ref(false)

let _supabaseRepo = null
function getSupabaseRepository() {
  if (!_supabaseRepo) _supabaseRepo = createSupabaseRepository()
  return _supabaseRepo
}

let _unsubscribe = null
let _lastPushedVersion = 0

function getSoulLinkRunState(context) {
  return assertSoulLinkRunState(internalRunState.value, context)
}

function getSoulLinkState(context) {
  return getSoulLinkRunState(context).soulLink
}

function assertKnownPlayerId(playerId, context) {
  return assertPlayerIdInSet(
    playerId,
    assertUniquePlayerIds(
      getSoulLinkState('Resolving Soul Link players').players,
      'Resolving Soul Link players',
    ),
    context,
  )
}

function buildPersistableSnapshot() {
  const runState = getSoulLinkRunState('Building persistable snapshot')
  const sl = runState.soulLink
  return JSON.parse(
    JSON.stringify({
      generationRules: runState.rules.generation,
      metadata: sl.metadata,
      players: sl.players,
      rosters: sl.rosters,
      progress: sl.progress,
      sync: sl.sync,
      activity: sl.activity,
      local: sl.local,
    }),
  )
}

function replaceSoulLinkState(nextSoulLinkState) {
  const soulLinkRunState = getSoulLinkRunState('Updating Soul Link state')

  internalRunState.value = {
    ...soulLinkRunState,
    soulLink: nextSoulLinkState,
  }

  repository.persistSoulLinkSnapshot(buildPersistableSnapshot())
}

function updateSoulLinkState(updater) {
  const soulLinkState = getSoulLinkState('Updating Soul Link state')
  replaceSoulLinkState(updater(soulLinkState))
}

function updatePlayerRecord(collectionKey, playerId, nextValue) {
  assertKnownPlayerId(playerId, `Updating Soul Link ${collectionKey}`)

  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    [collectionKey]: {
      ...soulLinkState[collectionKey],
      [playerId]: nextValue,
    },
  }))
}

const runState = computed(() =>
  cloneValue(getSoulLinkRunState('Accessing Soul Link run state')),
)
const sessionMetadata = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link session metadata').metadata),
)
const players = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link players').players),
)
const rosters = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link rosters').rosters),
)
const gymProgress = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link gym progress').progress),
)
const generationRules = computed(
  () =>
    getSoulLinkRunState('Accessing Soul Link generation rules').rules
      .generation,
)
const localPreferences = computed(() =>
  cloneValue(getSoulLinkState('Accessing local Soul Link preferences').local),
)
const activity = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link activity').activity),
)
const sync = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link sync state').sync),
)

function updateSessionMetadata(updates) {
  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    metadata: {
      ...soulLinkState.metadata,
      ...updates,
    },
  }))
}

function setGenerationRules(nextGenerationRules) {
  const soulLinkRunState = getSoulLinkRunState(
    'Setting Soul Link generation rules',
  )
  const nextRules = normalizeGenerationRules(nextGenerationRules)

  internalRunState.value = {
    ...soulLinkRunState,
    rules: {
      ...soulLinkRunState.rules,
      generation: nextRules,
    },
    soulLink: {
      ...soulLinkRunState.soulLink,
      rosters: sanitizeSoulLinkRostersForRules(
        soulLinkRunState.soulLink.rosters,
        nextRules,
      ),
      progress: sanitizeSoulLinkProgressForRules(
        soulLinkRunState.soulLink.progress,
        nextRules,
      ),
    },
  }

  repository.persistSoulLinkSnapshot(buildPersistableSnapshot())
}

function updatePlayer(playerId, updates) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Updating a Soul Link player',
  )

  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    players: soulLinkState.players.map((player) =>
      player.id === nextPlayerId
        ? {
            ...player,
            ...cloneValue(updates),
            id: nextPlayerId,
            isLocal: player.isLocal,
          }
        : player,
    ),
  }))
}

function setCachedPlayerSlot(playerId) {
  assertKnownPlayerId(playerId, 'Setting the cached Soul Link player slot')

  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    local: {
      ...soulLinkState.local,
      cachedPlayerSlot: playerId,
      preferredPlayerId: playerId,
    },
  }))
}

function setLocalPreferences(updates) {
  const soulLinkState = getSoulLinkState('Setting Soul Link local preferences')
  const { playerIdSet, localPlayerId } = normalizePlayers(
    soulLinkState.players,
    'Setting Soul Link local preferences',
  )

  updateSoulLinkState((currentSoulLinkState) => ({
    ...currentSoulLinkState,
    local: normalizeLocalPreferences(
      {
        ...currentSoulLinkState.local,
        ...updates,
        notifications: updates.notifications
          ? {
              ...currentSoulLinkState.local.notifications,
              ...updates.notifications,
            }
          : currentSoulLinkState.local.notifications,
      },
      playerIdSet,
      localPlayerId,
      'Setting Soul Link local preferences',
    ),
  }))
}

function addRosterMember(playerId, rosterKey, member) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Adding a Soul Link roster member',
  )
  const nextRosterKey = assertRosterKey(
    rosterKey,
    'Adding a Soul Link roster member',
  )
  const playerRoster =
    getSoulLinkState('Adding a Soul Link roster member').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    [nextRosterKey]: [
      ...playerRoster[nextRosterKey],
      {
        ...cloneValue(member),
        ownerPlayerId: nextPlayerId,
        updatedAt: Date.now(),
      },
    ],
  })
}

function updateRosterMember(playerId, rosterKey, memberId, updates) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Updating a Soul Link roster member',
  )
  const nextRosterKey = assertRosterKey(
    rosterKey,
    'Updating a Soul Link roster member',
  )
  const playerRoster =
    getSoulLinkState('Updating a Soul Link roster member').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    [nextRosterKey]: playerRoster[nextRosterKey].map((member) =>
      member.id === memberId
        ? {
            ...member,
            ...cloneValue(updates),
            ownerPlayerId: nextPlayerId,
            updatedAt: Date.now(),
          }
        : member,
    ),
  })
}

function removeRosterMember(playerId, rosterKey, memberId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Removing a Soul Link roster member',
  )
  const nextRosterKey = assertRosterKey(
    rosterKey,
    'Removing a Soul Link roster member',
  )
  const playerRoster =
    getSoulLinkState('Removing a Soul Link roster member').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    [nextRosterKey]: playerRoster[nextRosterKey].filter(
      (member) => member.id !== memberId,
    ),
    _tombstones: [
      ...(playerRoster._tombstones ?? []),
      { memberId, deletedAt: Date.now() },
    ],
  })
}

function updatePlayerGymProgress(playerId, updates) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Updating Soul Link gym progress',
  )
  const playerProgress =
    getSoulLinkState('Updating Soul Link gym progress').progress[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerProgress()

  updatePlayerRecord('progress', nextPlayerId, {
    ...playerProgress,
    ...cloneValue(updates),
  })
}

function setPlayerRoster(playerId, roster) {
  const pid = assertKnownPlayerId(playerId, 'Setting a Soul Link roster')
  const currentRoster =
    getSoulLinkState('Setting a Soul Link roster').rosters[pid] ??
    createDefaultSoulLinkPlayerRoster()
  updatePlayerRecord('rosters', pid, {
    team: normalizeRosterMembers(roster.team, pid),
    box: normalizeRosterMembers(roster.box, pid),
    _tombstones: currentRoster._tombstones ?? [],
  })
}

function resetPlayerRoster(playerId) {
  updatePlayerRecord(
    'rosters',
    assertKnownPlayerId(playerId, 'Resetting a Soul Link roster'),
    createDefaultSoulLinkPlayerRoster(),
  )
}

function resetPlayerGymProgress(playerId) {
  updatePlayerRecord(
    'progress',
    assertKnownPlayerId(playerId, 'Resetting Soul Link gym progress'),
    createDefaultSoulLinkPlayerProgress(),
  )
}

function getPlayerRoster(playerId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Accessing a Soul Link roster',
  )

  const { _tombstones, ...roster } =
    getSoulLinkState('Accessing a Soul Link roster').rosters[nextPlayerId] ??
    createDefaultSoulLinkPlayerRoster()
  return cloneValue(roster)
}

function getPlayerTeam(playerId) {
  return getPlayerRoster(playerId).team
}

function getPlayerBox(playerId) {
  return getPlayerRoster(playerId).box
}

function getPlayerGymProgress(playerId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Accessing Soul Link gym progress',
  )

  return cloneValue(
    getSoulLinkState('Accessing Soul Link gym progress').progress[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerProgress(),
  )
}

function setSyncState(nextSyncState) {
  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    activity: {
      ...soulLinkState.activity,
      syncState: nextSyncState,
    },
  }))
}

function setSyncVersion(nextVersion) {
  updateSoulLinkState((soulLinkState) => ({
    ...soulLinkState,
    sync: {
      ...soulLinkState.sync,
      version: nextVersion,
    },
  }))
}

function unsubscribeFromSession() {
  if (_unsubscribe) {
    _unsubscribe()
    _unsubscribe = null
  }
}

export function useSoulLinkStore() {
  function createLocalRun(options = {}) {
    const normalizedOptions = normalizeCreateLocalRunOptions(options)
    const baseRunState = createDefaultSoulLinkRunState(
      normalizedOptions.generationRules,
    )

    internalRunState.value = {
      ...baseRunState,
      soulLink: {
        ...baseRunState.soulLink,
        metadata: normalizedOptions.metadata,
        players: normalizedOptions.players,
        rosters: normalizedOptions.rosters,
        progress: normalizedOptions.progress,
        sync: normalizedOptions.sync,
        activity: normalizedOptions.activity,
        local: normalizedOptions.local,
      },
    }

    repository.persistSoulLinkSnapshot(buildPersistableSnapshot())

    return runState.value
  }

  function resetLocalRun(generation = DEFAULT_GENERATION_RULESET) {
    return createLocalRun({ generationRules: generation })
  }

  function startNewLocalSoulLinkRun(generation = generationRules.value) {
    return createLocalRun({ generationRules: generation })
  }

  async function loadSoulLinkData() {
    try {
      const snapshot = await repository.loadSoulLinkSnapshot()
      if (!snapshot) {
        createLocalRun()
        loadError.value = false
        return
      }
      createLocalRun({
        generationRules: snapshot.generationRules,
        metadata: snapshot.metadata,
        players: snapshot.players,
        rosters: snapshot.rosters,
        progress: snapshot.progress,
        local: snapshot.local,
        sync: snapshot.sync,
        activity: snapshot.activity,
      })
      loadError.value = false
    } catch (error) {
      console.error('Failed to load Soul Link data:', error)
      loadError.value = true
    }
  }

  async function createSession() {
    const repo = getSupabaseRepository()
    const sessionId = crypto.randomUUID()
    const soulLinkState = getSoulLinkState('Creating a session')
    const currentRunState = getSoulLinkRunState('Creating a session')
    const remoteState = buildRemoteState(
      soulLinkState,
      currentRunState.rules.generation,
    )

    let lastError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const inviteCode = generateInviteCode()
      try {
        const session = await repo.createSession({
          sessionId,
          inviteCode,
          state: remoteState,
        })

        updateSessionMetadata({
          sessionId: session.id,
          inviteCode: session.inviteCode,
          createdAt: new Date().toISOString(),
        })
        setSyncVersion(session.version)
        setSyncState(SOUL_LINK_SYNC_STATES.READY)

        return { sessionId: session.id, inviteCode: session.inviteCode }
      } catch (error) {
        lastError = error
        if (!error.message?.includes('invite_code')) throw error
      }
    }

    throw lastError
  }

  async function joinSession(inviteCode) {
    const repo = getSupabaseRepository()
    const normalizedCode = inviteCode.toUpperCase().trim()
    const session = await repo.fetchSessionByInviteCode(normalizedCode)

    if (!session) {
      throw new Error('No session found with that invite code.')
    }

    const savedSnapshot = await repository.loadSoulLinkSnapshot()
    const isRejoin = savedSnapshot?.metadata?.sessionId === session.id
    const savedLocal = isRejoin ? savedSnapshot.local : null
    const devicePlayerId =
      savedLocal?.devicePlayerId ?? SOUL_LINK_PLAYER_IDS.PARTNER

    const remoteState = session.state
    const remotePlayers = (remoteState.players ?? []).map((player) => ({
      ...player,
      isLocal: player.id === devicePlayerId,
    }))

    createLocalRun({
      generationRules: remoteState.generationRules,
      metadata: {
        sessionId: session.id,
        inviteCode: session.inviteCode,
        name: remoteState.metadata?.name ?? null,
        createdAt: remoteState.metadata?.createdAt ?? null,
      },
      players: remotePlayers,
      rosters: remoteState.rosters,
      local: {
        devicePlayerId,
        preferredPlayerId: savedLocal?.preferredPlayerId ?? devicePlayerId,
        cachedPlayerSlot: savedLocal?.cachedPlayerSlot ?? devicePlayerId,
      },
      sync: { version: session.version },
      activity: { syncState: SOUL_LINK_SYNC_STATES.READY },
    })

    return { sessionId: session.id, inviteCode: session.inviteCode }
  }

  async function pullState() {
    const soulLinkState = getSoulLinkState('Pulling state')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    const session = await repo.fetchSessionById(sessionId)

    if (!session) {
      startNewLocalSoulLinkRun()
      return
    }

    const merged = mergeRemoteState(soulLinkState, session.state)
    replaceSoulLinkState(merged)
    setSyncVersion(session.version)
  }

  async function forceReplaceFromRemote() {
    const soulLinkState = getSoulLinkState('Force replacing from remote')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    const session = await repo.fetchSessionById(sessionId)
    if (!session) return

    const incomingRosters = session.state.rosters ?? soulLinkState.rosters
    const playerIds = getPlayerIdsFromPlayers(soulLinkState.players)

    replaceSoulLinkState({
      ...soulLinkState,
      rosters: repairPairings(incomingRosters, playerIds),
    })

    _lastPushedVersion = session.version
    setSyncVersion(session.version)
  }

  async function pushState() {
    const soulLinkState = getSoulLinkState('Pushing state')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    const currentRunState = getSoulLinkRunState('Pushing state')
    const remoteState = buildRemoteState(
      soulLinkState,
      currentRunState.rules.generation,
    )
    const expectedVersion = soulLinkState.sync.version

    const result = await repo.pushSessionState(
      sessionId,
      remoteState,
      expectedVersion,
    )

    if (result.success) {
      _lastPushedVersion = result.version
      setSyncVersion(result.version)
      return
    }

    // Version conflict — fetch current version, apply partner data, retry once
    const session = await repo.fetchSessionById(sessionId)
    if (!session) return

    const currentState = getSoulLinkState('Retrying push after conflict')
    const merged = mergeRemoteState(currentState, session.state)
    replaceSoulLinkState(merged)
    setSyncVersion(session.version)

    const refreshedState = getSoulLinkState('Retrying push after conflict')
    const refreshedRunState = getSoulLinkRunState(
      'Retrying push after conflict',
    )
    const refreshedRemote = buildRemoteState(
      refreshedState,
      refreshedRunState.rules.generation,
    )
    const retryResult = await repo.pushSessionState(
      sessionId,
      refreshedRemote,
      refreshedState.sync.version,
    )

    if (retryResult.success) {
      _lastPushedVersion = retryResult.version
      setSyncVersion(retryResult.version)
    }
  }

  async function syncSession() {
    const soulLinkState = getSoulLinkState('Syncing session')
    if (!soulLinkState.metadata.sessionId) return

    setSyncState(SOUL_LINK_SYNC_STATES.SYNCING)
    try {
      await pullState()
      await pushState()
      setSyncState(SOUL_LINK_SYNC_STATES.READY)
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncState(SOUL_LINK_SYNC_STATES.READY)
    }
  }

  async function deleteRemoteSession() {
    const soulLinkState = getSoulLinkState('Deleting remote session')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    await repo.deleteSession(sessionId)

    updateSessionMetadata({ sessionId: null, inviteCode: null })
    setSyncVersion(1)
    setSyncState(SOUL_LINK_SYNC_STATES.LOCAL_ONLY)
  }

  function subscribeToSessionUpdates() {
    unsubscribeFromSession()

    const soulLinkState = getSoulLinkState('Subscribing to session')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    _unsubscribe = repo.subscribeToSession(sessionId, (session) => {
      if (session.version <= _lastPushedVersion) return
      const currentState = getSoulLinkState('Handling realtime update')
      const merged = mergeRemoteState(currentState, session.state)
      replaceSoulLinkState(merged)
      setSyncVersion(session.version)
      if (session.state.generationRules) {
        setGenerationRules(session.state.generationRules)
      }
    })
  }

  return {
    runState,
    sessionMetadata,
    players,
    rosters,
    gymProgress,
    generationRules,
    localPreferences,
    activity,
    sync,
    loadSoulLinkData,
    loadError,
    createLocalRun,
    resetLocalRun,
    startNewLocalSoulLinkRun,
    updateSessionMetadata,
    setGenerationRules,
    updatePlayer,
    setCachedPlayerSlot,
    setLocalPreferences,
    addRosterMember,
    updateRosterMember,
    removeRosterMember,
    updatePlayerGymProgress,
    getPlayerRoster,
    getPlayerTeam,
    getPlayerBox,
    getPlayerGymProgress,
    setPlayerRoster,
    resetPlayerRoster,
    resetPlayerGymProgress,
    createSession,
    joinSession,
    pushState,
    pullState,
    forceReplaceFromRemote,
    syncSession,
    deleteRemoteSession,
    subscribeToSessionUpdates,
    unsubscribeFromSession,
  }
}

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
import { createSessionSync } from './useSessionSync.js'

const repository = createLocalSoloRunRepository()
const internalRunState = ref(createDefaultSoulLinkRunState())
const loadError = ref(false)

let _supabaseRepo = null
function getSupabaseRepository() {
  if (!_supabaseRepo) _supabaseRepo = createSupabaseRepository()
  return _supabaseRepo
}

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

// Forward-declared so sync config can reference it before full definition
let _setGenerationRules = null

const sync = createSessionSync({
  getSessionId: () =>
    internalRunState.value?.soulLink?.metadata?.sessionId ?? null,
  getVersion: () => internalRunState.value?.soulLink?.sync?.version ?? 0,
  setVersion: (v) => setSyncVersion(v),
  getLocalState: () => getSoulLinkState('Sync: reading local state'),
  setLocalState: (merged) => replaceSoulLinkState(merged),
  buildRemotePayload: () =>
    buildRemoteState(
      getSoulLinkState('Sync: building remote payload'),
      getSoulLinkRunState('Sync: building remote payload').rules.generation,
    ),
  mergeRemote: (local, remote) => mergeRemoteState(local, remote),
  onRemoteUpdate: (session) => {
    if (session.state?.generationRules) {
      _setGenerationRules?.(session.state.generationRules)
    }
  },
})

function replaceSoulLinkState(nextSoulLinkState) {
  const soulLinkRunState = getSoulLinkRunState('Updating Soul Link state')

  internalRunState.value = {
    ...soulLinkRunState,
    soulLink: nextSoulLinkState,
  }

  repository.persistSoulLinkSnapshot(buildPersistableSnapshot()).catch(() => {})
  sync.scheduleAutoSync()
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
const syncData = computed(() =>
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

  repository.persistSoulLinkSnapshot(buildPersistableSnapshot()).catch(() => {})
  sync.scheduleAutoSync()
}

_setGenerationRules = setGenerationRules

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

  const newMember = {
    ...cloneValue(member),
    ownerPlayerId: nextPlayerId,
    updatedAt: Date.now(),
  }

  const updatedList =
    nextRosterKey === 'team'
      ? [...playerRoster[nextRosterKey], newMember]
      : [newMember, ...playerRoster[nextRosterKey]]

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    [nextRosterKey]: updatedList,
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
    updatedAt: Date.now(),
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
    dead: currentRoster.dead ?? [],
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

  const { _tombstones, dead, ...roster } =
    getSoulLinkState('Accessing a Soul Link roster').rosters[nextPlayerId] ??
    createDefaultSoulLinkPlayerRoster()
  return cloneValue(roster)
}

function getFullPlayerRoster(playerId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Accessing a full Soul Link roster',
  )

  const { _tombstones, ...roster } =
    getSoulLinkState('Accessing a full Soul Link roster').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()
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

function getPlayerDead(playerId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Accessing Soul Link dead roster',
  )
  const roster =
    getSoulLinkState('Accessing Soul Link dead roster').rosters[nextPlayerId] ??
    createDefaultSoulLinkPlayerRoster()
  return cloneValue(roster.dead ?? [])
}

function killRosterMember(playerId, rosterKey, memberId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Killing a Soul Link roster member',
  )
  const nextRosterKey = assertRosterKey(
    rosterKey,
    'Killing a Soul Link roster member',
  )
  const playerRoster =
    getSoulLinkState('Killing a Soul Link roster member').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()

  const member = playerRoster[nextRosterKey].find((m) => m.id === memberId)
  if (!member) return

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    [nextRosterKey]: playerRoster[nextRosterKey].filter(
      (m) => m.id !== memberId,
    ),
    dead: [
      { ...cloneValue(member), updatedAt: Date.now() },
      ...(playerRoster.dead ?? []),
    ],
  })
}

function reviveRosterMember(playerId, memberId) {
  const nextPlayerId = assertKnownPlayerId(
    playerId,
    'Reviving a Soul Link roster member',
  )
  const playerRoster =
    getSoulLinkState('Reviving a Soul Link roster member').rosters[
      nextPlayerId
    ] ?? createDefaultSoulLinkPlayerRoster()

  const member = (playerRoster.dead ?? []).find((m) => m.id === memberId)
  if (!member) return

  updatePlayerRecord('rosters', nextPlayerId, {
    ...playerRoster,
    dead: (playerRoster.dead ?? []).filter((m) => m.id !== memberId),
    box: [
      { ...cloneValue(member), updatedAt: Date.now() },
      ...playerRoster.box,
    ],
  })
}

function setSyncState(nextSyncState) {
  sync.withSyncSuppressed(() =>
    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      activity: {
        ...soulLinkState.activity,
        syncState: nextSyncState,
      },
    })),
  )
}

function setSyncVersion(nextVersion) {
  sync.withSyncSuppressed(() =>
    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      sync: {
        ...soulLinkState.sync,
        version: nextVersion,
      },
    })),
  )
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

    repository
      .persistSoulLinkSnapshot(buildPersistableSnapshot())
      .catch(() => {})

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
      progress: remoteState.progress,
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

  async function syncSession() {
    const soulLinkState = getSoulLinkState('Syncing session')
    if (!soulLinkState.metadata.sessionId) return

    setSyncState(SOUL_LINK_SYNC_STATES.SYNCING)
    try {
      await sync.pullState()
      await sync.pushState()
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

  return {
    runState,
    sessionMetadata,
    players,
    rosters,
    gymProgress,
    generationRules,
    localPreferences,
    activity,
    sync: syncData,
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
    getFullPlayerRoster,
    getPlayerTeam,
    getPlayerBox,
    getPlayerDead,
    getPlayerGymProgress,
    killRosterMember,
    reviveRosterMember,
    setPlayerRoster,
    resetPlayerRoster,
    resetPlayerGymProgress,
    createSession,
    joinSession,
    pushState: sync.pushState,
    pullState: sync.pullState,
    syncSession,
    deleteRemoteSession,
    subscribeToSessionUpdates: sync.subscribeToSession,
    unsubscribeFromSession: sync.unsubscribeFromSession,
    buildPersistableSnapshot,
  }
}

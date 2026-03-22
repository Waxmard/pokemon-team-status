import { computed, ref, toRaw } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonMemberForRules,
} from '../utils/generationRules.js'
import {
  assertSoulLinkRunState,
  createDefaultSoulLinkRunState,
  normalizeGenerationRules,
} from '../utils/runSnapshot.js'
import {
  buildRemoteState,
  createDefaultSoulLinkActivityEntry,
  createDefaultSoulLinkChangeSet,
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkPlayerProgress,
  createDefaultSoulLinkPlayerRoster,
  createDefaultSoulLinkState,
  generateInviteCode,
  mergeRemoteState,
  SOUL_LINK_PLAYER_IDS,
  SOUL_LINK_SYNC_STATES,
} from '../utils/soulLinkModel.js'

const repository = createLocalSoloRunRepository()
const internalRunState = ref(createDefaultSoulLinkRunState())
const loadError = ref(false)

function generateUUID() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let _supabaseRepo = null
function getSupabaseRepository() {
  if (!_supabaseRepo) _supabaseRepo = createSupabaseRepository()
  return _supabaseRepo
}

let _unsubscribe = null

function cloneValue(value) {
  return deepFreeze(JSON.parse(JSON.stringify(toRaw(value))))
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }

    Object.freeze(value)
  }

  return value
}

function getSoulLinkRunState(context) {
  return assertSoulLinkRunState(internalRunState.value, context)
}

function getSoulLinkState(context) {
  return getSoulLinkRunState(context).soulLink
}

function getPlayerIdsFromPlayers(players) {
  return players.map((player) => player.id)
}

function assertUniquePlayerIds(players, context) {
  const playerIds = getPlayerIdsFromPlayers(players)
  const uniquePlayerIds = new Set(playerIds)

  if (playerIds.length === 0) {
    throw new Error(`${context} requires at least one Soul Link player.`)
  }

  if (uniquePlayerIds.size !== playerIds.length) {
    throw new Error(`${context} requires unique Soul Link player ids.`)
  }

  return uniquePlayerIds
}

function assertPlayerIdInSet(
  playerId,
  playerIdSet,
  context,
  label = 'player id',
) {
  if (!playerIdSet.has(playerId)) {
    throw new Error(`${context} requires a valid Soul Link ${label}.`)
  }

  return playerId
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

function assertRosterKey(rosterKey, context) {
  if (rosterKey !== 'team' && rosterKey !== 'box') {
    throw new Error(`${context} requires a roster key of team or box.`)
  }

  return rosterKey
}

function createDefaultRecordMap(playerIds, factory) {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, factory()]))
}

function normalizePlayers(players, context) {
  const nextPlayers = cloneValue(players)
  const playerIdSet = assertUniquePlayerIds(nextPlayers, context)
  const localPlayers = nextPlayers.filter((player) => player.isLocal)

  if (localPlayers.length !== 1) {
    throw new Error(`${context} requires exactly one local Soul Link player.`)
  }

  return {
    players: nextPlayers,
    playerIdSet,
    localPlayerId: localPlayers[0].id,
  }
}

function normalizePlayerScopedRecords(records, playerIds, factory, context) {
  const nextRecords = cloneValue(records ?? {})

  for (const playerId of Object.keys(nextRecords)) {
    assertPlayerIdInSet(playerId, new Set(playerIds), context)
  }

  return {
    ...createDefaultRecordMap(playerIds, factory),
    ...nextRecords,
  }
}

function normalizeLocalPreferences(local, playerIdSet, localPlayerId, context) {
  const nextLocal = {
    ...createDefaultSoulLinkLocalPreferences(),
    ...(local ?? {}),
    notifications: {
      ...createDefaultSoulLinkLocalPreferences().notifications,
      ...(local?.notifications ?? {}),
    },
  }

  assertPlayerIdInSet(
    nextLocal.devicePlayerId,
    playerIdSet,
    context,
    'device player id',
  )
  assertPlayerIdInSet(
    nextLocal.preferredPlayerId,
    playerIdSet,
    context,
    'preferred player id',
  )
  assertPlayerIdInSet(
    nextLocal.cachedPlayerSlot,
    playerIdSet,
    context,
    'cached player slot',
  )

  if (nextLocal.devicePlayerId !== localPlayerId) {
    throw new Error(
      `${context} requires devicePlayerId to match the local Soul Link player.`,
    )
  }

  return nextLocal
}

function normalizeRosterMembers(members, playerId) {
  return cloneValue(members ?? []).map((member) => ({
    ...member,
    ownerPlayerId: playerId,
  }))
}

function sanitizeSoulLinkRosterMemberForRules(member, ruleset) {
  if (!member?.speciesName) {
    return member == null ? member : cloneValue(member)
  }

  const sanitizedMember = sanitizePokemonMemberForRules(
    {
      ...member,
      name: member.speciesName,
    },
    ruleset,
  )

  const nextMember = { ...sanitizedMember }
  delete nextMember.name

  return {
    ...nextMember,
    speciesName: member.speciesName,
    ownerPlayerId: member.ownerPlayerId,
  }
}

function sanitizeSoulLinkRostersForRules(rosters, ruleset) {
  return Object.fromEntries(
    Object.entries(rosters).map(([playerId, roster]) => [
      playerId,
      {
        team: roster.team.map((member) =>
          sanitizeSoulLinkRosterMemberForRules(member, ruleset),
        ),
        box: roster.box.map((member) =>
          sanitizeSoulLinkRosterMemberForRules(member, ruleset),
        ),
      },
    ]),
  )
}

function sanitizeSoulLinkProgressForRules(progress, ruleset) {
  return Object.fromEntries(
    Object.entries(progress).map(([playerId, playerProgress]) => [
      playerId,
      {
        ...playerProgress,
        defeatedGyms: sanitizeDefeatedGymsForRules(
          playerProgress.defeatedGyms,
          ruleset,
        ),
        pinnedGym: sanitizePinnedGymForRules(playerProgress.pinnedGym, ruleset),
      },
    ]),
  )
}

function normalizeRosters(rosters, playerIds, context) {
  const normalizedRosters = normalizePlayerScopedRecords(
    rosters,
    playerIds,
    createDefaultSoulLinkPlayerRoster,
    context,
  )

  return Object.fromEntries(
    playerIds.map((playerId) => {
      const playerRoster = normalizedRosters[playerId]

      return [
        playerId,
        {
          team: normalizeRosterMembers(playerRoster.team, playerId),
          box: normalizeRosterMembers(playerRoster.box, playerId),
        },
      ]
    }),
  )
}

function normalizeCreateLocalRunOptions(options = {}) {
  const baseSoulLinkState = createDefaultSoulLinkState()
  const { players, playerIdSet, localPlayerId } = normalizePlayers(
    options.players ?? baseSoulLinkState.players,
    'Creating a local Soul Link run',
  )
  const playerIds = getPlayerIdsFromPlayers(players)

  return {
    generationRules: normalizeGenerationRules(
      options.generationRules ?? DEFAULT_GENERATION_RULESET,
    ),
    metadata: {
      ...baseSoulLinkState.metadata,
      ...(options.metadata ?? {}),
    },
    players,
    rosters: normalizeRosters(
      options.rosters,
      playerIds,
      'Creating a local Soul Link run',
    ),
    progress: normalizePlayerScopedRecords(
      options.progress,
      playerIds,
      createDefaultSoulLinkPlayerProgress,
      'Creating a local Soul Link run',
    ),
    sync: {
      ...baseSoulLinkState.sync,
      ...(options.sync ?? {}),
    },
    activity: {
      ...baseSoulLinkState.activity,
      ...(options.activity ?? {}),
    },
    local: normalizeLocalPreferences(
      options.local,
      playerIdSet,
      localPlayerId,
      'Creating a local Soul Link run',
    ),
  }
}

function buildPersistableSnapshot() {
  const runState = getSoulLinkRunState('Building persistable snapshot')
  const sl = runState.soulLink
  return {
    generationRules: runState.rules.generation,
    metadata: sl.metadata,
    players: sl.players,
    rosters: sl.rosters,
    progress: sl.progress,
    sync: sl.sync,
    activity: sl.activity,
    local: sl.local,
  }
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
const activityFeed = computed(() =>
  cloneValue(
    getSoulLinkState('Accessing Soul Link activity').activity.recentEntries,
  ),
)
const sync = computed(() =>
  cloneValue(getSoulLinkState('Accessing Soul Link sync state').sync),
)
const pendingChangeSets = computed(() =>
  cloneValue(
    getSoulLinkState('Accessing Soul Link sync state').sync.pendingChangeSets,
  ),
)

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
    const soulLinkState = getSoulLinkState(
      'Setting Soul Link local preferences',
    )
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

  function enqueuePendingChangeSet(changeSet) {
    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      sync: {
        ...soulLinkState.sync,
        pendingChangeSets: [
          ...soulLinkState.sync.pendingChangeSets,
          {
            ...createDefaultSoulLinkChangeSet(),
            ...cloneValue(changeSet),
          },
        ],
      },
    }))
  }

  function removePendingChangeSet(changeSetId) {
    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      sync: {
        ...soulLinkState.sync,
        pendingChangeSets: soulLinkState.sync.pendingChangeSets.filter(
          (changeSet) => changeSet.id !== changeSetId,
        ),
      },
    }))
  }

  function appendActivityEntry(entry) {
    const nextEntry = {
      ...createDefaultSoulLinkActivityEntry(),
      ...cloneValue(entry),
    }

    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      activity: {
        ...soulLinkState.activity,
        lastUpdatedAt: nextEntry.createdAt,
        recentEntries: [nextEntry, ...soulLinkState.activity.recentEntries],
      },
    }))
  }

  function markActivityEntryRead(entryId, readAt) {
    const timestamp = readAt ?? new Date().toISOString()

    updateSoulLinkState((soulLinkState) => ({
      ...soulLinkState,
      activity: {
        ...soulLinkState.activity,
        recentEntries: soulLinkState.activity.recentEntries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                readAt: timestamp,
              }
            : entry,
        ),
      },
    }))
  }

  function setPlayerRoster(playerId, roster) {
    const pid = assertKnownPlayerId(playerId, 'Setting a Soul Link roster')
    updatePlayerRecord('rosters', pid, {
      team: normalizeRosterMembers(roster.team, pid),
      box: normalizeRosterMembers(roster.box, pid),
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

    return cloneValue(
      getSoulLinkState('Accessing a Soul Link roster').rosters[nextPlayerId] ??
        createDefaultSoulLinkPlayerRoster(),
    )
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

  async function createSession() {
    const repo = getSupabaseRepository()
    const sessionId = generateUUID()
    const soulLinkState = getSoulLinkState('Creating a session')
    const remoteState = buildRemoteState(soulLinkState)

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

    const remoteState = session.state
    const remotePlayers = (remoteState.players ?? []).map((player) => ({
      ...player,
      isLocal: player.id === SOUL_LINK_PLAYER_IDS.PARTNER,
    }))

    createLocalRun({
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
        devicePlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
        preferredPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
        cachedPlayerSlot: SOUL_LINK_PLAYER_IDS.PARTNER,
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

  async function pushState() {
    const soulLinkState = getSoulLinkState('Pushing state')
    const sessionId = soulLinkState.metadata.sessionId
    if (!sessionId) return

    const repo = getSupabaseRepository()
    const remoteState = buildRemoteState(soulLinkState)
    const expectedVersion = soulLinkState.sync.version

    const result = await repo.pushSessionState(
      sessionId,
      remoteState,
      expectedVersion,
    )

    if (result.success) {
      setSyncVersion(result.version)
      return
    }

    // Version conflict — pull and retry once
    await pullState()
    const refreshedState = getSoulLinkState('Retrying push after conflict')
    const refreshedRemote = buildRemoteState(refreshedState)
    const retryResult = await repo.pushSessionState(
      sessionId,
      refreshedRemote,
      refreshedState.sync.version,
    )

    if (retryResult.success) {
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
      const currentState = getSoulLinkState('Handling realtime update')
      const merged = mergeRemoteState(currentState, session.state)
      replaceSoulLinkState(merged)
      setSyncVersion(session.version)
    })
  }

  function unsubscribeFromSession() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
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
    activityFeed,
    sync,
    pendingChangeSets,
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
    enqueuePendingChangeSet,
    removePendingChangeSet,
    appendActivityEntry,
    markActivityEntryRead,
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
    syncSession,
    deleteRemoteSession,
    subscribeToSessionUpdates,
    unsubscribeFromSession,
  }
}

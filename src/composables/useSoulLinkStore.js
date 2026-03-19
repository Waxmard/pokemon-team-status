import { computed, ref, toRaw } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import {
  assertSoulLinkRunState,
  createDefaultSoulLinkRunState,
  normalizeGenerationRules,
} from '../utils/runSnapshot.js'
import {
  createDefaultSoulLinkActivityEntry,
  createDefaultSoulLinkChangeSet,
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkPlayerProgress,
  createDefaultSoulLinkPlayerRoster,
  createDefaultSoulLinkState,
} from '../utils/soulLinkModel.js'

const internalRunState = ref(createDefaultSoulLinkRunState())

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

function replaceSoulLinkState(nextSoulLinkState) {
  const soulLinkRunState = getSoulLinkRunState('Updating Soul Link state')

  internalRunState.value = {
    ...soulLinkRunState,
    soulLink: nextSoulLinkState,
  }
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

    return runState.value
  }

  function resetLocalRun(generation = DEFAULT_GENERATION_RULESET) {
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

    internalRunState.value = {
      ...soulLinkRunState,
      rules: {
        ...soulLinkRunState.rules,
        generation: normalizeGenerationRules(nextGenerationRules),
      },
    }
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
    createLocalRun,
    resetLocalRun,
    updateSessionMetadata,
    setGenerationRules,
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
  }
}

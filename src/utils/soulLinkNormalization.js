import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { cloneValue } from './clone.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonMemberForRules,
} from './generationRules.js'
import { normalizeGenerationRules } from './runSnapshot.js'
import {
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkPlayerProgress,
  createDefaultSoulLinkPlayerRoster,
  createDefaultSoulLinkState,
} from './soulLinkModel.js'

export function getPlayerIdsFromPlayers(players) {
  return players.map((player) => player.id)
}

export function assertUniquePlayerIds(players, context) {
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

export function assertPlayerIdInSet(
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

export function assertRosterKey(rosterKey, context) {
  if (rosterKey !== 'team' && rosterKey !== 'box') {
    throw new Error(`${context} requires a roster key of team or box.`)
  }

  return rosterKey
}

function createDefaultRecordMap(playerIds, factory) {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, factory()]))
}

export function normalizePlayers(players, context) {
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

export function normalizePlayerScopedRecords(
  records,
  playerIds,
  factory,
  context,
) {
  const nextRecords = cloneValue(records ?? {})

  for (const playerId of Object.keys(nextRecords)) {
    assertPlayerIdInSet(playerId, new Set(playerIds), context)
  }

  return {
    ...createDefaultRecordMap(playerIds, factory),
    ...nextRecords,
  }
}

export function normalizeLocalPreferences(
  local,
  playerIdSet,
  localPlayerId,
  context,
) {
  const defaults = createDefaultSoulLinkLocalPreferences()
  const nextLocal = {
    ...defaults,
    ...local,
    notifications: {
      ...defaults.notifications,
      ...local?.notifications,
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

export function normalizeRosterMembers(members, playerId) {
  return cloneValue(members ?? []).map((member) => ({
    ...member,
    ownerPlayerId: playerId,
    updatedAt: member.updatedAt ?? Date.now(),
  }))
}

export function sanitizeSoulLinkRosterMemberForRules(member, ruleset) {
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

export function sanitizeSoulLinkRostersForRules(rosters, ruleset) {
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

export function sanitizeSoulLinkProgressForRules(progress, ruleset) {
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

export function normalizeRosters(rosters, playerIds, context) {
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
          _tombstones: playerRoster._tombstones ?? [],
        },
      ]
    }),
  )
}

export function normalizeCreateLocalRunOptions(options = {}) {
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
      ...options.metadata,
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
      ...options.sync,
    },
    activity: {
      ...baseSoulLinkState.activity,
      ...options.activity,
    },
    local: normalizeLocalPreferences(
      options.local,
      playerIdSet,
      localPlayerId,
      'Creating a local Soul Link run',
    ),
  }
}

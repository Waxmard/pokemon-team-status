import { normalizeCatchLocation } from './soulLinkPairing.js'

export const SOUL_LINK_PLAYER_IDS = {
  LOCAL: 'player-1',
  PARTNER: 'player-2',
}

export const SOUL_LINK_PLAYER_ORDER = [
  SOUL_LINK_PLAYER_IDS.LOCAL,
  SOUL_LINK_PLAYER_IDS.PARTNER,
]

export const SOUL_LINK_SYNC_STATES = {
  LOCAL_ONLY: 'local-only',
  READY: 'ready',
  SYNCING: 'syncing',
}

export function createDefaultSoulLinkSessionMetadata() {
  return {
    sessionId: null,
    inviteCode: null,
    name: null,
    createdAt: null,
  }
}

export function createDefaultSoulLinkPlayer(id, name, isLocal) {
  return {
    id,
    name,
    isLocal,
  }
}

export function createDefaultSoulLinkPlayers() {
  return [
    createDefaultSoulLinkPlayer(SOUL_LINK_PLAYER_IDS.LOCAL, 'Player 1', true),
    createDefaultSoulLinkPlayer(
      SOUL_LINK_PLAYER_IDS.PARTNER,
      'Player 2',
      false,
    ),
  ]
}

export function createDefaultSoulLinkMember(overrides = {}) {
  return {
    id: null,
    speciesName: null,
    nickname: null,
    catchLocation: null,
    ownerPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
    pairId: null,
    updatedAt: null,
    ...overrides,
  }
}

export function createDefaultSoulLinkPlayerRoster() {
  return {
    team: [],
    box: [],
    dead: [],
    _tombstones: [],
  }
}

export function createDefaultSoulLinkRosters() {
  return {
    [SOUL_LINK_PLAYER_IDS.LOCAL]: createDefaultSoulLinkPlayerRoster(),
    [SOUL_LINK_PLAYER_IDS.PARTNER]: createDefaultSoulLinkPlayerRoster(),
  }
}

export function createDefaultSoulLinkPlayerProgress() {
  return {
    defeatedGyms: [],
    pinnedGym: null,
  }
}

export function createDefaultSoulLinkProgress() {
  return {
    [SOUL_LINK_PLAYER_IDS.LOCAL]: createDefaultSoulLinkPlayerProgress(),
    [SOUL_LINK_PLAYER_IDS.PARTNER]: createDefaultSoulLinkPlayerProgress(),
  }
}

export function createDefaultSoulLinkNotificationSettings() {
  return {
    enabled: true,
    partnerUpdates: true,
    gymProgress: true,
    memberChanges: true,
  }
}

export function createDefaultSoulLinkLocalPreferences() {
  return {
    devicePlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
    preferredPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
    cachedPlayerSlot: SOUL_LINK_PLAYER_IDS.LOCAL,
    sessionPreference: 'soul-link',
    notifications: createDefaultSoulLinkNotificationSettings(),
  }
}

export function createDefaultSoulLinkActivity() {
  return {
    syncState: SOUL_LINK_SYNC_STATES.LOCAL_ONLY,
    lastUpdatedAt: null,
    recentEntries: [],
  }
}

export function createDefaultSoulLinkSync() {
  return {
    version: 1,
    pendingChangeSets: [],
    lastAppliedChangeSetId: null,
  }
}

export function createDefaultSoulLinkState() {
  return {
    metadata: createDefaultSoulLinkSessionMetadata(),
    players: createDefaultSoulLinkPlayers(),
    rosters: createDefaultSoulLinkRosters(),
    progress: createDefaultSoulLinkProgress(),
    sync: createDefaultSoulLinkSync(),
    activity: createDefaultSoulLinkActivity(),
    local: createDefaultSoulLinkLocalPreferences(),
  }
}

const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(
    bytes,
    (b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length],
  ).join('')
}

export function buildRemoteState(soulLinkState, generationRules) {
  return {
    metadata: soulLinkState.metadata,
    players: soulLinkState.players.map(({ id, name }) => ({ id, name })),
    rosters: soulLinkState.rosters,
    generationRules,
  }
}

const TOMBSTONE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function buildMemberMap(roster) {
  const members = new Map()
  for (const m of roster.team) {
    members.set(m.id, { member: m, rosterKey: 'team' })
  }
  for (const m of roster.box) {
    members.set(m.id, { member: m, rosterKey: 'box' })
  }
  for (const m of roster.dead ?? []) {
    members.set(m.id, { member: m, rosterKey: 'dead' })
  }
  return members
}

function buildTombstoneMap(roster) {
  const tombstones = new Map()
  for (const t of roster._tombstones ?? []) {
    tombstones.set(t.memberId, t.deletedAt)
  }
  return tombstones
}

function resolveMemberWinner(
  id,
  localMembers,
  remoteMembers,
  localTombstones,
  remoteTombstones,
) {
  const localActive = localMembers.get(id)
  const remoteActive = remoteMembers.get(id)
  const localDeleted = localTombstones.get(id)
  const remoteDeleted = remoteTombstones.get(id)

  const localTs = localActive?.member.updatedAt ?? localDeleted ?? 0
  const remoteTs = remoteActive?.member.updatedAt ?? remoteDeleted ?? 0
  const preferLocal = localTs >= remoteTs

  return {
    isDeleted: preferLocal
      ? !localActive && localDeleted != null
      : !remoteActive && remoteDeleted != null,
    entry: preferLocal ? localActive : remoteActive,
    deletedAt: preferLocal ? localDeleted : remoteDeleted,
  }
}

export function mergePlayerRoster(localRoster, remoteRoster) {
  const localMembers = buildMemberMap(localRoster)
  const remoteMembers = buildMemberMap(remoteRoster)
  const localTombstones = buildTombstoneMap(localRoster)
  const remoteTombstones = buildTombstoneMap(remoteRoster)

  const allIds = new Set([
    ...localMembers.keys(),
    ...remoteMembers.keys(),
    ...localTombstones.keys(),
    ...remoteTombstones.keys(),
  ])

  const mergedTeam = []
  const mergedBox = []
  const mergedDead = []
  const mergedTombstones = []
  const now = Date.now()

  for (const id of allIds) {
    const winner = resolveMemberWinner(
      id,
      localMembers,
      remoteMembers,
      localTombstones,
      remoteTombstones,
    )

    if (winner.isDeleted) {
      if (now - winner.deletedAt < TOMBSTONE_MAX_AGE_MS) {
        mergedTombstones.push({ memberId: id, deletedAt: winner.deletedAt })
      }
    } else if (winner.entry) {
      if (winner.entry.rosterKey === 'team') {
        mergedTeam.push(winner.entry.member)
      } else if (winner.entry.rosterKey === 'dead') {
        mergedDead.push(winner.entry.member)
      } else {
        mergedBox.push(winner.entry.member)
      }
    }
  }

  if (mergedTeam.length > 6) {
    const sorted = [...mergedTeam].sort(
      (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
    )
    const keepInTeam = new Set(sorted.slice(0, 6).map((m) => m.id))
    const overflow = []
    const capped = []
    for (const m of mergedTeam) {
      if (keepInTeam.has(m.id)) {
        capped.push(m)
      } else {
        overflow.push(m)
      }
    }
    return {
      team: capped,
      box: [...mergedBox, ...overflow],
      dead: mergedDead,
      _tombstones: mergedTombstones,
    }
  }

  return {
    team: mergedTeam,
    box: mergedBox,
    dead: mergedDead,
    _tombstones: mergedTombstones,
  }
}

function buildLocationMap(members) {
  const map = new Map()
  for (const m of members) {
    const loc = normalizeCatchLocation(m.catchLocation)
    if (loc && !map.has(loc)) {
      map.set(loc, m.id)
    }
  }
  return map
}

function collectAllMembers(rosters, playerIds) {
  const allMembers = {}
  for (const pid of playerIds) {
    const roster = rosters[pid] ?? createDefaultSoulLinkPlayerRoster()
    allMembers[pid] = [...roster.team, ...roster.box]
  }
  return allMembers
}

function clearInvalidPairIds(allMembers, playerIds, partnerOf) {
  for (const pid of playerIds) {
    const partnerIds = new Set(allMembers[partnerOf[pid]].map((m) => m.id))
    for (const m of allMembers[pid]) {
      if (m.pairId && !partnerIds.has(m.pairId)) {
        m.pairId = null
      }
    }
  }
}

function rebuildPairingsFromLocation(allMembers, playerIds, partnerOf) {
  const locationMaps = {}
  const memberById = {}
  for (const pid of playerIds) {
    locationMaps[pid] = buildLocationMap(allMembers[pid])
    memberById[pid] = new Map(allMembers[pid].map((m) => [m.id, m]))
  }

  for (const pid of playerIds) {
    const partnerId = partnerOf[pid]
    const partnerLocMap = locationMaps[partnerId]

    for (const m of allMembers[pid]) {
      const loc = normalizeCatchLocation(m.catchLocation)
      if (!loc) continue

      const partnerMemberId = partnerLocMap.get(loc)
      if (!partnerMemberId) continue

      const partnerMember = memberById[partnerId].get(partnerMemberId)
      if (!partnerMember) continue

      m.pairId = partnerMemberId
      partnerMember.pairId = m.id
    }
  }
}

function rebuildRosters(rosters, allMembers, playerIds) {
  const repaired = {}
  for (const pid of playerIds) {
    const roster = rosters[pid] ?? createDefaultSoulLinkPlayerRoster()
    const teamIds = new Set(roster.team.map((m) => m.id))
    const deadIds = new Set((roster.dead ?? []).map((m) => m.id))
    repaired[pid] = {
      team: allMembers[pid].filter((m) => teamIds.has(m.id)),
      box: allMembers[pid].filter(
        (m) => !teamIds.has(m.id) && !deadIds.has(m.id),
      ),
      dead: roster.dead ?? [],
      _tombstones: roster._tombstones ?? [],
    }
  }
  return repaired
}

export function repairPairings(rosters, playerIds) {
  if (playerIds.length < 2) return rosters

  const [pidA, pidB] = playerIds
  const partnerOf = { [pidA]: pidB, [pidB]: pidA }
  const allMembers = collectAllMembers(rosters, playerIds)

  clearInvalidPairIds(allMembers, playerIds, partnerOf)
  rebuildPairingsFromLocation(allMembers, playerIds, partnerOf)

  return rebuildRosters(rosters, allMembers, playerIds)
}

export function mergeRemoteState(localSoulLinkState, remoteState) {
  const localPlayer = localSoulLinkState.players.find((p) => p.isLocal)
  const remotePlayerId = localSoulLinkState.players.find((p) => !p.isLocal)?.id

  if (!localPlayer || !remotePlayerId) {
    return localSoulLinkState
  }

  const mergedPlayers = localSoulLinkState.players.map((player) => {
    if (player.isLocal) return player
    const remoteVersion = remoteState.players.find((p) => p.id === player.id)
    return remoteVersion ? { ...player, name: remoteVersion.name } : player
  })

  const playerIds = [localPlayer.id, remotePlayerId]
  const mergedRosters = {}

  for (const pid of playerIds) {
    const localRoster =
      localSoulLinkState.rosters[pid] ?? createDefaultSoulLinkPlayerRoster()
    const remoteRoster = remoteState.rosters?.[pid] ?? localRoster
    mergedRosters[pid] = mergePlayerRoster(localRoster, remoteRoster)
  }

  return {
    ...localSoulLinkState,
    players: mergedPlayers,
    rosters: repairPairings(mergedRosters, playerIds),
  }
}

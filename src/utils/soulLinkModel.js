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
    updatedAt: null,
  }
}

export function createDefaultSoulLinkProgress() {
  return {
    [SOUL_LINK_PLAYER_IDS.LOCAL]: createDefaultSoulLinkPlayerProgress(),
    [SOUL_LINK_PLAYER_IDS.PARTNER]: createDefaultSoulLinkPlayerProgress(),
  }
}

function createDefaultSoulLinkNotificationSettings() {
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

function createDefaultSoulLinkActivity() {
  return {
    syncState: SOUL_LINK_SYNC_STATES.LOCAL_ONLY,
    lastUpdatedAt: null,
    recentEntries: [],
  }
}

function createDefaultSoulLinkSync() {
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
    progress: soulLinkState.progress,
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

function getAllRosterIds(
  localMembers,
  remoteMembers,
  localTombstones,
  remoteTombstones,
) {
  return new Set([
    ...localMembers.keys(),
    ...remoteMembers.keys(),
    ...localTombstones.keys(),
    ...remoteTombstones.keys(),
  ])
}

function resolveWinners(
  allIds,
  localMembers,
  remoteMembers,
  localTombstones,
  remoteTombstones,
) {
  const winners = new Map()
  const tombstones = []
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
        tombstones.push({ memberId: id, deletedAt: winner.deletedAt })
      }
      continue
    }

    if (winner.entry) {
      winners.set(id, winner.entry)
    }
  }

  return { winners, tombstones }
}

function buildOrderedList(rosterKey, winners, localRoster, remoteRoster) {
  const list = []
  const placed = new Set()

  for (const source of [remoteRoster, localRoster]) {
    for (const m of source[rosterKey] ?? []) {
      if (placed.has(m.id)) continue
      const entry = winners.get(m.id)
      if (entry && entry.rosterKey === rosterKey) {
        list.push(entry.member)
        placed.add(m.id)
      }
    }
  }

  for (const [id, entry] of winners) {
    if (entry.rosterKey === rosterKey && !placed.has(id)) {
      list.push(entry.member)
    }
  }

  return list
}

function collectMergedRoster(
  allIds,
  localMembers,
  remoteMembers,
  localTombstones,
  remoteTombstones,
  localRoster,
  remoteRoster,
) {
  const { winners, tombstones } = resolveWinners(
    allIds,
    localMembers,
    remoteMembers,
    localTombstones,
    remoteTombstones,
  )

  return {
    team: buildOrderedList('team', winners, localRoster, remoteRoster),
    box: buildOrderedList('box', winners, localRoster, remoteRoster),
    dead: buildOrderedList('dead', winners, localRoster, remoteRoster),
    _tombstones: tombstones,
  }
}

function capMergedTeam(mergedRoster) {
  if (mergedRoster.team.length <= 6) return mergedRoster

  const sorted = [...mergedRoster.team].sort(
    (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
  )
  const keepInTeam = new Set(sorted.slice(0, 6).map((member) => member.id))
  const cappedTeam = []
  const overflow = []

  for (const member of mergedRoster.team) {
    if (keepInTeam.has(member.id)) {
      cappedTeam.push(member)
    } else {
      overflow.push(member)
    }
  }

  return {
    team: cappedTeam,
    box: [...mergedRoster.box, ...overflow],
    dead: mergedRoster.dead,
    _tombstones: mergedRoster._tombstones,
  }
}

function deduplicateByCatchLocation(mergedRoster) {
  const allEntries = [
    ...mergedRoster.team.map((m) => ({ member: m, rosterKey: 'team' })),
    ...mergedRoster.box.map((m) => ({ member: m, rosterKey: 'box' })),
    ...mergedRoster.dead.map((m) => ({ member: m, rosterKey: 'dead' })),
  ]

  const byLocation = new Map()
  for (const entry of allEntries) {
    const loc = normalizeCatchLocation(entry.member.catchLocation)
    if (!loc) continue
    if (!byLocation.has(loc)) {
      byLocation.set(loc, [])
    }
    byLocation.get(loc).push(entry)
  }

  const idsToRemove = new Set()
  const newTombstones = []
  const now = Date.now()

  for (const entries of byLocation.values()) {
    if (entries.length <= 1) continue

    entries.sort(
      (a, b) => (b.member.updatedAt ?? 0) - (a.member.updatedAt ?? 0),
    )

    for (let i = 1; i < entries.length; i++) {
      idsToRemove.add(entries[i].member.id)
      newTombstones.push({
        memberId: entries[i].member.id,
        deletedAt: now,
      })
    }
  }

  if (idsToRemove.size === 0) return mergedRoster

  return {
    team: mergedRoster.team.filter((m) => !idsToRemove.has(m.id)),
    box: mergedRoster.box.filter((m) => !idsToRemove.has(m.id)),
    dead: mergedRoster.dead.filter((m) => !idsToRemove.has(m.id)),
    _tombstones: [...mergedRoster._tombstones, ...newTombstones],
  }
}

export function mergeRosterMembers(localRoster, remoteRoster) {
  const localMembers = buildMemberMap(localRoster)
  const remoteMembers = buildMemberMap(remoteRoster)
  const localTombstones = buildTombstoneMap(localRoster)
  const remoteTombstones = buildTombstoneMap(remoteRoster)
  const allIds = getAllRosterIds(
    localMembers,
    remoteMembers,
    localTombstones,
    remoteTombstones,
  )
  const mergedRoster = collectMergedRoster(
    allIds,
    localMembers,
    remoteMembers,
    localTombstones,
    remoteTombstones,
    localRoster,
    remoteRoster,
  )

  return capMergedTeam(mergedRoster)
}

export function mergePlayerRoster(localRoster, remoteRoster) {
  const merged = mergeRosterMembers(localRoster, remoteRoster)
  return deduplicateByCatchLocation(merged)
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
    allMembers[pid] = [...roster.team, ...roster.box, ...(roster.dead ?? [])]
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
      dead: allMembers[pid].filter((m) => deadIds.has(m.id)),
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

  const mergedProgress = {}
  for (const pid of playerIds) {
    const localProgress =
      localSoulLinkState.progress[pid] ?? createDefaultSoulLinkPlayerProgress()
    const remoteProgress =
      remoteState.progress?.[pid] ?? createDefaultSoulLinkPlayerProgress()
    const localTs = localProgress.updatedAt ?? 0
    const remoteTs = remoteProgress.updatedAt ?? 0
    mergedProgress[pid] = localTs >= remoteTs ? localProgress : remoteProgress
  }

  return {
    ...localSoulLinkState,
    players: mergedPlayers,
    rosters: repairPairings(mergedRosters, playerIds),
    progress: mergedProgress,
  }
}

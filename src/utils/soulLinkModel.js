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

export const SOUL_LINK_NOTIFICATION_TYPES = {
  PARTNER_UPDATE: 'partner-update',
  GYM_PROGRESS: 'gym-progress',
  MEMBER_UPDATE: 'member-update',
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
    ...overrides,
  }
}

export function createDefaultSoulLinkPlayerRoster() {
  return {
    team: [],
    box: [],
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

export function createDefaultSoulLinkChangeSet() {
  return {
    id: null,
    sessionId: null,
    actorPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
    createdAt: null,
    baseVersion: null,
    operations: [],
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

export function createDefaultSoulLinkActivityEntry(overrides = {}) {
  return {
    id: null,
    type: SOUL_LINK_NOTIFICATION_TYPES.PARTNER_UPDATE,
    actorPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
    createdAt: null,
    message: null,
    readAt: null,
    entityType: null,
    entityId: null,
    ...overrides,
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
  return Array.from(
    { length },
    () =>
      INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)],
  ).join('')
}

export function buildRemoteState(soulLinkState) {
  return {
    metadata: soulLinkState.metadata,
    players: soulLinkState.players.map(({ id, name }) => ({ id, name })),
    rosters: soulLinkState.rosters,
  }
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

  const mergedRosters = {
    ...localSoulLinkState.rosters,
    [remotePlayerId]:
      remoteState.rosters?.[remotePlayerId] ??
      localSoulLinkState.rosters[remotePlayerId],
  }

  return {
    ...localSoulLinkState,
    players: mergedPlayers,
    rosters: mergedRosters,
  }
}

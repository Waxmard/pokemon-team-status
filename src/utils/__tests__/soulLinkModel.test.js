import { describe, expect, it } from 'vitest'
import {
  createDefaultSoulLinkActivityEntry,
  createDefaultSoulLinkChangeSet,
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkMember,
  createDefaultSoulLinkState,
  SOUL_LINK_NOTIFICATION_TYPES,
  SOUL_LINK_PLAYER_IDS,
  SOUL_LINK_SYNC_STATES,
} from '../soulLinkModel.js'

describe('soulLinkModel helpers', () => {
  it('creates a practical default Soul Link state shape', () => {
    expect(createDefaultSoulLinkState()).toEqual({
      metadata: {
        sessionId: null,
        inviteCode: null,
        name: null,
        createdAt: null,
      },
      players: [
        { id: 'player-1', name: 'Player 1', isLocal: true },
        { id: 'player-2', name: 'Player 2', isLocal: false },
      ],
      rosters: {
        'player-1': {
          team: [],
          box: [],
        },
        'player-2': {
          team: [],
          box: [],
        },
      },
      progress: {
        'player-1': {
          defeatedGyms: [],
          pinnedGym: null,
        },
        'player-2': {
          defeatedGyms: [],
          pinnedGym: null,
        },
      },
      sync: {
        version: 1,
        pendingChangeSets: [],
        lastAppliedChangeSetId: null,
      },
      activity: {
        syncState: SOUL_LINK_SYNC_STATES.LOCAL_ONLY,
        lastUpdatedAt: null,
        recentEntries: [],
      },
      local: {
        devicePlayerId: 'player-1',
        preferredPlayerId: 'player-1',
        cachedPlayerSlot: 'player-1',
        sessionPreference: 'soul-link',
        notifications: {
          enabled: true,
          partnerUpdates: true,
          gymProgress: true,
          memberChanges: true,
        },
      },
    })
  })

  it('creates Soul Link members with explicit pairing fields', () => {
    expect(
      createDefaultSoulLinkMember({
        id: 'member-1',
        speciesName: 'Bulbasaur',
        ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      }),
    ).toEqual({
      id: 'member-1',
      speciesName: 'Bulbasaur',
      nickname: null,
      catchLocation: null,
      ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      pairId: null,
      isDead: false,
    })
  })

  it('creates sync and activity records with stable defaults', () => {
    expect(createDefaultSoulLinkChangeSet()).toEqual({
      id: null,
      sessionId: null,
      actorPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
      createdAt: null,
      baseVersion: null,
      operations: [],
    })

    expect(
      createDefaultSoulLinkActivityEntry({
        id: 'activity-1',
        type: SOUL_LINK_NOTIFICATION_TYPES.GYM_PROGRESS,
      }),
    ).toEqual({
      id: 'activity-1',
      type: SOUL_LINK_NOTIFICATION_TYPES.GYM_PROGRESS,
      actorPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      createdAt: null,
      message: null,
      readAt: null,
      entityType: null,
      entityId: null,
    })
  })

  it('keeps local preferences scoped to device/session concerns', () => {
    expect(createDefaultSoulLinkLocalPreferences()).toEqual({
      devicePlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
      preferredPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
      cachedPlayerSlot: SOUL_LINK_PLAYER_IDS.LOCAL,
      sessionPreference: 'soul-link',
      notifications: {
        enabled: true,
        partnerUpdates: true,
        gymProgress: true,
        memberChanges: true,
      },
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkMember,
  createDefaultSoulLinkState,
  mergePlayerRoster,
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
          _tombstones: [],
        },
        'player-2': {
          team: [],
          box: [],
          _tombstones: [],
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
      updatedAt: null,
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

const BASE_TS = Date.now() - 60000

function member(id, overrides = {}) {
  return { id, speciesName: 'Pikachu', updatedAt: BASE_TS, ...overrides }
}

function emptyRoster(tombstones = []) {
  return { team: [], box: [], _tombstones: tombstones }
}

describe('mergePlayerRoster', () => {
  it('keeps local member when local is newer', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS + 200, nickname: 'Local' })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [member('a', { updatedAt: BASE_TS + 100, nickname: 'Remote' })],
      box: [],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(1)
    expect(result.team[0].nickname).toBe('Local')
  })

  it('takes remote member when remote is newer', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS + 100, nickname: 'Local' })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [member('a', { updatedAt: BASE_TS + 200, nickname: 'Remote' })],
      box: [],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(1)
    expect(result.team[0].nickname).toBe('Remote')
  })

  it('keeps member that only exists locally', () => {
    const local = {
      team: [member('a')],
      box: [],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, emptyRoster())
    expect(result.team).toHaveLength(1)
    expect(result.team[0].id).toBe('a')
  })

  it('adds member that only exists remotely', () => {
    const remote = {
      team: [],
      box: [member('a')],
      _tombstones: [],
    }
    const result = mergePlayerRoster(emptyRoster(), remote)
    expect(result.box).toHaveLength(1)
    expect(result.box[0].id).toBe('a')
  })

  it('deletes member when tombstone is newer than active member', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS + 100 })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [],
      box: [],
      _tombstones: [{ memberId: 'a', deletedAt: BASE_TS + 200 }],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(0)
    expect(result._tombstones).toHaveLength(1)
    expect(result._tombstones[0].memberId).toBe('a')
  })

  it('keeps member when active is newer than tombstone', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS + 200 })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [],
      box: [],
      _tombstones: [{ memberId: 'a', deletedAt: BASE_TS + 100 }],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(1)
    expect(result.team[0].id).toBe('a')
    expect(result._tombstones).toHaveLength(0)
  })

  it('uses winner rosterKey when member is in different keys', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS + 100 })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [],
      box: [member('a', { updatedAt: BASE_TS + 200 })],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(0)
    expect(result.box).toHaveLength(1)
    expect(result.box[0].id).toBe('a')
  })

  it('prefers local on timestamp tie', () => {
    const local = {
      team: [member('a', { updatedAt: BASE_TS, nickname: 'Local' })],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [member('a', { updatedAt: BASE_TS, nickname: 'Remote' })],
      box: [],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team[0].nickname).toBe('Local')
  })

  it('cleans up tombstones older than 7 days', () => {
    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000
    const local = {
      team: [],
      box: [],
      _tombstones: [
        { memberId: 'old', deletedAt: eightDaysAgo },
        { memberId: 'recent', deletedAt: oneDayAgo },
      ],
    }
    const result = mergePlayerRoster(local, emptyRoster())
    expect(result._tombstones).toHaveLength(1)
    expect(result._tombstones[0].memberId).toBe('recent')
  })

  it('merges independent members from both sides', () => {
    const local = {
      team: [member('a')],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [],
      box: [member('b')],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(1)
    expect(result.team[0].id).toBe('a')
    expect(result.box).toHaveLength(1)
    expect(result.box[0].id).toBe('b')
  })
})

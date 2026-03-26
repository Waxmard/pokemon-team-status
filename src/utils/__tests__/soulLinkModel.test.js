import { describe, expect, it } from 'vitest'
import {
  createDefaultSoulLinkLocalPreferences,
  createDefaultSoulLinkMember,
  createDefaultSoulLinkPlayerRoster,
  createDefaultSoulLinkState,
  mergePlayerRoster,
  repairPairings,
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
          dead: [],
          _tombstones: [],
        },
        'player-2': {
          team: [],
          box: [],
          dead: [],
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

  it('enforces team cap of 6 by overflowing newest members to box', () => {
    const local = {
      team: [
        member('a', { updatedAt: BASE_TS }),
        member('b', { updatedAt: BASE_TS + 1 }),
        member('c', { updatedAt: BASE_TS + 2 }),
        member('d', { updatedAt: BASE_TS + 3 }),
        member('e', { updatedAt: BASE_TS + 4 }),
        member('f', { updatedAt: BASE_TS + 5 }),
      ],
      box: [],
      _tombstones: [],
    }
    const remote = {
      team: [
        member('g', { updatedAt: BASE_TS + 10 }),
        member('h', { updatedAt: BASE_TS + 11 }),
      ],
      box: [],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, remote)
    expect(result.team).toHaveLength(6)
    expect(result.box).toHaveLength(2)
    const teamIds = result.team.map((m) => m.id)
    expect(teamIds).toContain('a')
    expect(teamIds).toContain('b')
    expect(teamIds).toContain('c')
    expect(teamIds).toContain('d')
    expect(teamIds).toContain('e')
    expect(teamIds).toContain('f')
    const boxIds = result.box.map((m) => m.id)
    expect(boxIds).toContain('g')
    expect(boxIds).toContain('h')
  })

  it('does not modify team when at or under cap', () => {
    const local = {
      team: [member('a'), member('b'), member('c')],
      box: [member('d')],
      _tombstones: [],
    }
    const result = mergePlayerRoster(local, emptyRoster())
    expect(result.team).toHaveLength(3)
    expect(result.box).toHaveLength(1)
  })
})

describe('repairPairings', () => {
  const P1 = SOUL_LINK_PLAYER_IDS.LOCAL
  const P2 = SOUL_LINK_PLAYER_IDS.PARTNER
  const playerIds = [P1, P2]

  function roster(team = [], box = [], tombstones = []) {
    return { team, box, _tombstones: tombstones }
  }

  function slMember(id, overrides = {}) {
    return {
      id,
      speciesName: 'Pikachu',
      updatedAt: BASE_TS,
      pairId: null,
      catchLocation: null,
      ...overrides,
    }
  }

  it('clears pairId pointing to non-existent partner member', () => {
    const rosters = {
      [P1]: roster([slMember('a', { pairId: 'missing' })]),
      [P2]: roster([slMember('b')]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBeNull()
  })

  it('rebuilds bidirectional pairings from matching catchLocation', () => {
    const rosters = {
      [P1]: roster([slMember('a', { catchLocation: 'Route 1' })]),
      [P2]: roster([slMember('b', { catchLocation: 'route 1' })]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBe('b')
    expect(result[P2].team[0].pairId).toBe('a')
  })

  it('clears stale pairId and rebuilds from catchLocation', () => {
    const rosters = {
      [P1]: roster([
        slMember('a', { pairId: 'old', catchLocation: 'Route 2' }),
      ]),
      [P2]: roster([
        slMember('b', { catchLocation: 'Route 2' }),
        slMember('c', { catchLocation: 'Route 3' }),
      ]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBe('b')
    expect(result[P2].team[0].pairId).toBe('a')
  })

  it('does not modify valid pairings', () => {
    const rosters = {
      [P1]: roster([slMember('a', { pairId: 'b', catchLocation: 'Route 1' })]),
      [P2]: roster([slMember('b', { pairId: 'a', catchLocation: 'Route 1' })]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBe('b')
    expect(result[P2].team[0].pairId).toBe('a')
  })

  it('preserves tombstones untouched', () => {
    const tombstones = [{ memberId: 'x', deletedAt: BASE_TS }]
    const rosters = {
      [P1]: roster([], [], tombstones),
      [P2]: roster(),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1]._tombstones).toEqual(tombstones)
  })

  it('handles members in box for pairing', () => {
    const rosters = {
      [P1]: roster([], [slMember('a', { catchLocation: 'Cave' })]),
      [P2]: roster([slMember('b', { catchLocation: 'cave' })]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].box[0].pairId).toBe('b')
    expect(result[P2].team[0].pairId).toBe('a')
  })

  it('first match wins when duplicate catchLocations exist', () => {
    const rosters = {
      [P1]: roster([
        slMember('a1', { catchLocation: 'Route 1' }),
        slMember('a2', { catchLocation: 'Route 1' }),
      ]),
      [P2]: roster([slMember('b', { catchLocation: 'Route 1' })]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBe('b')
    expect(result[P2].team[0].pairId).toBe('a1')
  })

  it('returns rosters unchanged when no players have pairIds or catchLocations', () => {
    const rosters = {
      [P1]: roster([slMember('a'), slMember('b')]),
      [P2]: roster([slMember('c')]),
    }
    const result = repairPairings(rosters, playerIds)
    expect(result[P1].team[0].pairId).toBeNull()
    expect(result[P1].team[1].pairId).toBeNull()
    expect(result[P2].team[0].pairId).toBeNull()
  })
})

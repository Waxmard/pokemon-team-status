import { describe, expect, it } from 'vitest'
import { SOUL_LINK_PLAYER_IDS } from '../soulLinkModel.js'
import {
  assertPlayerIdInSet,
  assertRosterKey,
  assertUniquePlayerIds,
  getPlayerIdsFromPlayers,
  normalizeCreateLocalRunOptions,
  normalizeLocalPreferences,
  normalizePlayerScopedRecords,
  normalizePlayers,
  normalizeRosterMembers,
  normalizeRosters,
  sanitizeSoulLinkProgressForRules,
  sanitizeSoulLinkRosterMemberForRules,
  sanitizeSoulLinkRostersForRules,
} from '../soulLinkNormalization.js'

const LOCAL = SOUL_LINK_PLAYER_IDS.LOCAL
const PARTNER = SOUL_LINK_PLAYER_IDS.PARTNER

function makePlayers(overrides = {}) {
  return [
    { id: LOCAL, name: 'Player 1', isLocal: true, ...overrides.local },
    { id: PARTNER, name: 'Player 2', isLocal: false, ...overrides.partner },
  ]
}

describe('getPlayerIdsFromPlayers', () => {
  it('extracts IDs from player array', () => {
    const ids = getPlayerIdsFromPlayers(makePlayers())
    expect(ids).toEqual([LOCAL, PARTNER])
  })
})

describe('assertUniquePlayerIds', () => {
  it('returns a Set of IDs for valid input', () => {
    const result = assertUniquePlayerIds(makePlayers(), 'test')
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(2)
  })

  it('throws on empty array', () => {
    expect(() => assertUniquePlayerIds([], 'test')).toThrow(
      'at least one Soul Link player',
    )
  })

  it('throws on duplicate IDs', () => {
    const dupes = [
      { id: 'same', name: 'A', isLocal: true },
      { id: 'same', name: 'B', isLocal: false },
    ]
    expect(() => assertUniquePlayerIds(dupes, 'test')).toThrow(
      'unique Soul Link player ids',
    )
  })
})

describe('assertPlayerIdInSet', () => {
  const validSet = new Set([LOCAL, PARTNER])

  it('returns the ID when valid', () => {
    expect(assertPlayerIdInSet(LOCAL, validSet, 'test')).toBe(LOCAL)
  })

  it('throws when ID is not in set', () => {
    expect(() => assertPlayerIdInSet('unknown-id', validSet, 'test')).toThrow(
      'valid Soul Link player id',
    )
  })

  it('uses custom label in error message', () => {
    expect(() =>
      assertPlayerIdInSet('bad', validSet, 'test', 'device player id'),
    ).toThrow('valid Soul Link device player id')
  })
})

describe('assertRosterKey', () => {
  it('accepts team, box, and dead', () => {
    expect(assertRosterKey('team', 'test')).toBe('team')
    expect(assertRosterKey('box', 'test')).toBe('box')
    expect(assertRosterKey('dead', 'test')).toBe('dead')
  })

  it('throws on invalid keys', () => {
    expect(() => assertRosterKey('bench', 'test')).toThrow(
      'roster key of team, box, or dead',
    )
  })
})

describe('normalizePlayers', () => {
  it('returns players, playerIdSet, and localPlayerId', () => {
    const result = normalizePlayers(makePlayers(), 'test')

    expect(result.players).toHaveLength(2)
    expect(result.playerIdSet).toBeInstanceOf(Set)
    expect(result.localPlayerId).toBe(LOCAL)
  })

  it('clones the input (result is independent frozen copy)', () => {
    const original = makePlayers()
    const result = normalizePlayers(original, 'test')

    // Result is frozen (deep clone via cloneValue)
    expect(Object.isFrozen(result.players[0])).toBe(true)
    // Original is not frozen
    expect(Object.isFrozen(original[0])).toBe(false)
  })

  it('throws when no local player exists', () => {
    const players = [
      { id: LOCAL, name: 'A', isLocal: false },
      { id: PARTNER, name: 'B', isLocal: false },
    ]
    expect(() => normalizePlayers(players, 'test')).toThrow(
      'exactly one local Soul Link player',
    )
  })

  it('throws when multiple local players exist', () => {
    const players = [
      { id: LOCAL, name: 'A', isLocal: true },
      { id: PARTNER, name: 'B', isLocal: true },
    ]
    expect(() => normalizePlayers(players, 'test')).toThrow(
      'exactly one local Soul Link player',
    )
  })
})

describe('normalizePlayerScopedRecords', () => {
  const playerIds = [LOCAL, PARTNER]

  it('fills defaults for missing player IDs', () => {
    const factory = () => ({ defeatedGyms: [], pinnedGym: null })
    const result = normalizePlayerScopedRecords({}, playerIds, factory, 'test')

    expect(result[LOCAL]).toEqual({ defeatedGyms: [], pinnedGym: null })
    expect(result[PARTNER]).toEqual({ defeatedGyms: [], pinnedGym: null })
  })

  it('merges existing records over defaults', () => {
    const factory = () => ({ defeatedGyms: [], pinnedGym: null })
    const existing = {
      [LOCAL]: { defeatedGyms: ['fire'], pinnedGym: 'water' },
    }
    const result = normalizePlayerScopedRecords(
      existing,
      playerIds,
      factory,
      'test',
    )

    expect(result[LOCAL].defeatedGyms).toEqual(['fire'])
    expect(result[PARTNER]).toEqual({ defeatedGyms: [], pinnedGym: null })
  })

  it('throws on unknown player IDs', () => {
    const records = { 'unknown-id': {} }
    expect(() =>
      normalizePlayerScopedRecords(records, playerIds, () => ({}), 'test'),
    ).toThrow('valid Soul Link player id')
  })

  it('handles null records input', () => {
    const result = normalizePlayerScopedRecords(
      null,
      playerIds,
      () => 'default',
      'test',
    )
    expect(result[LOCAL]).toBe('default')
    expect(result[PARTNER]).toBe('default')
  })
})

describe('normalizeLocalPreferences', () => {
  const playerIdSet = new Set([LOCAL, PARTNER])

  it('merges with defaults', () => {
    const result = normalizeLocalPreferences(
      undefined,
      playerIdSet,
      LOCAL,
      'test',
    )

    expect(result.devicePlayerId).toBe(LOCAL)
    expect(result.preferredPlayerId).toBe(LOCAL)
    expect(result.notifications).toBeDefined()
    expect(result.notifications.enabled).toBe(true)
  })

  it('preserves custom notification settings', () => {
    const local = {
      devicePlayerId: LOCAL,
      preferredPlayerId: LOCAL,
      cachedPlayerSlot: LOCAL,
      notifications: { enabled: false },
    }
    const result = normalizeLocalPreferences(local, playerIdSet, LOCAL, 'test')

    expect(result.notifications.enabled).toBe(false)
    expect(result.notifications.partnerUpdates).toBe(true)
  })

  it('throws when devicePlayerId does not match localPlayerId', () => {
    const local = {
      devicePlayerId: PARTNER,
      preferredPlayerId: LOCAL,
      cachedPlayerSlot: LOCAL,
    }
    expect(() =>
      normalizeLocalPreferences(local, playerIdSet, LOCAL, 'test'),
    ).toThrow('devicePlayerId to match the local Soul Link player')
  })

  it('throws when preferredPlayerId is invalid', () => {
    const local = {
      devicePlayerId: LOCAL,
      preferredPlayerId: 'invalid',
      cachedPlayerSlot: LOCAL,
    }
    expect(() =>
      normalizeLocalPreferences(local, playerIdSet, LOCAL, 'test'),
    ).toThrow('valid Soul Link preferred player id')
  })
})

describe('normalizeRosterMembers', () => {
  it('stamps ownerPlayerId on each member', () => {
    const members = [{ id: 'a', speciesName: 'Pikachu' }]
    const result = normalizeRosterMembers(members, LOCAL)

    expect(result[0].ownerPlayerId).toBe(LOCAL)
  })

  it('defaults updatedAt to 0', () => {
    const members = [{ id: 'a' }]
    const result = normalizeRosterMembers(members, LOCAL)

    expect(result[0].updatedAt).toBe(0)
  })

  it('preserves existing updatedAt', () => {
    const members = [{ id: 'a', updatedAt: 12345 }]
    const result = normalizeRosterMembers(members, LOCAL)

    expect(result[0].updatedAt).toBe(12345)
  })

  it('handles null/undefined input', () => {
    expect(normalizeRosterMembers(null, LOCAL)).toEqual([])
    expect(normalizeRosterMembers(undefined, LOCAL)).toEqual([])
  })

  it('clones the input', () => {
    const members = [{ id: 'a', speciesName: 'Pikachu' }]
    const result = normalizeRosterMembers(members, LOCAL)

    result[0].speciesName = 'Changed'
    expect(members[0].speciesName).toBe('Pikachu')
  })
})

describe('sanitizeSoulLinkRosterMemberForRules', () => {
  it('passes through null', () => {
    expect(sanitizeSoulLinkRosterMemberForRules(null, 'default')).toBeNull()
  })

  it('clones members without speciesName', () => {
    const member = { id: 'a', ownerPlayerId: LOCAL }
    const result = sanitizeSoulLinkRosterMemberForRules(member, 'default')

    expect(result).toEqual(member)
    expect(result).not.toBe(member)
  })

  it('preserves ownerPlayerId and speciesName after sanitization', () => {
    const member = {
      speciesName: 'Bulbasaur',
      ownerPlayerId: LOCAL,
      moves: ['grass', 'poison'],
    }
    const result = sanitizeSoulLinkRosterMemberForRules(member, 'default')

    expect(result.speciesName).toBe('Bulbasaur')
    expect(result.ownerPlayerId).toBe(LOCAL)
  })

  it('does not have a name property on the result', () => {
    const member = {
      speciesName: 'Bulbasaur',
      ownerPlayerId: LOCAL,
    }
    const result = sanitizeSoulLinkRosterMemberForRules(member, 'default')

    expect(result).not.toHaveProperty('name')
  })
})

describe('sanitizeSoulLinkRostersForRules', () => {
  it('sanitizes all roster keys for all players', () => {
    const rosters = {
      [LOCAL]: {
        team: [{ speciesName: 'Pikachu', ownerPlayerId: LOCAL, moves: [] }],
        box: [],
        dead: [],
      },
      [PARTNER]: {
        team: [],
        box: [{ speciesName: 'Eevee', ownerPlayerId: PARTNER, moves: [] }],
        dead: [],
      },
    }
    const result = sanitizeSoulLinkRostersForRules(rosters, 'default')

    expect(result[LOCAL].team).toHaveLength(1)
    expect(result[LOCAL].team[0].speciesName).toBe('Pikachu')
    expect(result[PARTNER].box).toHaveLength(1)
    expect(result[PARTNER].box[0].speciesName).toBe('Eevee')
  })
})

describe('sanitizeSoulLinkProgressForRules', () => {
  it('sanitizes defeatedGyms and pinnedGym per player', () => {
    const progress = {
      [LOCAL]: {
        defeatedGyms: ['fire', 'water', 'fairy'],
        pinnedGym: 'fairy',
        updatedAt: 100,
      },
      [PARTNER]: {
        defeatedGyms: ['grass'],
        pinnedGym: null,
        updatedAt: 200,
      },
    }
    const result = sanitizeSoulLinkProgressForRules(progress, 'default')

    expect(result[LOCAL].defeatedGyms).toContain('fire')
    expect(result[LOCAL].updatedAt).toBe(100)
    expect(result[PARTNER].defeatedGyms).toContain('grass')
  })

  it('sanitizes with pre-gen-6 rules (removes fairy)', () => {
    const progress = {
      [LOCAL]: {
        defeatedGyms: ['fire', 'fairy'],
        pinnedGym: 'fairy',
        updatedAt: 100,
      },
    }
    const result = sanitizeSoulLinkProgressForRules(progress, 'pre-gen-6')

    expect(result[LOCAL].defeatedGyms).not.toContain('fairy')
    expect(result[LOCAL].pinnedGym).toBeNull()
  })
})

describe('normalizeRosters', () => {
  const playerIds = [LOCAL, PARTNER]

  it('fills default rosters for missing players', () => {
    const result = normalizeRosters(undefined, playerIds, 'test')

    expect(result[LOCAL].team).toEqual([])
    expect(result[LOCAL].box).toEqual([])
    expect(result[LOCAL].dead).toEqual([])
    expect(result[LOCAL]._tombstones).toEqual([])
    expect(result[PARTNER]).toBeDefined()
  })

  it('normalizes members with ownerPlayerId', () => {
    const rosters = {
      [LOCAL]: {
        team: [{ id: 'a', speciesName: 'Pikachu' }],
        box: [],
      },
    }
    const result = normalizeRosters(rosters, playerIds, 'test')

    expect(result[LOCAL].team[0].ownerPlayerId).toBe(LOCAL)
    expect(result[LOCAL].team[0].updatedAt).toBe(0)
  })

  it('preserves tombstones', () => {
    const rosters = {
      [LOCAL]: {
        team: [],
        box: [],
        dead: [],
        _tombstones: [{ memberId: 'x', deletedAt: 1000 }],
      },
    }
    const result = normalizeRosters(rosters, playerIds, 'test')

    expect(result[LOCAL]._tombstones).toEqual([
      { memberId: 'x', deletedAt: 1000 },
    ])
  })
})

describe('normalizeCreateLocalRunOptions', () => {
  it('creates valid state with no options', () => {
    const result = normalizeCreateLocalRunOptions()

    expect(result.generationRules).toBeDefined()
    expect(result.players).toHaveLength(2)
    expect(result.rosters[LOCAL]).toBeDefined()
    expect(result.rosters[PARTNER]).toBeDefined()
    expect(result.progress[LOCAL]).toBeDefined()
    expect(result.local.devicePlayerId).toBe(LOCAL)
  })

  it('merges custom metadata', () => {
    const result = normalizeCreateLocalRunOptions({
      metadata: { sessionId: 'test-session' },
    })

    expect(result.metadata.sessionId).toBe('test-session')
  })

  it('normalizes custom generation rules', () => {
    const result = normalizeCreateLocalRunOptions({
      generationRules: 'pre-gen-6',
    })

    expect(result.generationRules).toBe('pre-gen-6')
  })

  it('normalizes custom rosters with ownerPlayerId', () => {
    const result = normalizeCreateLocalRunOptions({
      rosters: {
        [LOCAL]: {
          team: [{ id: 'a', speciesName: 'Pikachu' }],
          box: [],
          dead: [],
        },
      },
    })

    expect(result.rosters[LOCAL].team[0].ownerPlayerId).toBe(LOCAL)
  })
})

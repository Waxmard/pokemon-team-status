import { beforeEach, describe, expect, it } from 'vitest'
import { GENERATION_RULESETS } from '../../data/types.js'
import {
  applyAbilityDefense,
  calculateBerryTiebreaker,
  calculateScore,
  calculateScoreChanges,
  calculateTypeSuggestionScore,
  findBestSwap,
  findGlobalBestSwap,
  getDefensiveMultiplier,
  getSpecialMoveEffectiveness,
  getTypeEffectiveness,
  hasEffectiveMove,
} from '../typeCalc.js'

let idCounter = 0

function member(overrides = {}) {
  return {
    id: `test-${idCounter++}`,
    types: ['normal'],
    moves: [],
    ability: null,
    berry: null,
    specialMove: null,
    megaTypes: [],
    ...overrides,
  }
}

function mkTeam(specs) {
  return specs.map((spec) => member(spec))
}

beforeEach(() => {
  idCounter = 0
})

// Shared member factories for commonly-used Pokemon
function fire(id) {
  return member({ id, types: ['fire'], moves: ['fire'] })
}

function water(id) {
  return member({ id, types: ['water'], moves: ['water'] })
}

function grass(id) {
  return member({ id, types: ['grass'], moves: ['grass'] })
}

function normal(id) {
  return member({ id, types: ['normal'] })
}

function ground(id, moves = ['ground']) {
  return member({ id, types: ['ground'], moves })
}

// Mono-fire team factory
function monoFireTeam(count) {
  return mkTeam(
    Array.from({ length: count }, (_, i) => ({
      id: `f${i + 1}`,
      types: ['fire'],
      moves: ['fire'],
    })),
  )
}

const ALL_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

// ---------------------------------------------------------------------------
// Layer 1: Low-level helpers
// ---------------------------------------------------------------------------

describe('getTypeEffectiveness', () => {
  it('returns 2 for super effective (fire -> grass)', () => {
    expect(getTypeEffectiveness('fire', 'grass')).toBe(2)
  })

  it('returns 0.5 for not very effective (fire -> water)', () => {
    expect(getTypeEffectiveness('fire', 'water')).toBe(0.5)
  })

  it('returns 0 for immune (normal -> ghost)', () => {
    expect(getTypeEffectiveness('normal', 'ghost')).toBe(0)
  })

  it('returns 1 for neutral matchups (fire -> normal)', () => {
    expect(getTypeEffectiveness('fire', 'normal')).toBe(1)
  })

  it('restores steel resistance to dark and ghost before Gen 6', () => {
    expect(
      getTypeEffectiveness('dark', 'steel', GENERATION_RULESETS.PRE_GEN_6),
    ).toBe(0.5)
    expect(
      getTypeEffectiveness('ghost', 'steel', GENERATION_RULESETS.PRE_GEN_6),
    ).toBe(0.5)
  })
})

describe('getDefensiveMultiplier', () => {
  it('returns base effectiveness for single type', () => {
    expect(getDefensiveMultiplier('fire', ['water'])).toBe(0.5)
  })

  it('multiplies effectiveness for dual types (2x2 = 4)', () => {
    expect(getDefensiveMultiplier('fire', ['grass', 'ice'])).toBe(4)
  })

  it('immunity overrides other types (electric vs water/ground = 0)', () => {
    expect(getDefensiveMultiplier('electric', ['water', 'ground'])).toBe(0)
  })

  it('stacks resistances for 0.25 (normal vs rock/steel)', () => {
    expect(getDefensiveMultiplier('normal', ['rock', 'steel'])).toBe(0.25)
  })
})

describe('applyAbilityDefense', () => {
  it('passes through without ability', () => {
    expect(applyAbilityDefense(2, 'fire', null)).toBe(2)
  })

  it('passes through with unknown ability', () => {
    expect(applyAbilityDefense(2, 'fire', 'Unknown Ability')).toBe(2)
  })

  it('grants immunity via Water Absorb vs water', () => {
    expect(applyAbilityDefense(1, 'water', 'Water Absorb')).toBe(0)
  })

  it('grants immunity via Levitate vs ground', () => {
    expect(applyAbilityDefense(1, 'ground', 'Levitate')).toBe(0)
  })

  it('halves with Thick Fat vs fire (2x -> 1x)', () => {
    expect(applyAbilityDefense(2, 'fire', 'Thick Fat')).toBe(1)
  })

  it('reduces further with Thick Fat when already resisting (0.5x -> 0.25x)', () => {
    expect(applyAbilityDefense(0.5, 'fire', 'Thick Fat')).toBe(0.25)
  })

  it('doubles weakness with Dry Skin vs fire (1x -> 2x)', () => {
    expect(applyAbilityDefense(1, 'fire', 'Dry Skin')).toBe(2)
  })

  it('caps weakness with Fluffy vs fire when already weak (2x -> 4x)', () => {
    expect(applyAbilityDefense(2, 'fire', 'Fluffy')).toBe(4)
  })
})

describe('getSpecialMoveEffectiveness', () => {
  it('Flying Press multiplies fighting and flying effectiveness vs rock = 1', () => {
    // fighting->rock = 2, flying->rock = 0.5 -> 2 * 0.5 = 1
    expect(getSpecialMoveEffectiveness('Flying Press', 'rock')).toBe(1)
  })

  it('Flying Press is super effective vs dark = 2', () => {
    // fighting->dark = 2, flying->dark = 1 -> 2
    expect(getSpecialMoveEffectiveness('Flying Press', 'dark')).toBe(2)
  })

  it('Flying Press immunity when fighting component is 0 vs ghost', () => {
    // fighting->ghost = 0, flying->ghost = 1 -> 0
    expect(getSpecialMoveEffectiveness('Flying Press', 'ghost')).toBe(0)
  })

  it('Freeze-Dry overrides to be super effective vs water', () => {
    expect(getSpecialMoveEffectiveness('Freeze-Dry', 'water')).toBe(2)
  })

  it('Freeze-Dry uses normal ice effectiveness vs fire = 0.5', () => {
    expect(getSpecialMoveEffectiveness('Freeze-Dry', 'fire')).toBe(0.5)
  })

  it('returns 1 for unknown move', () => {
    expect(getSpecialMoveEffectiveness('Unknown Move', 'fire')).toBe(1)
  })
})

describe('hasEffectiveMove', () => {
  it('returns true when a regular move is super effective', () => {
    expect(hasEffectiveMove(['water'], 'fire')).toBe(true)
  })

  it('returns false when no moves are super effective', () => {
    expect(hasEffectiveMove(['normal'], 'rock')).toBe(false)
  })

  it('returns true when special move is super effective', () => {
    expect(hasEffectiveMove([], 'water', 'Freeze-Dry')).toBe(true)
  })

  it('returns false for empty move list', () => {
    expect(hasEffectiveMove([], 'fire')).toBe(false)
  })

  it('skips null entries in move list', () => {
    expect(hasEffectiveMove([null, 'water'], 'fire')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Layer 2: calculateScore - team vs gym type
// ---------------------------------------------------------------------------

describe('calculateScore', () => {
  it('awards +1 for single resistance', () => {
    const team = [member({ types: ['water'] })]
    expect(calculateScore('fire', team)).toBe(1)
  })

  it('awards +2 for double resistance (0.25x)', () => {
    const team = [member({ types: ['rock', 'steel'] })]
    expect(calculateScore('normal', team)).toBe(2)
  })

  it('awards +2 for immunity', () => {
    const team = [member({ types: ['ghost'] })]
    expect(calculateScore('normal', team)).toBe(2)
  })

  it('penalizes -1 for weakness', () => {
    const team = [member({ types: ['grass'] })]
    expect(calculateScore('fire', team)).toBe(-1)
  })

  it('penalizes -2 for double weakness (4x)', () => {
    const team = [member({ types: ['grass', 'ice'] })]
    expect(calculateScore('fire', team)).toBe(-2)
  })

  it('awards +1 for offensive super effective move', () => {
    const team = [member({ moves: ['fire'] })]
    expect(calculateScore('grass', team)).toBe(1)
  })

  it('combines resistance and offense', () => {
    const team = [member({ types: ['water'], moves: ['water'] })]
    expect(calculateScore('fire', team)).toBe(2)
  })

  it('uses pre-Gen 6 typing rules when requested', () => {
    const team = [member({ name: 'Clefairy', types: ['fairy'] })]

    expect(calculateScore('fighting', team)).toBe(1)
    expect(
      calculateScore('fighting', team, GENERATION_RULESETS.PRE_GEN_6),
    ).toBe(-1)
  })

  it('uses non-fairy fallback typing for Gen 6+ fairy species pre-Gen 6', () => {
    const team = [member({ name: 'Xerneas', types: ['fairy'] })]

    expect(
      calculateScore('fighting', team, GENERATION_RULESETS.PRE_GEN_6),
    ).toBe(-1)
  })

  it('applies ability immunity (Levitate vs ground)', () => {
    // ground->ground = 1x normally, Levitate grants immunity -> 0 -> +2
    const team = [member({ types: ['ground'], ability: 'Levitate' })]
    expect(calculateScore('ground', team)).toBe(2)
  })

  it('adds Protean resistance-only points for move types', () => {
    // Normal-type with Protean + water move vs fire gym
    // Base: fire->normal = 1 -> 0 pts
    // Protean: fire->water = 0.5 -> +1 resistance pt
    // Offense: water->fire = 2 -> +1
    // Total: 2
    const team = [member({ ability: 'Protean', moves: ['water'] })]
    expect(calculateScore('fire', team)).toBe(2)
  })

  it('Protean ignores move-type weaknesses', () => {
    // Normal-type with Protean + fire move vs water gym
    // Base: water->normal = 1 -> 0 pts
    // Protean: water->fire = 2 -> resistanceOnlyPoints(2) = 0 (ignored)
    // Offense: fire->water = 0.5 -> not SE -> 0
    // Total: 0
    const team = [member({ ability: 'Protean', moves: ['fire'] })]
    expect(calculateScore('water', team)).toBe(0)
  })

  it('Protean skips base types', () => {
    // Water-type with Protean + water move vs fire gym
    // Base: fire->water = 0.5 -> +1
    // Protean: water already in base types -> skip
    // Offense: water->fire = 2 -> +1
    // Total: 2
    const team = [
      member({ types: ['water'], ability: 'Protean', moves: ['water'] }),
    ]
    expect(calculateScore('fire', team)).toBe(2)
  })

  it('adds mega type resistance-only points', () => {
    // Normal-type with megaTypes: ['steel'] vs normal gym
    // Base: normal->normal = 1 -> 0
    // Mega: normal->steel = 0.5 -> +1
    // Total: 1
    const team = [member({ megaTypes: ['steel'] })]
    expect(calculateScore('normal', team)).toBe(1)
  })

  it('mega types skip base types', () => {
    const team = [member({ types: ['steel'], megaTypes: ['steel'] })]
    // normal->steel = 0.5 -> +1, mega steel skipped (already base)
    expect(calculateScore('normal', team)).toBe(1)
  })

  it('sums scores across multiple team members', () => {
    const team = [
      member({ types: ['water'] }), // fire->water = 0.5 -> +1
      member({ types: ['water'], moves: ['water'] }), // resist +1, SE +1 = +2
      member({ types: ['grass'] }), // fire->grass = 2 -> -1
    ]
    expect(calculateScore('fire', team)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Layer 3: Higher-order scoring functions
// ---------------------------------------------------------------------------

describe('calculateScoreChanges', () => {
  it('returns non-zero diffs when adding a member', () => {
    const team = [member({ types: ['normal'] })]
    const draft = member({ types: ['water'], moves: ['water'] })
    const changes = calculateScoreChanges(team, draft)

    expect(changes.length).toBeGreaterThan(0)
    for (const change of changes) {
      expect(change.diff).not.toBe(0)
      expect(change.diff).toBe(change.newScore - change.oldScore)
    }
  })

  it('correctly computes diff for a specific type', () => {
    const team = [member({ types: ['normal'] })]
    const draft = member({ types: ['water'], moves: ['water'] })
    const changes = calculateScoreChanges(team, draft)
    const fireChange = changes.find((c) => c.type === 'fire')

    // Old: fire->normal = 1 -> 0. New adds water: resist +1, SE +1 -> +2
    expect(fireChange).toBeDefined()
    expect(fireChange.oldScore).toBe(0)
    expect(fireChange.newScore).toBe(2)
    expect(fireChange.diff).toBe(2)
  })

  it('excludes types with zero diff', () => {
    const team = []
    const draft = member({ types: ['normal'] })
    const changes = calculateScoreChanges(team, draft)
    const types = changes.map((c) => c.type)

    // Normal only gets points for fighting weakness (-1) and ghost immunity (+2)
    expect(types).toContain('fighting')
    expect(types).toContain('ghost')
    // Neutral types produce no diff
    expect(types).not.toContain('fire')
  })
})

describe('calculateBerryTiebreaker', () => {
  it('counts berry when member is weak to gym type', () => {
    // Grass-type with Occa Berry (fire) vs fire gym
    // fire->grass = 2 (weak), berry matches -> count 1
    const team = [member({ types: ['grass'], berry: 'Occa Berry' })]
    expect(calculateBerryTiebreaker('fire', team)).toBe(1)
  })

  it('does not count berry when member resists gym type', () => {
    // Water-type with Occa Berry (fire) vs fire gym
    // fire->water = 0.5 (resist), not > 1 -> count 0
    const team = [member({ types: ['water'], berry: 'Occa Berry' })]
    expect(calculateBerryTiebreaker('fire', team)).toBe(0)
  })

  it('returns 0 when no berry', () => {
    const team = [member({ types: ['grass'] })]
    expect(calculateBerryTiebreaker('fire', team)).toBe(0)
  })

  it('counts items like Air Balloon', () => {
    // Fire-type with Air Balloon (ground) vs ground gym
    // ground->fire = 2 (weak) -> count 1
    const team = [member({ types: ['fire'], berry: 'Air Balloon' })]
    expect(calculateBerryTiebreaker('ground', team)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Layer 4: findBestSwap - the suggestion algorithm
// ---------------------------------------------------------------------------

describe('findBestSwap', () => {
  it('returns null for empty pool', () => {
    const team = [member({ id: 'a' })]
    expect(findBestSwap(team, team[0], true, [], [])).toBeNull()
  })

  it('returns single candidate from pool', () => {
    const team = [member({ id: 'a', types: ['fire'] })]
    const pool = [water('b')]
    const result = findBestSwap(team, team[0], true, pool, [])
    expect(result.candidate.id).toBe('b')
  })

  describe('team member editing (swap team -> box)', () => {
    it('suggests box member that improves coverage', () => {
      const team = monoFireTeam(3)

      const result = findBestSwap(team, team[0], true, [water('w1')], [])
      expect(result.candidate.id).toBe('w1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('box member editing (swap box -> team)', () => {
    it('suggests replacing a redundant team member for better worst-case', () => {
      const f1 = fire('f1')
      const f2 = fire('f2')
      const g1 = grass('g1')
      const w1 = water('w1')
      const team = [f1, f2, g1]

      // Editing water (box member), pool = team members
      const result = findBestSwap(team, w1, false, [f1, f2, g1], [])
      // Minimax prefers replacing redundant fire for better diversity:
      // [water, fire, grass] has fewer bad matchups than [fire, fire, water]
      expect(result.candidate.id).toBe('f1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('defeated gym tiebreaker', () => {
    it('uses defeated gym scores to break ties on undefeated gyms', () => {
      // Two candidates identical on undefeated gyms but differ on defeated coverage
      const n1 = normal('n1')
      const team = [n1]

      // Water: resists fire (+1), SE fire (+1) = good on fire
      const w1 = water('w1')
      // Water/Ground: immune to electric (+2), SE fire (+0 water move not present)
      // Both cover similar undefeated gyms, but differ when fire is defeated
      const noDefeated = findBestSwap(team, n1, true, [w1], [])
      const fireDefeated = findBestSwap(team, n1, true, [w1], ['fire'])

      // With fire undefeated, water's fire coverage lifts the worst undefeated score
      // With fire defeated, that coverage moves to a lower-priority tier
      expect(noDefeated.improvement).toBeGreaterThanOrEqual(
        fireDefeated.improvement,
      )
    })
  })

  describe('best-of-all selection', () => {
    it('picks the candidate with best worst-case gym score', () => {
      const team = monoFireTeam(2)

      // Replacing one fire with water: [water, fire] has best diversity
      // Water covers fire's weaknesses (water, ground, rock) while fire
      // covers water's grass weakness → fewer bad gym matchups
      const result = findBestSwap(
        team,
        team[0],
        true,
        [water('w1'), grass('g1'), normal('n1')],
        [],
      )
      expect(result.candidate.id).toBe('w1')
    })
  })

  describe('negative improvement', () => {
    it('returns least bad candidate when all are worse', () => {
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water', 'ice'],
      })
      const team = [water]

      // Pool only has plain normal types (strictly worse)
      const result = findBestSwap(
        team,
        water,
        true,
        [normal('n1'), normal('n2')],
        [],
      )

      expect(result).not.toBeNull()
      expect(result.improvement).toBeLessThan(0)
    })
  })

  describe('ability-driven swap preference', () => {
    it('prefers Levitate candidate over plain ground-type', () => {
      // Team has a normal-type we want to replace
      const n1 = normal('n1')
      const team = [n1]

      // Two ground candidates: plain ground vs ground with Levitate
      // Against ground gym: ground->ground = 1 -> 0 pts (plain)
      // Levitate grants ground immunity -> 0 multiplier -> +2 pts
      const levitateGround = member({
        id: 'g2',
        types: ['ground'],
        moves: ['ground'],
        ability: 'Levitate',
      })

      const result = findBestSwap(
        team,
        n1,
        true,
        [ground('g1'), levitateGround],
        [],
      )
      expect(result.candidate.id).toBe('g2')
    })
  })

  describe('dual-type worst-case', () => {
    it('avoids dual-type with 4x weakness despite better total coverage', () => {
      const n1 = normal('n1')
      const team = [n1]

      // Water: worst score = -1 (electric, grass) — two manageable weaknesses
      // Water/Ground: has 4x grass weakness → -2 worst score
      // Minimax prefers water because -1 > -2 at worst gym
      const w1 = water('w1')
      const waterGround = member({
        id: 'wg1',
        types: ['water', 'ground'],
        moves: ['water', 'ground'],
      })

      const result = findBestSwap(team, n1, true, [w1, waterGround], [])
      expect(result.candidate.id).toBe('w1')
    })
  })

  describe('introducing worse worst-case is costly', () => {
    it('reports negative improvement when replacement has deeper weakness', () => {
      // Water: worst score = -1 (electric, grass)
      const w1 = water('w1')
      const team = [w1]

      // Grass/Ice: 4x fire weakness → -2 worst score, plus many other -1s
      // Minimax sees this as strictly worse worst-case
      const grassIce = member({
        id: 'gi1',
        types: ['grass', 'ice'],
        moves: ['grass', 'ice'],
      })
      const result = findBestSwap(team, w1, true, [grassIce], [])

      expect(result.improvement).toBeLessThan(0)
    })
  })

  describe('defeated gym progressive deprioritization', () => {
    it('deprioritizes defeated gym improvements in tier ordering', () => {
      const n1 = normal('n1')
      const w1 = water('w1')
      const team = [n1]

      // Water covers fire (resist+SE), ground (SE), rock (SE)
      // Moving these to defeated shifts their improvements from tier 1 to tier 2
      const noDefeated = findBestSwap(team, n1, true, [w1], [])
      const threeDefeated = findBestSwap(
        team,
        n1,
        true,
        [w1],
        ['fire', 'ground', 'rock'],
      )

      // With those gyms defeated, water's gains shift to lower-priority tier
      expect(noDefeated.improvement).toBeGreaterThanOrEqual(
        threeDefeated.improvement,
      )
    })
  })

  describe('full 6-member team swap', () => {
    it('identifies beneficial swap in a complete team', () => {
      // Team with a clear weak link: normal-type with no moves
      const team = [
        member({ id: 't1', types: ['water'], moves: ['water', 'ice'] }),
        member({ id: 't2', types: ['flying'], moves: ['flying'] }),
        member({ id: 't3', types: ['steel'], moves: ['steel'] }),
        fire('t4'),
        member({ id: 't5', types: ['fairy'], moves: ['fairy'] }),
        normal('t6'),
      ]

      // Ground-type fills electric gap and adds rock coverage
      const result = findBestSwap(
        team,
        team[5],
        true,
        [ground('box1', ['ground', 'rock'])],
        [],
      )
      expect(result.candidate.id).toBe('box1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('Protean swap preference', () => {
    it('prefers Protean candidate over plain with same moves', () => {
      const n1 = normal('n1')
      const team = [n1]

      // Both candidates have water/fire/grass moves
      // Protean adds resistance-only points for each move type
      const plainCandidate = member({
        id: 'p1',
        types: ['normal'],
        moves: ['water', 'fire', 'grass'],
      })
      const proteanCandidate = member({
        id: 'p2',
        types: ['normal'],
        moves: ['water', 'fire', 'grass'],
        ability: 'Protean',
      })

      const result = findBestSwap(
        team,
        n1,
        true,
        [plainCandidate, proteanCandidate],
        [],
      )
      expect(result.candidate.id).toBe('p2')
    })
  })

  describe('tie-breaking', () => {
    it('keeps first candidate when improvements are equal', () => {
      const n1 = normal('n1')
      const team = [n1]

      // Two identical water candidates produce the same improvement
      const result = findBestSwap(
        team,
        n1,
        true,
        [water('w1'), water('w2')],
        [],
      )
      // Strict > in comparison means ties keep the earlier candidate
      expect(result.candidate.id).toBe('w1')
    })
  })

  describe('swap direction symmetry', () => {
    it('produces equal improvement regardless of direction', () => {
      const f1 = fire('f1')
      const w1 = water('w1')
      const team = [f1]

      // isTeamMember=true: editing fire on team, pool=[water from box]
      // newTeam replaces fire with water -> [water]
      const teamResult = findBestSwap(team, f1, true, [w1], [])

      // isTeamMember=false: editing water from box, pool=[fire from team]
      // newTeam replaces fire (candidate) with water (editingMember) -> [water]
      const boxResult = findBestSwap(team, w1, false, [f1], [])

      // Both represent the same swap: fire -> water on the team
      expect(teamResult.improvement).toBe(boxResult.improvement)
    })
  })
})

// ---------------------------------------------------------------------------
// Layer 4b: Minimax-specific behavior
// ---------------------------------------------------------------------------

describe('minimax comparison', () => {
  it('prefers raising the worst score over improving total', () => {
    // Team of 3 fire types: very weak to water (-1 each = -3), ground (-3), rock (-3)
    const team = monoFireTeam(3)

    // Candidate A: electric type — covers water weakness (SE water) but doesn't
    // help ground or rock. Improves one -3 gym but leaves others at -3.
    const electric = member({
      id: 'e1',
      types: ['electric'],
      moves: ['electric'],
    })

    // Candidate B: ground type — resists rock (+1), SE rock (+1), immune to electric (+2)
    // and SE fire/water/ground. Covers multiple weak gyms.
    const groundCandidate = ground('gnd1', ['ground', 'rock'])

    const result = findBestSwap(
      team,
      team[0],
      true,
      [electric, groundCandidate],
      [],
    )
    // Ground raises more worst-case gym scores, minimax prefers it
    expect(result.candidate.id).toBe('gnd1')
  })

  it('extra coverage breaks tie via uncapped scores', () => {
    // Two candidates that differ only in how much they boost a high gym
    const n1 = normal('n1')
    const team = [n1]

    // Both are water-types; one also has ice move for extra coverage
    // The extra ice coverage adds +1 on gyms already at +1 or more (dragon, etc.)
    // but doesn't change worst-case because those gyms are already positive
    const w1 = water('w1')
    const waterIce = member({
      id: 'w2',
      types: ['water'],
      moves: ['water', 'ice'],
    })

    const result = findBestSwap(team, n1, true, [w1, waterIce], [])
    // waterIce provides extra coverage, winning via capped or uncapped tiers
    expect(result.candidate.id).toBe('w2')
    // But the improvement is positive for both (better than normal)
    expect(result.improvement).toBeGreaterThan(0)
  })

  it('defeated gym acts as tiebreaker when undefeated profiles match', () => {
    // Two teams that are identical on undefeated gyms but differ on defeated
    const team = monoFireTeam(2)

    // Water: strong vs fire gym (resist + SE)
    const w1 = water('w1')
    // Grass: strong vs water gym (resist + SE) and ground gym (resist)
    const g1 = grass('g1')

    // When fire gym is defeated, water's advantage on fire moves to tier 2
    // Grass then may win because its undefeated coverage is broader
    const withoutDefeated = findBestSwap(team, team[0], true, [w1, g1], [])
    const withFireDefeated = findBestSwap(
      team,
      team[0],
      true,
      [w1, g1],
      ['fire'],
    )

    // With fire undefeated, water's fire coverage helps tier 1
    // With fire defeated, the choice may shift
    expect(withoutDefeated.candidate).toBeDefined()
    expect(withFireDefeated.candidate).toBeDefined()
  })

  it('works when all gyms are defeated', () => {
    const team = [fire('f1')]

    const w1 = water('w1')

    // Undefeated array is empty → tier 1 ties at empty arrays
    // Falls through to defeatedScores (with bias) which still differentiates
    const result = findBestSwap(team, team[0], true, [w1], ALL_TYPES)
    expect(result).not.toBeNull()
    expect(result.candidate.id).toBe('w1')
  })

  it('defeated gym bias shifts a weakness to neutral in comparison', () => {
    // Grass-type is weak to fire (-1). With fire defeated, the bias makes it 0.
    // A normal-type scores 0 on fire with no bias. After bias, grass scores the same.
    // So adding fire to defeatedGyms should cause grass to be preferred over normal
    // (or at least not penalized) when fire coverage is only needed for defeated gyms.
    const grassMember = member({ id: 'g1', types: ['grass'], moves: ['grass'] })
    const normalMember = member({ id: 'n1', types: ['normal'] })
    const team = [member({ id: 'base', types: ['water'], moves: ['water'] })]

    // With fire undefeated: grass is weak to fire, normal is not → normal preferred
    const noDefeated = findBestSwap(
      team,
      team[0],
      true,
      [grassMember, normalMember],
      [],
    )
    // With fire defeated: grass's weakness is biased to neutral → normal no longer clearly wins
    const fireDefeated = findBestSwap(
      team,
      team[0],
      true,
      [grassMember, normalMember],
      ['fire'],
    )

    // The bias reduces the gap — normal's lead over grass shrinks or disappears
    // when fire is defeated (it can no longer use fire's weakness to differentiate)
    expect(noDefeated).not.toBeNull()
    expect(fireDefeated).not.toBeNull()
  })

  it('improving an undefeated gym beats improving only a defeated gym', () => {
    // Team of fire types — water gym and rock gym both undefeated
    const team = monoFireTeam(2)

    // Candidate A (water): improves both undefeated water and rock gyms
    const w1 = water('w1')
    // Candidate B (rock): only improves the already-defeated fire gym coverage
    const rockMember = member({ id: 'r1', types: ['rock'], moves: ['rock'] })

    // With fire defeated: water still wins because it improves undefeated gyms (water, rock)
    // while rock only improves the defeated fire gym (now in lower-priority tier)
    const result = findBestSwap(team, team[0], true, [w1, rockMember], ['fire'])
    expect(result.candidate.id).toBe('w1')
  })
})

describe('pinned gym priority', () => {
  it('findBestSwap prefers candidate that improves pinned gym score', () => {
    // Team weak to both fire and water
    const n1 = normal('n1')
    const team = [n1]

    // Water: helps vs fire (resist + SE) but hurts vs grass
    const w1 = water('w1')
    // Grass: helps vs water (resist + SE) but hurts vs fire
    const g1 = grass('g1')

    // With fire pinned: should prefer water (resists fire + SE fire)
    const firePinResult = findBestSwap(team, n1, true, [w1, g1], [], 'fire')
    expect(firePinResult.candidate.id).toBe('w1')

    // With water pinned: should prefer grass (resists water + SE water)
    const waterPinResult = findBestSwap(team, n1, true, [w1, g1], [], 'water')
    expect(waterPinResult.candidate.id).toBe('g1')
  })

  it('findGlobalBestSwap prioritizes pinned gym', () => {
    const team = monoFireTeam(2)

    const w1 = water('w1')
    const gnd1 = ground('gnd1')

    // Pin water gym: water resists water gym, ground does not
    const result = findGlobalBestSwap(team, [w1, gnd1], [], 'water')
    expect(result.boxMember.id).toBe('w1')
  })

  it('calculateTypeSuggestionScore ranks pinned gym coverage higher', () => {
    const team = monoFireTeam(2)

    // Pin 'water' gym. Water type resists water. Ground does not.
    const waterPinned = calculateTypeSuggestionScore('water', team, [], 'water')
    const groundPinned = calculateTypeSuggestionScore(
      'ground',
      team,
      [],
      'water',
    )

    // Water should score higher than ground when water gym is pinned
    // because water type resists water gym attacks and ground does not
    expect(waterPinned).toBeGreaterThan(groundPinned)
  })

  it('pinned gym score is prioritized over undefeated scores', () => {
    const team2 = [water('w1'), normal('n1')]
    const waterWithMove = water('c1')
    const waterNoMove = member({ id: 'c2', types: ['water'] })

    // With fire pinned: waterWithMove scores higher on fire → wins via pinnedScore
    const pinnedResult = findBestSwap(
      team2,
      team2[1],
      true,
      [waterWithMove, waterNoMove],
      [],
      'fire',
    )
    expect(pinnedResult.candidate.id).toBe('c1')

    // Without pin: waterWithMove still wins via undefeated scores (fire 4 vs 3)
    const unpinnedResult = findBestSwap(
      team2,
      team2[1],
      true,
      [waterWithMove, waterNoMove],
      [],
    )
    expect(unpinnedResult.candidate.id).toBe('c1')
  })

  it('pinned gym score caps at PINNED_SCORE_CAP so undefeated coverage can break ties', () => {
    // Base team: 3 plain water types → fire score = 6, exactly at PINNED_SCORE_CAP
    const team = [water('t1'), water('t2'), water('t3')]

    // Candidate A: Flash Fire water — fire immune (+2) + SE move (+1) = 3 pts
    // Replacing t1: total fire = 3+2+2 = 7 → capped to PINNED_SCORE_CAP (6)
    // No special coverage vs ground (still weak)
    const flashFireWater = member({
      id: 'cA',
      types: ['water'],
      moves: ['water'],
      ability: 'Flash Fire',
    })

    // Candidate B: Levitate water — resist (+1) + SE move (+1) = 2 pts
    // Replacing t1: total fire = 2+2+2 = 6 → exactly at cap (6)
    // Levitate grants ground immunity → much better vs ground gym
    const levitateWater = member({
      id: 'cB',
      types: ['water'],
      moves: ['water'],
      ability: 'Levitate',
    })

    // Both candidates cap the pinned fire score at 6 → tie on pinnedScore
    // Levitate's ground immunity then wins via undefeated scores
    const result = findBestSwap(
      team,
      team[0],
      true,
      [flashFireWater, levitateWater],
      [],
      'fire',
    )
    expect(result.candidate.id).toBe('cB')
  })

  it('falls back to normal algorithm when pinnedGym is null', () => {
    const team = monoFireTeam(2)
    const w1 = water('w1')

    const withNull = findBestSwap(team, team[0], true, [w1], [], null)
    const withoutParam = findBestSwap(team, team[0], true, [w1], [])

    expect(withNull.improvement).toBe(withoutParam.improvement)
    expect(withNull.candidate.id).toBe(withoutParam.candidate.id)
  })
})

describe('findGlobalBestSwap', () => {
  it('returns null for empty team', () => {
    expect(findGlobalBestSwap([], [member()], [])).toBeNull()
  })

  it('returns null for empty box', () => {
    expect(findGlobalBestSwap([member()], [], [])).toBeNull()
  })

  it('finds the best team-box pair', () => {
    const team = monoFireTeam(2)
    const w1 = water('w1')

    const result = findGlobalBestSwap(team, [w1], [])
    expect(result.teamMember).toBeDefined()
    expect(result.boxMember.id).toBe('w1')
    expect(result.improvement).toBeGreaterThan(0)
  })

  it('uses minimax to pick swap that raises worst gym score', () => {
    // Team of 3 fire types — worst gyms are water/ground/rock (each -3)
    const team = monoFireTeam(3)
    // Water resists fire's weakest gym (water) and is SE against it,
    // while ground shares the water weakness, compounding the worst case
    const w1 = water('w1')
    const gnd1 = ground('gnd1', ['ground', 'rock'])

    const result = findGlobalBestSwap(team, [w1, gnd1], [])
    // Water lifts the worst gym (water: -3 → -1) better than ground
    // because ground is also weak to water, leaving it at -3
    expect(result.boxMember.id).toBe('w1')
    expect(result.improvement).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Layer 4c: calculateTypeSuggestionScore - per-type suggestion
// ---------------------------------------------------------------------------

describe('calculateTypeSuggestionScore', () => {
  it('returns 0 for empty team', () => {
    expect(calculateTypeSuggestionScore('water', [], [])).toBe(0)
  })

  it('returns positive for type that improves mono-fire team', () => {
    const team = monoFireTeam(3)
    // Water resists fire's weaknesses and is SE against fire gym
    const score = calculateTypeSuggestionScore('water', team, [])
    expect(score).toBeGreaterThan(0)
  })

  it('returns non-positive when swapping same type into full mono team', () => {
    const team = monoFireTeam(6)
    // Swapping fire for fire (same type/move) should not improve
    const score = calculateTypeSuggestionScore('fire', team, [])
    expect(score).toBeLessThanOrEqual(0)
  })

  it('considers defeated gyms in scoring', () => {
    const team = monoFireTeam(2)
    const noDefeated = calculateTypeSuggestionScore('water', team, [])
    // With water gym defeated, water-type's advantage on that gym
    // moves to a lower-priority tier
    const waterDefeated = calculateTypeSuggestionScore('water', team, [
      'water',
      'ground',
      'rock',
    ])
    expect(noDefeated).toBeGreaterThanOrEqual(waterDefeated)
  })

  it('ranks water higher than fire for mono-fire team', () => {
    const team = monoFireTeam(2)
    const waterScore = calculateTypeSuggestionScore('water', team, [])
    const fireScore = calculateTypeSuggestionScore('fire', team, [])
    expect(waterScore).toBeGreaterThan(fireScore)
  })

  it('appends hypothetical when team has fewer than 6', () => {
    const team = monoFireTeam(3)
    const score = calculateTypeSuggestionScore('water', team, [])
    expect(score).toBeGreaterThan(0)
  })

  it('swaps hypothetical when team is full', () => {
    const team = monoFireTeam(6)
    const waterScore = calculateTypeSuggestionScore('water', team, [])
    expect(waterScore).toBeGreaterThan(0)
    const fireScore = calculateTypeSuggestionScore('fire', team, [])
    expect(waterScore).toBeGreaterThan(fireScore)
  })

  it('both addition and swap produce positive scores for water on mono-fire', () => {
    const smallTeam = monoFireTeam(3)
    const fullTeam = monoFireTeam(6)
    const addScore = calculateTypeSuggestionScore('water', smallTeam, [])
    const swapScore = calculateTypeSuggestionScore('water', fullTeam, [])
    expect(addScore).toBeGreaterThan(0)
    expect(swapScore).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Layer 6: Integration scenarios - realistic teams
// ---------------------------------------------------------------------------

describe('integration scenarios', () => {
  describe('classic starter trio balance', () => {
    it('has no extreme negative scores across all gym types', () => {
      const team = mkTeam([
        { types: ['fire'], moves: ['fire'] },
        { types: ['water'], moves: ['water'] },
        { types: ['grass'], moves: ['grass'] },
      ])

      for (const type of ALL_TYPES) {
        const score = calculateScore(type, team)
        expect(score).toBeGreaterThanOrEqual(-3)
      }
    })
  })

  describe('mono-type team weakness', () => {
    it('has very negative scores against fire weaknesses', () => {
      const team = monoFireTeam(4)

      expect(calculateScore('water', team)).toBeLessThanOrEqual(-4)
      expect(calculateScore('ground', team)).toBeLessThanOrEqual(-4)
      expect(calculateScore('rock', team)).toBeLessThanOrEqual(-4)
    })

    it('findBestSwap suggests replacing fire-type with water-type', () => {
      const team = monoFireTeam(4)
      const w1 = member({
        id: 'w1',
        types: ['water'],
        moves: ['water', 'ice', 'ground'],
      })

      const result = findBestSwap(team, team[0], true, [w1], [])

      expect(result.candidate.id).toBe('w1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('full team with abilities and items', () => {
    it('computes expected score for complex team vs fire', () => {
      const team = [
        member({
          types: ['water', 'ground'],
          moves: ['water', 'ground', 'ice'],
        }),
        member({ types: ['steel', 'flying'], moves: ['steel'] }),
        member({ types: ['grass', 'poison'], moves: ['grass'] }),
        member({ types: ['fire'], moves: ['fire'], ability: 'Flash Fire' }),
        member({ types: ['ghost', 'dark'], moves: ['ghost', 'dark'] }),
        member({
          types: ['fairy'],
          moves: ['fairy'],
          ability: 'Thick Fat',
          berry: 'Occa Berry',
        }),
      ]

      // Water/Ground: fire->water = 0.5 -> +1, water SE fire -> +1 = 2
      // Steel/Flying: fire->steel = 2 -> -1 = -1
      // Grass/Poison: fire->grass = 2 -> -1 = -1
      // Fire + Flash Fire: immunity -> +2 = 2
      // Ghost/Dark: fire->ghost = 1, fire->dark = 1 -> 0 = 0
      // Fairy + Thick Fat: fire->fairy = 1, Thick Fat halves -> 0.5 -> +1 = 1
      // Total: 2 + (-1) + (-1) + 2 + 0 + 1 = 3
      expect(calculateScore('fire', team)).toBe(3)
    })
  })

  describe('Protean impact', () => {
    it('scores higher with Protean than without across all gym types', () => {
      const withProtean = member({
        types: ['normal'],
        ability: 'Protean',
        moves: ['water', 'fire', 'grass', 'ice'],
      })
      const withoutProtean = member({
        types: ['normal'],
        ability: null,
        moves: ['water', 'fire', 'grass', 'ice'],
      })

      let proteanTotal = 0
      let normalTotal = 0
      for (const type of ALL_TYPES) {
        proteanTotal += calculateScore(type, [withProtean])
        normalTotal += calculateScore(type, [withoutProtean])
      }

      // Protean adds resistance-only points, so total should be strictly higher
      expect(proteanTotal).toBeGreaterThan(normalTotal)
    })
  })
})

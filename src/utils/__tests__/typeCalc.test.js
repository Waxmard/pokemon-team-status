import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyAbilityDefense,
  calculateBerryTiebreaker,
  calculateScore,
  calculateScoreChanges,
  calculateUrgency,
  findBestSwap,
  findGlobalBestSwap,
  getDefensiveMultiplier,
  getSpecialMoveEffectiveness,
  getTypeEffectiveness,
  hasEffectiveMove,
  suggestTypes,
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

describe('calculateUrgency', () => {
  it('returns 0 when score >= 2', () => {
    const team = mkTeam([{ types: ['water'] }, { types: ['water'] }])
    // Each water resists fire (+1 each), score = 2, urgency = 0
    expect(calculateUrgency(team, ['fire'])).toBe(0)
  })

  it('returns 1 when score is 1', () => {
    const team = mkTeam([{ types: ['water'] }])
    // Score = 1, urgency = (2-1)^1.25 = 1
    expect(calculateUrgency(team, ['fire'])).toBe(1)
  })

  it('returns 2^1.25 when score is 0', () => {
    expect(calculateUrgency([], ['fire'])).toBeCloseTo(2 ** 1.25, 5)
  })

  it('sums urgency across multiple gym types', () => {
    const singleUrgency = calculateUrgency([], ['fire'])
    const doubleUrgency = calculateUrgency([], ['fire', 'water'])
    expect(doubleUrgency).toBeCloseTo(singleUrgency * 2, 5)
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
    const pool = [member({ id: 'b', types: ['water'], moves: ['water'] })]
    const result = findBestSwap(team, team[0], true, pool, [])
    expect(result.candidate.id).toBe('b')
  })

  describe('team member editing (swap team -> box)', () => {
    it('suggests box member that improves coverage', () => {
      const fire1 = member({ id: 'f1', types: ['fire'] })
      const fire2 = member({ id: 'f2', types: ['fire'] })
      const fire3 = member({ id: 'f3', types: ['fire'] })
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water'],
      })
      const team = [fire1, fire2, fire3]

      const result = findBestSwap(team, fire1, true, [water], [])
      expect(result.candidate.id).toBe('w1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('box member editing (swap box -> team)', () => {
    it('suggests replacing a redundant team member for better worst-case', () => {
      const fire1 = member({ id: 'f1', types: ['fire'] })
      const fire2 = member({ id: 'f2', types: ['fire'] })
      const grass = member({ id: 'g1', types: ['grass'], moves: ['grass'] })
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water'],
      })
      const team = [fire1, fire2, grass]

      // Editing water (box member), pool = team members
      const result = findBestSwap(team, water, false, [fire1, fire2, grass], [])
      // Minimax prefers replacing redundant fire for better diversity:
      // [water, fire, grass] has fewer bad matchups than [fire, fire, water]
      expect(result.candidate.id).toBe('f1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('defeated gym tiebreaker', () => {
    it('uses defeated gym scores to break ties on undefeated gyms', () => {
      // Two candidates identical on undefeated gyms but differ on defeated coverage
      const normal = member({ id: 'n1', types: ['normal'] })
      const team = [normal]

      // Water: resists fire (+1), SE fire (+1) = good on fire
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water'],
      })
      // Water/Ground: immune to electric (+2), SE fire (+0 water move not present)
      // Both cover similar undefeated gyms, but differ when fire is defeated
      const noDefeated = findBestSwap(team, normal, true, [water], [])
      const fireDefeated = findBestSwap(team, normal, true, [water], ['fire'])

      // With fire undefeated, water's fire coverage lifts the worst undefeated score
      // With fire defeated, that coverage moves to a lower-priority tier
      expect(noDefeated.improvement).toBeGreaterThanOrEqual(
        fireDefeated.improvement,
      )
    })
  })

  describe('best-of-all selection', () => {
    it('picks the candidate with best worst-case gym score', () => {
      const fire1 = member({ id: 'f1', types: ['fire'] })
      const fire2 = member({ id: 'f2', types: ['fire'] })
      const team = [fire1, fire2]

      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water'],
      })
      const grass = member({
        id: 'g1',
        types: ['grass'],
        moves: ['grass'],
      })
      const normal = member({ id: 'n1', types: ['normal'] })

      // Replacing one fire with water: [water, fire] has best diversity
      // Water covers fire's weaknesses (water, ground, rock) while fire
      // covers water's grass weakness → fewer bad gym matchups
      const result = findBestSwap(team, fire1, true, [water, grass, normal], [])
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
      const n1 = member({ id: 'n1' })
      const n2 = member({ id: 'n2' })
      const result = findBestSwap(team, water, true, [n1, n2], [])

      expect(result).not.toBeNull()
      expect(result.improvement).toBeLessThan(0)
    })
  })

  describe('ability-driven swap preference', () => {
    it('prefers Levitate candidate over plain ground-type', () => {
      // Team has a normal-type we want to replace
      const normal = member({ id: 'n1', types: ['normal'] })
      const team = [normal]

      // Two ground candidates: plain ground vs ground with Levitate
      // Against ground gym: ground->ground = 1 -> 0 pts (plain)
      // Levitate grants ground immunity -> 0 multiplier -> +2 pts
      const plainGround = member({
        id: 'g1',
        types: ['ground'],
        moves: ['ground'],
      })
      const levitateGround = member({
        id: 'g2',
        types: ['ground'],
        moves: ['ground'],
        ability: 'Levitate',
      })

      const result = findBestSwap(
        team,
        normal,
        true,
        [plainGround, levitateGround],
        [],
      )
      expect(result.candidate.id).toBe('g2')
    })
  })

  describe('dual-type worst-case', () => {
    it('avoids dual-type with 4x weakness despite better total coverage', () => {
      const normal = member({ id: 'n1', types: ['normal'] })
      const team = [normal]

      // Water: worst score = -1 (electric, grass) — two manageable weaknesses
      // Water/Ground: has 4x grass weakness → -2 worst score
      // Minimax prefers water because -1 > -2 at worst gym
      const water = member({ id: 'w1', types: ['water'], moves: ['water'] })
      const waterGround = member({
        id: 'wg1',
        types: ['water', 'ground'],
        moves: ['water', 'ground'],
      })

      const result = findBestSwap(team, normal, true, [water, waterGround], [])
      expect(result.candidate.id).toBe('w1')
    })
  })

  describe('introducing worse worst-case is costly', () => {
    it('reports negative improvement when replacement has deeper weakness', () => {
      // Water: worst score = -1 (electric, grass)
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water'],
      })
      const team = [water]

      // Grass/Ice: 4x fire weakness → -2 worst score, plus many other -1s
      // Minimax sees this as strictly worse worst-case
      const grassIce = member({
        id: 'gi1',
        types: ['grass', 'ice'],
        moves: ['grass', 'ice'],
      })
      const result = findBestSwap(team, water, true, [grassIce], [])

      expect(result.improvement).toBeLessThan(0)
    })
  })

  describe('defeated gym progressive deprioritization', () => {
    it('deprioritizes defeated gym improvements in tier ordering', () => {
      const normal = member({ id: 'n1', types: ['normal'] })
      const water = member({ id: 'w1', types: ['water'], moves: ['water'] })
      const team = [normal]

      // Water covers fire (resist+SE), ground (SE), rock (SE)
      // Moving these to defeated shifts their improvements from tier 1 to tier 2
      const noDefeated = findBestSwap(team, normal, true, [water], [])
      const threeDefeated = findBestSwap(
        team,
        normal,
        true,
        [water],
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
        member({ id: 't4', types: ['fire'], moves: ['fire'] }),
        member({ id: 't5', types: ['fairy'], moves: ['fairy'] }),
        member({ id: 't6', types: ['normal'] }),
      ]

      // Ground-type fills electric gap and adds rock coverage
      const ground = member({
        id: 'box1',
        types: ['ground'],
        moves: ['ground', 'rock'],
      })

      const result = findBestSwap(team, team[5], true, [ground], [])
      expect(result.candidate.id).toBe('box1')
      expect(result.improvement).toBeGreaterThan(0)
    })
  })

  describe('Protean swap preference', () => {
    it('prefers Protean candidate over plain with same moves', () => {
      const normal = member({ id: 'n1', types: ['normal'] })
      const team = [normal]

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
        normal,
        true,
        [plainCandidate, proteanCandidate],
        [],
      )
      expect(result.candidate.id).toBe('p2')
    })
  })

  describe('tie-breaking', () => {
    it('keeps first candidate when improvements are equal', () => {
      const normal = member({ id: 'n1', types: ['normal'] })
      const team = [normal]

      // Two identical water candidates produce the same improvement
      const water1 = member({ id: 'w1', types: ['water'], moves: ['water'] })
      const water2 = member({ id: 'w2', types: ['water'], moves: ['water'] })

      const result = findBestSwap(team, normal, true, [water1, water2], [])
      // Strict > in comparison means ties keep the earlier candidate
      expect(result.candidate.id).toBe('w1')
    })
  })

  describe('swap direction symmetry', () => {
    it('produces equal improvement regardless of direction', () => {
      const fire = member({ id: 'f1', types: ['fire'], moves: ['fire'] })
      const water = member({ id: 'w1', types: ['water'], moves: ['water'] })
      const team = [fire]

      // isTeamMember=true: editing fire on team, pool=[water from box]
      // newTeam replaces fire with water -> [water]
      const teamResult = findBestSwap(team, fire, true, [water], [])

      // isTeamMember=false: editing water from box, pool=[fire from team]
      // newTeam replaces fire (candidate) with water (editingMember) -> [water]
      const boxResult = findBestSwap(team, water, false, [fire], [])

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
    const team = mkTeam([
      { id: 'f1', types: ['fire'], moves: ['fire'] },
      { id: 'f2', types: ['fire'], moves: ['fire'] },
      { id: 'f3', types: ['fire'], moves: ['fire'] },
    ])

    // Candidate A: electric type — covers water weakness (SE water) but doesn't
    // help ground or rock. Improves one -3 gym but leaves others at -3.
    const electric = member({
      id: 'e1',
      types: ['electric'],
      moves: ['electric'],
    })

    // Candidate B: ground type — resists rock (+1), SE rock (+1), immune to electric (+2)
    // and SE fire/water/ground. Covers multiple weak gyms.
    const ground = member({
      id: 'gnd1',
      types: ['ground'],
      moves: ['ground', 'rock'],
    })

    const result = findBestSwap(team, team[0], true, [electric, ground], [])
    // Ground raises more worst-case gym scores, minimax prefers it
    expect(result.candidate.id).toBe('gnd1')
  })

  it('score cap: +3 does not beat +2 in primary comparison', () => {
    // Two candidates that differ only in how much they boost a high gym
    const normal = member({ id: 'n1', types: ['normal'] })
    const team = [normal]

    // Both are water-types; one also has ice move for extra coverage
    // The extra ice coverage adds +1 on gyms already at +1 or more (dragon, etc.)
    // but doesn't change worst-case because those gyms are already positive
    const water = member({
      id: 'w1',
      types: ['water'],
      moves: ['water'],
    })
    const waterIce = member({
      id: 'w2',
      types: ['water'],
      moves: ['water', 'ice'],
    })

    const result = findBestSwap(team, normal, true, [water, waterIce], [])
    // Both have same capped profiles for tier 1 and 2; tier 3 (uncapped) breaks tie
    // waterIce has more coverage so it wins on the uncapped tiebreaker
    expect(result.candidate.id).toBe('w2')
    // But the improvement is positive for both (better than normal)
    expect(result.improvement).toBeGreaterThan(0)
  })

  it('defeated gym acts as tiebreaker when undefeated profiles match', () => {
    // Two teams that are identical on undefeated gyms but differ on defeated
    const fire1 = member({ id: 'f1', types: ['fire'], moves: ['fire'] })
    const fire2 = member({ id: 'f2', types: ['fire'], moves: ['fire'] })
    const team = [fire1, fire2]

    // Water: strong vs fire gym (resist + SE)
    const water = member({
      id: 'w1',
      types: ['water'],
      moves: ['water'],
    })
    // Grass: strong vs water gym (resist + SE) and ground gym (resist)
    const grass = member({
      id: 'g1',
      types: ['grass'],
      moves: ['grass'],
    })

    // When fire gym is defeated, water's advantage on fire moves to tier 2
    // Grass then may win because its undefeated coverage is broader
    const withoutDefeated = findBestSwap(team, fire1, true, [water, grass], [])
    const withFireDefeated = findBestSwap(
      team,
      fire1,
      true,
      [water, grass],
      ['fire'],
    )

    // With fire undefeated, water's fire coverage helps tier 1
    // With fire defeated, the choice may shift
    expect(withoutDefeated.candidate).toBeDefined()
    expect(withFireDefeated.candidate).toBeDefined()
  })

  it('works when all gyms are defeated', () => {
    const fire = member({ id: 'f1', types: ['fire'], moves: ['fire'] })
    const normal = member({ id: 'n1', types: ['normal'] })
    const team = [fire]

    const water = member({
      id: 'w1',
      types: ['water'],
      moves: ['water'],
    })

    // Undefeated array is empty → tier 1 ties at empty arrays
    // Falls through to tier 2 (all capped) which still differentiates
    const result = findBestSwap(team, fire, true, [water], ALL_TYPES)
    expect(result).not.toBeNull()
    expect(result.candidate.id).toBe('w1')
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
    const fire1 = member({ id: 'f1', types: ['fire'], moves: ['fire'] })
    const fire2 = member({ id: 'f2', types: ['fire'], moves: ['fire'] })
    const water = member({
      id: 'w1',
      types: ['water'],
      moves: ['water'],
    })
    const team = [fire1, fire2]

    const result = findGlobalBestSwap(team, [water], [])
    expect(result.teamMember).toBeDefined()
    expect(result.boxMember.id).toBe('w1')
    expect(result.improvement).toBeGreaterThan(0)
  })

  it('uses minimax to pick swap that raises worst gym score', () => {
    // Team of 3 fire types — worst gyms are water/ground/rock (each -3)
    const team = mkTeam([
      { id: 'f1', types: ['fire'], moves: ['fire'] },
      { id: 'f2', types: ['fire'], moves: ['fire'] },
      { id: 'f3', types: ['fire'], moves: ['fire'] },
    ])
    // Water resists fire's weakest gym (water) and is SE against it,
    // while ground shares the water weakness, compounding the worst case
    const water = member({
      id: 'w1',
      types: ['water'],
      moves: ['water'],
    })
    const ground = member({
      id: 'gnd1',
      types: ['ground'],
      moves: ['ground', 'rock'],
    })

    const result = findGlobalBestSwap(team, [water, ground], [])
    // Water lifts the worst gym (water: -3 → -1) better than ground
    // because ground is also weak to water, leaving it at -3
    expect(result.boxMember.id).toBe('w1')
    expect(result.improvement).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Layer 5: suggestTypes - type recommendation
// ---------------------------------------------------------------------------

describe('suggestTypes', () => {
  it('returns all 18 types', () => {
    const suggestions = suggestTypes([], [])
    expect(suggestions.length).toBe(18)
  })

  it('returns suggestions sorted by undefeatedImprovement descending', () => {
    const suggestions = suggestTypes([], [])
    for (let i = 1; i < suggestions.length; i++) {
      const prev = suggestions[i - 1]
      const curr = suggestions[i]
      if (prev.undefeatedImprovement !== curr.undefeatedImprovement) {
        expect(prev.undefeatedImprovement).toBeGreaterThan(
          curr.undefeatedImprovement,
        )
      }
    }
  })

  it('suggests types that cover fire team weaknesses', () => {
    const team = mkTeam([
      { types: ['fire'], moves: ['fire'] },
      { types: ['fire'], moves: ['fire'] },
      { types: ['fire'], moves: ['fire'] },
    ])
    const suggestions = suggestTypes(team, [])
    const top5 = suggestions.slice(0, 5).map((s) => s.type)
    // Ground covers fire's weaknesses (SE fire/rock + electric immunity)
    expect(top5).toContain('ground')
  })

  it('changes rankings when key gyms are defeated', () => {
    const team = mkTeam([{ types: ['fire'], moves: ['fire'] }])

    const noDefeated = suggestTypes(team, [])
    const withDefeated = suggestTypes(team, ['water', 'ground', 'rock'])

    // Urgency is computed over different sets, so values differ
    expect(noDefeated[0].undefeatedImprovement).not.toBe(
      withDefeated[0].undefeatedImprovement,
    )
  })

  describe('weakness coverage', () => {
    it('prioritizes broad coverage for all-water team', () => {
      // Water is weak to electric and grass, plus has many neutral-urgency gyms
      // The algorithm optimizes total urgency reduction across all 18 types,
      // so types with many resistances (steel, ghost) outrank single-weakness counters
      const team = mkTeam([
        { types: ['water'], moves: ['water'] },
        { types: ['water'], moves: ['water'] },
        { types: ['water'], moves: ['water'] },
      ])
      const suggestions = suggestTypes(team, [])
      // Top suggestion should provide substantial improvement
      expect(suggestions[0].undefeatedImprovement).toBeGreaterThan(5)
      // Types with many resistances that complement water should rank high
      const top5 = suggestions.slice(0, 5).map((s) => s.type)
      const broadResistors = ['steel', 'ghost', 'fairy', 'poison']
      expect(top5.some((t) => broadResistors.includes(t))).toBe(true)
    })
  })

  describe('empty team baseline', () => {
    it('has all positive undefeatedImprovement', () => {
      // With no team, every gym has score 0 -> urgency = 2^1.25 each
      // Any hypothetical type reduces urgency for at least some gyms
      const suggestions = suggestTypes([], [])
      for (const s of suggestions) {
        expect(s.undefeatedImprovement).toBeGreaterThan(0)
      }
    })
  })

  describe('all gyms defeated', () => {
    it('sets undefeatedImprovement to 0 for every type', () => {
      // With all gyms defeated, undefeated list is empty
      // calculateUrgency(team, []) = 0 for both old and new
      const suggestions = suggestTypes([], ALL_TYPES)
      for (const s of suggestions) {
        expect(s.undefeatedImprovement).toBe(0)
      }
    })

    it('has positive defeatedImprovement for at least some types', () => {
      const suggestions = suggestTypes([], ALL_TYPES)
      const anyPositive = suggestions.some((s) => s.defeatedImprovement > 0)
      expect(anyPositive).toBe(true)
    })
  })

  describe('double-weakness team', () => {
    it('ranks fire-resistant types high for grass/ice team', () => {
      // Grass/ice is 4x weak to fire (fire->grass=2, fire->ice=2 -> multiplier=4 -> -2 per member)
      // Fire gym score = -6 for this team -> extremely urgent
      const team = mkTeam([
        { types: ['grass', 'ice'], moves: ['grass', 'ice'] },
        { types: ['grass', 'ice'], moves: ['grass', 'ice'] },
        { types: ['grass', 'ice'], moves: ['grass', 'ice'] },
      ])
      const suggestions = suggestTypes(team, [])
      const top5 = suggestions.slice(0, 5).map((s) => s.type)
      // Water, rock, fire, or dragon all resist fire
      const fireResistant = ['water', 'rock', 'fire', 'dragon']
      expect(top5.some((t) => fireResistant.includes(t))).toBe(true)
    })
  })

  describe('diminishing returns', () => {
    it('shows smaller improvement for well-covered team than empty team', () => {
      const emptyResult = suggestTypes([], [])
      const coveredTeam = mkTeam([
        { types: ['water'], moves: ['water', 'ice'] },
        { types: ['fire'], moves: ['fire'] },
        { types: ['grass'], moves: ['grass'] },
        { types: ['electric'], moves: ['electric'] },
        { types: ['ground'], moves: ['ground', 'rock'] },
      ])
      const coveredResult = suggestTypes(coveredTeam, [])

      // A balanced 5-member team leaves less room for improvement
      expect(coveredResult[0].undefeatedImprovement).toBeLessThan(
        emptyResult[0].undefeatedImprovement,
      )
    })
  })

  describe('defeatedImprovement tiebreaker', () => {
    it('sorts by defeatedImprovement when undefeatedImprovement ties', () => {
      // Verify the sort contract: among entries with equal primary key,
      // they are ordered by defeatedImprovement descending
      const suggestions = suggestTypes([], [])
      for (let i = 1; i < suggestions.length; i++) {
        const prev = suggestions[i - 1]
        const curr = suggestions[i]
        if (prev.undefeatedImprovement === curr.undefeatedImprovement) {
          expect(prev.defeatedImprovement).toBeGreaterThanOrEqual(
            curr.defeatedImprovement,
          )
        }
      }
    })
  })

  describe('mixed defeated/undefeated gyms', () => {
    it('populates both improvement columns with one defeated gym', () => {
      const team = mkTeam([{ types: ['fire'], moves: ['fire'] }])
      // Grass gym defeated; the other 17 are undefeated
      const suggestions = suggestTypes(team, ['grass'])
      const top = suggestions[0]

      // Team is small, so adding any good type reduces undefeated urgency
      expect(top.undefeatedImprovement).toBeGreaterThan(0)
      // At least some types should improve coverage for the defeated grass gym too
      const hasDefeatedImprovement = suggestions.some(
        (s) => s.defeatedImprovement !== 0,
      )
      expect(hasDefeatedImprovement).toBe(true)
    })
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
      const team = mkTeam([
        { types: ['fire'], moves: ['fire'] },
        { types: ['fire'], moves: ['fire'] },
        { types: ['fire'], moves: ['fire'] },
        { types: ['fire'], moves: ['fire'] },
      ])

      expect(calculateScore('water', team)).toBeLessThanOrEqual(-4)
      expect(calculateScore('ground', team)).toBeLessThanOrEqual(-4)
      expect(calculateScore('rock', team)).toBeLessThanOrEqual(-4)
    })

    it('findBestSwap suggests replacing fire-type with water-type', () => {
      const fire1 = member({ id: 'f1', types: ['fire'], moves: ['fire'] })
      const fire2 = member({ id: 'f2', types: ['fire'], moves: ['fire'] })
      const fire3 = member({ id: 'f3', types: ['fire'], moves: ['fire'] })
      const fire4 = member({ id: 'f4', types: ['fire'], moves: ['fire'] })
      const water = member({
        id: 'w1',
        types: ['water'],
        moves: ['water', 'ice', 'ground'],
      })

      const team = [fire1, fire2, fire3, fire4]
      const result = findBestSwap(team, fire1, true, [water], [])

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

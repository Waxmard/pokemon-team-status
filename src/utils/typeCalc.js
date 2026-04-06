import { ABILITIES } from '../data/abilities.js'
import { BERRIES, ITEMS } from '../data/berries.js'
import { SPECIAL_MOVES } from '../data/specialMoves.js'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
  getAllTypesForRules,
  isTypeAvailable,
  TYPE_CHART,
} from '../data/types.js'
import { getMemberTypesForRules } from './generationRules.js'

export function getTypeEffectiveness(
  attackingType,
  defendingType,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (!isTypeAvailable(attackingType, ruleset)) return 1
  if (!isTypeAvailable(defendingType, ruleset)) return 1
  if (
    ruleset === GENERATION_RULESETS.PRE_GEN_6 &&
    defendingType === 'steel' &&
    (attackingType === 'dark' || attackingType === 'ghost')
  ) {
    return 0.5
  }

  return TYPE_CHART[attackingType]?.[defendingType] ?? 1
}

export function getDefensiveMultiplier(
  attackingType,
  defenderTypes,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  let multiplier = 1
  for (const defType of defenderTypes) {
    multiplier *= getTypeEffectiveness(attackingType, defType, ruleset)
  }
  return multiplier
}

export function applyAbilityDefense(baseMultiplier, attackingType, ability) {
  if (!ability) return baseMultiplier

  const abilityData = ABILITIES[ability]
  if (!abilityData) return baseMultiplier

  if (abilityData.immunity?.includes(attackingType)) return 0
  if (abilityData.resistance?.includes(attackingType)) {
    return baseMultiplier <= 0.5 ? 0.25 : baseMultiplier / 2
  }
  if (abilityData.weakness?.includes(attackingType)) {
    return baseMultiplier >= 2 ? 4 : baseMultiplier * 2
  }
  return baseMultiplier
}

export function getSpecialMoveEffectiveness(
  moveName,
  defenderType,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  const move = SPECIAL_MOVES[moveName]
  if (!move) return 1

  // Flying Press: multiply effectiveness of both types
  if (move.types.length > 1) {
    return move.types.reduce((mult, type) => {
      return mult * getTypeEffectiveness(type, defenderType, ruleset)
    }, 1)
  }

  // Freeze-Dry: check superEffective override
  if (move.superEffective?.includes(defenderType)) {
    return 2
  }

  return getTypeEffectiveness(move.types[0], defenderType, ruleset)
}

// Convert defensive multiplier to score points (full conversion)
function multiplierToPoints(multiplier) {
  if (multiplier === 0) return 2 // immunity
  if (multiplier === 0.25) return 2 // double resist
  if (multiplier === 0.5) return 1 // resist
  if (multiplier === 2) return -1 // weakness
  if (multiplier === 4) return -2 // double weakness
  return 0
}

// Convert defensive multiplier to score points (resistances only, for optional type coverage)
function resistanceOnlyPoints(multiplier) {
  if (multiplier === 0) return 2 // immunity
  if (multiplier === 0.5) return 1 // resist
  return 0
}

export function hasEffectiveMove(
  moves,
  gymType,
  specialMove = null,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  // Check special move first
  if (specialMove) {
    const effectiveness = getSpecialMoveEffectiveness(
      specialMove,
      gymType,
      ruleset,
    )
    if (effectiveness > 1) {
      return true
    }
  }

  // Check regular move types
  for (const moveType of moves) {
    if (moveType && getTypeEffectiveness(moveType, gymType, ruleset) > 1) {
      return true
    }
  }
  return false
}

function bonusTypeResistanceScore(gymType, bonusTypes, baseTypes, ruleset) {
  let score = 0
  for (const type of bonusTypes) {
    if (!type || baseTypes.includes(type)) continue
    score += resistanceOnlyPoints(getTypeEffectiveness(gymType, type, ruleset))
  }
  return score
}

function scoreMember(gymType, member, ruleset) {
  const memberTypes = getMemberTypesForRules(member, ruleset)

  let multiplier = getDefensiveMultiplier(gymType, memberTypes, ruleset)
  multiplier = applyAbilityDefense(multiplier, gymType, member.ability)
  let score = multiplierToPoints(multiplier)

  // Protean: move types act as additional defensive types (resistances only)
  const abilityData = ABILITIES[member.ability]
  if (abilityData?.protean && member.moves?.length) {
    score += bonusTypeResistanceScore(
      gymType,
      member.moves,
      memberTypes,
      ruleset,
    )
  }

  // Mega evolution: extra types = resistances only (like Protean)
  if (member.megaTypes?.length) {
    score += bonusTypeResistanceScore(
      gymType,
      member.megaTypes,
      memberTypes,
      ruleset,
    )
  }

  // Check offensive coverage
  if (hasEffectiveMove(member.moves, gymType, member.specialMove, ruleset)) {
    score += 1
  }

  return score
}

export function calculateScore(
  gymType,
  team,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  let score = 0
  for (const member of team) {
    score += scoreMember(gymType, member, ruleset)
  }
  return score
}

export function calculateScoreChanges(
  team,
  draftMember,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  return getAllTypesForRules(ruleset)
    .map((type) => {
      const oldScore = calculateScore(type, team, ruleset)
      const newScore = calculateScore(type, [...team, draftMember], ruleset)
      return {
        type,
        oldScore,
        newScore,
        diff: newScore - oldScore,
      }
    })
    .filter((c) => c.diff !== 0)
}

const SCORE_CAP = 3
const DEFEATED_GYM_BIAS = 1

function teamScoreProfile(
  team,
  defeatedGyms,
  pinnedGym = null,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  const pinnedScore = []
  const undefeatedScores = []
  const defeatedScores = []
  const allCapped = []
  const allUncapped = []

  for (const type of getAllTypesForRules(ruleset)) {
    const raw = calculateScore(type, team, ruleset)
    const capped = Math.min(raw, SCORE_CAP)
    if (type === pinnedGym) {
      pinnedScore.push(raw)
    }
    if (defeatedGyms.includes(type)) {
      defeatedScores.push(Math.min(raw + DEFEATED_GYM_BIAS, SCORE_CAP))
    } else {
      undefeatedScores.push(capped)
    }
    allCapped.push(capped)
    allUncapped.push(raw)
  }

  undefeatedScores.sort((a, b) => a - b)
  defeatedScores.sort((a, b) => a - b)
  allCapped.sort((a, b) => a - b)
  allUncapped.sort((a, b) => a - b)

  return {
    pinnedScore,
    undefeatedScores,
    defeatedScores,
    allCapped,
    allUncapped,
  }
}

function compareArrays(a, b) {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

function compareProfiles(a, b) {
  const c0 = compareArrays(a.pinnedScore, b.pinnedScore)
  if (c0 !== 0) return c0
  const c1 = compareArrays(a.undefeatedScores, b.undefeatedScores)
  if (c1 !== 0) return c1
  const c2 = compareArrays(a.defeatedScores, b.defeatedScores)
  if (c2 !== 0) return c2
  const c3 = compareArrays(a.allCapped, b.allCapped)
  if (c3 !== 0) return c3
  return compareArrays(a.allUncapped, b.allUncapped)
}

export function findBestSwap(
  team,
  editingMember,
  isTeamMember,
  pool,
  defeatedGyms,
  pinnedGym = null,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (pool.length === 0) return null

  const currentProfile = teamScoreProfile(
    team,
    defeatedGyms,
    pinnedGym,
    ruleset,
  )

  let best = null
  let bestProfile = null

  for (const candidate of pool) {
    let newTeam
    if (isTeamMember) {
      newTeam = team.map((p) => (p.id === editingMember.id ? candidate : p))
    } else {
      newTeam = team.map((p) => (p.id === candidate.id ? editingMember : p))
    }

    const profile = teamScoreProfile(newTeam, defeatedGyms, pinnedGym, ruleset)

    if (!bestProfile || compareProfiles(profile, bestProfile) > 0) {
      bestProfile = profile
      best = candidate
    }
  }

  const improvement = compareProfiles(bestProfile, currentProfile)
  return { candidate: best, improvement }
}

export function findGlobalBestSwap(
  team,
  box,
  defeatedGyms,
  pinnedGym = null,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (team.length === 0 || box.length === 0) return null
  const currentProfile = teamScoreProfile(
    team,
    defeatedGyms,
    pinnedGym,
    ruleset,
  )
  let best = null
  let bestProfile = null
  for (const teamMember of team) {
    for (const boxMember of box) {
      const newTeam = team.map((p) => (p.id === teamMember.id ? boxMember : p))
      const profile = teamScoreProfile(
        newTeam,
        defeatedGyms,
        pinnedGym,
        ruleset,
      )
      if (!bestProfile || compareProfiles(profile, bestProfile) > 0) {
        bestProfile = profile
        best = { teamMember, boxMember }
      }
    }
  }
  const improvement = compareProfiles(bestProfile, currentProfile)
  return { ...best, improvement }
}

export function calculateTypeSuggestionScore(
  gymType,
  team,
  defeatedGyms,
  pinnedGym = null,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (team.length === 0) return 0

  const hypothetical = {
    id: 'hypothetical-suggestion',
    types: [gymType],
    moves: [gymType],
    ability: null,
    berry: null,
    specialMove: null,
    megaTypes: [],
  }

  const currentProfile = teamScoreProfile(
    team,
    defeatedGyms,
    pinnedGym,
    ruleset,
  )
  let bestProfile = null

  if (team.length < 6) {
    bestProfile = teamScoreProfile(
      [...team, hypothetical],
      defeatedGyms,
      pinnedGym,
      ruleset,
    )
  } else {
    for (const teamMember of team) {
      const newTeam = team.map((p) =>
        p.id === teamMember.id ? hypothetical : p,
      )
      const profile = teamScoreProfile(
        newTeam,
        defeatedGyms,
        pinnedGym,
        ruleset,
      )
      if (!bestProfile || compareProfiles(profile, bestProfile) > 0) {
        bestProfile = profile
      }
    }
  }

  return compareProfiles(bestProfile, currentProfile)
}

export function calculateBerryTiebreaker(
  gymType,
  team,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  let count = 0
  for (const member of team) {
    const berryType = BERRIES[member.berry] ?? ITEMS[member.berry]
    if (member.berry && berryType === gymType) {
      // Only count berry if the gym type deals super effective damage
      let multiplier = getDefensiveMultiplier(
        gymType,
        getMemberTypesForRules(member, ruleset),
        ruleset,
      )
      multiplier = applyAbilityDefense(multiplier, gymType, member.ability)
      if (multiplier > 1) {
        count++
      }
    }
  }
  return count
}

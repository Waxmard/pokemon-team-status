import { ABILITIES } from '../data/abilities.js'
import { BERRIES } from '../data/berries.js'
import { SPECIAL_MOVES } from '../data/specialMoves.js'
import { ALL_TYPES, TYPE_CHART } from '../data/types.js'

export function getTypeEffectiveness(attackingType, defendingType) {
  return TYPE_CHART[attackingType]?.[defendingType] ?? 1
}

export function getDefensiveMultiplier(attackingType, defenderTypes) {
  let multiplier = 1
  for (const defType of defenderTypes) {
    multiplier *= getTypeEffectiveness(attackingType, defType)
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

export function getSpecialMoveEffectiveness(moveName, defenderType) {
  const move = SPECIAL_MOVES[moveName]
  if (!move) return 1

  // Flying Press: multiply effectiveness of both types
  if (move.types.length > 1) {
    return move.types.reduce((mult, type) => {
      return mult * getTypeEffectiveness(type, defenderType)
    }, 1)
  }

  // Freeze-Dry: check superEffective override
  if (move.superEffective?.includes(defenderType)) {
    return 2
  }

  return getTypeEffectiveness(move.types[0], defenderType)
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

export function hasEffectiveMove(moves, gymType, specialMove = null) {
  // Check special move first
  if (specialMove) {
    const effectiveness = getSpecialMoveEffectiveness(specialMove, gymType)
    if (effectiveness > 1) {
      return true
    }
  }

  // Check regular move types
  for (const moveType of moves) {
    if (moveType && getTypeEffectiveness(moveType, gymType) > 1) {
      return true
    }
  }
  return false
}

export function calculateScore(gymType, team) {
  let score = 0

  for (const member of team) {
    // Calculate defensive multiplier
    let multiplier = getDefensiveMultiplier(gymType, member.types)
    multiplier = applyAbilityDefense(multiplier, gymType, member.ability)
    score += multiplierToPoints(multiplier)

    // Protean: move types act as additional defensive types (resistances only)
    const abilityData = ABILITIES[member.ability]
    if (abilityData?.protean && member.moves?.length) {
      for (const moveType of member.moves) {
        // Skip empty moves and types already covered by base types
        if (!moveType || member.types.includes(moveType)) continue
        const moveMultiplier = getTypeEffectiveness(gymType, moveType)
        // Only count resistances, not weaknesses - user can choose not to use that move
        score += resistanceOnlyPoints(moveMultiplier)
      }
    }

    // Mega evolution: extra types = resistances only (like Protean)
    if (member.megaTypes?.length) {
      for (const megaType of member.megaTypes) {
        if (member.types.includes(megaType)) continue
        const megaMultiplier = getTypeEffectiveness(gymType, megaType)
        score += resistanceOnlyPoints(megaMultiplier)
      }
    }

    // Check offensive coverage
    if (hasEffectiveMove(member.moves, gymType, member.specialMove)) score += 1
  }

  return score
}

export function calculateScoreChanges(team, draftMember) {
  return ALL_TYPES.map((type) => {
    const oldScore = calculateScore(type, team)
    const newScore = calculateScore(type, [...team, draftMember])
    return {
      type,
      oldScore,
      newScore,
      diff: newScore - oldScore,
    }
  }).filter((c) => c.diff !== 0)
}

export function calculateBerryTiebreaker(gymType, team) {
  let count = 0
  for (const member of team) {
    if (member.berry && BERRIES[member.berry] === gymType) {
      // Only count berry if the gym type deals super effective damage
      let multiplier = getDefensiveMultiplier(gymType, member.types)
      multiplier = applyAbilityDefense(multiplier, gymType, member.ability)
      if (multiplier > 1) {
        count++
      }
    }
  }
  return count
}

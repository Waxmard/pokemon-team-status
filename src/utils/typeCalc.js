import { TYPE_CHART, ALL_TYPES } from '../data/types.js'
import { ABILITIES } from '../data/abilities.js'

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

export function hasEffectiveMove(moves, gymType) {
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

    // Convert multiplier to points
    if (multiplier === 0) score += 2        // immunity
    else if (multiplier === 0.25) score += 2  // double resist
    else if (multiplier === 0.5) score += 1   // resist
    else if (multiplier === 2) score -= 1     // weakness
    else if (multiplier === 4) score -= 2     // double weakness

    // Check offensive coverage
    if (hasEffectiveMove(member.moves, gymType)) score += 1
  }

  return score
}

export function calculateScoreChanges(team, draftMember) {
  return ALL_TYPES.map(type => {
    const oldScore = calculateScore(type, team)
    const newScore = calculateScore(type, [...team, draftMember])
    return {
      type,
      oldScore,
      newScore,
      diff: newScore - oldScore
    }
  }).filter(c => c.diff !== 0)
}

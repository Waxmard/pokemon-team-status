import { getAllTypesForRules } from '../data/types.js'
import { calculateBerryTiebreaker, calculateScore } from './typeCalc.js'

export function adaptSoulLinkMemberToUiMember(member) {
  if (!member?.speciesName) return null

  return {
    id: member.id,
    name: member.speciesName,
    types: member.types ?? [],
    ability: member.ability ?? null,
    berry: member.berry ?? null,
    moves: member.moves ?? [],
    specialMove: member.specialMove ?? null,
    megaForm: member.megaForm ?? null,
    megaTypes: member.megaTypes ?? null,
    megaSpriteId: member.megaSpriteId ?? null,
    spriteVariant: member.spriteVariant ?? 'default',
  }
}

function buildGymScore(type, team, generationRules) {
  return {
    type,
    score: calculateScore(type, team, generationRules),
    berryCount: calculateBerryTiebreaker(type, team, generationRules),
  }
}

function sortGyms(a, b) {
  if (a.score !== b.score) return a.score - b.score
  return (a.berryCount ?? 0) - (b.berryCount ?? 0)
}

export function buildSoulLinkPlayerBoard(
  playerId,
  rosters,
  gymProgress,
  generationRules,
) {
  const roster = rosters[playerId] ?? { team: [], box: [] }
  const progress = gymProgress[playerId] ?? {
    defeatedGyms: [],
    pinnedGym: null,
  }
  const defeatedGymSet = new Set(progress.defeatedGyms)

  const team = roster.team.map(adaptSoulLinkMemberToUiMember).filter(Boolean)
  const box = roster.box.map(adaptSoulLinkMemberToUiMember).filter(Boolean)

  const allGyms = getAllTypesForRules(generationRules)
    .map((type) => buildGymScore(type, team, generationRules))
    .sort(sortGyms)

  return {
    team,
    box,
    pinnedGym: progress.pinnedGym ?? null,
    remainingGyms: allGyms.filter((gym) => !defeatedGymSet.has(gym.type)),
    defeatedGymsList: allGyms.filter((gym) => defeatedGymSet.has(gym.type)),
  }
}

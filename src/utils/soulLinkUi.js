import { getAllTypesForRules } from '../data/types.js'
import { generatePokemonId, pickMemberFields } from './pokemon.js'
import { calculateBerryTiebreaker, calculateScore } from './typeCalc.js'

export function adaptUiMemberToSoulLinkMember(uiMember, playerId) {
  if (!uiMember?.name) return null

  return {
    id: uiMember.id,
    speciesName: uiMember.name,
    ownerPlayerId: playerId,
    types: uiMember.types ?? [],
    ...pickMemberFields(uiMember),
  }
}

export function buildSoulLinkMemberFromDraft(
  draftAction,
  playerId,
  idSource = 'team',
) {
  if (!draftAction?.pokemon) return null

  return {
    id: generatePokemonId(idSource),
    speciesName: draftAction.pokemon.name,
    ownerPlayerId: playerId,
    types: draftAction.pokemon.types ?? [],
    ...pickMemberFields(draftAction),
    moves: (draftAction.moves ?? []).filter(Boolean),
  }
}

export function adaptSoulLinkMemberToUiMember(member) {
  if (!member?.speciesName) return null

  return {
    id: member.id,
    name: member.speciesName,
    types: member.types ?? [],
    ...pickMemberFields(member),
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

function resolvePairedPartner(uiMember, partnerRoster) {
  if (!uiMember.pairId || !partnerRoster) return null
  const partner = partnerRoster.find((m) => m.id === uiMember.pairId)
  if (!partner) return null
  return {
    name: partner.name,
    spriteVariant: partner.spriteVariant,
    megaSpriteId: partner.megaSpriteId,
  }
}

export function buildSoulLinkPlayerBoard(
  playerId,
  rosters,
  gymProgress,
  generationRules,
  partnerRoster = null,
) {
  const roster = rosters[playerId] ?? { team: [], box: [], dead: [] }
  const progress = gymProgress[playerId] ?? {
    defeatedGyms: [],
    pinnedGym: null,
  }
  const defeatedGymSet = new Set(progress.defeatedGyms)

  const team = roster.team
    .map(adaptSoulLinkMemberToUiMember)
    .filter(Boolean)
    .map((m) => ({
      ...m,
      pairedPartner: resolvePairedPartner(m, partnerRoster),
    }))
  const box = roster.box
    .map(adaptSoulLinkMemberToUiMember)
    .filter(Boolean)
    .map((m) => ({
      ...m,
      pairedPartner: resolvePairedPartner(m, partnerRoster),
    }))

  const allGyms = getAllTypesForRules(generationRules)
    .map((type) => buildGymScore(type, team, generationRules))
    .sort(sortGyms)

  const dead = (roster.dead ?? [])
    .map(adaptSoulLinkMemberToUiMember)
    .filter(Boolean)

  return {
    team,
    box,
    dead,
    pinnedGym: progress.pinnedGym ?? null,
    remainingGyms: allGyms.filter((gym) => !defeatedGymSet.has(gym.type)),
    defeatedGymsList: allGyms.filter((gym) => defeatedGymSet.has(gym.type)),
  }
}

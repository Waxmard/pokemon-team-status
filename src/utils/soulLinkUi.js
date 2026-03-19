import { getAllTypesForRules } from '../data/types.js'
import { generatePokemonId } from './pokemon.js'
import { calculateBerryTiebreaker, calculateScore } from './typeCalc.js'

export function adaptUiMemberToSoulLinkMember(uiMember, playerId) {
  if (!uiMember?.name) return null

  return {
    id: uiMember.id,
    speciesName: uiMember.name,
    ownerPlayerId: playerId,
    types: uiMember.types ?? [],
    ability: uiMember.ability ?? null,
    berry: uiMember.berry ?? null,
    moves: uiMember.moves ?? [],
    specialMove: uiMember.specialMove ?? null,
    megaForm: uiMember.megaForm ?? null,
    megaTypes: uiMember.megaTypes ?? null,
    megaSpriteId: uiMember.megaSpriteId ?? null,
    spriteVariant: uiMember.spriteVariant ?? 'default',
    nickname: null,
    catchLocation: uiMember.catchLocation ?? null,
    pairId: uiMember.pairId ?? null,
    isDead: false,
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
    ability: draftAction.ability ?? null,
    berry: draftAction.berry ?? null,
    moves: (draftAction.moves ?? []).filter((m) => m),
    specialMove: draftAction.specialMove ?? null,
    megaForm: draftAction.megaForm ?? null,
    megaTypes: draftAction.megaTypes ?? null,
    megaSpriteId: draftAction.megaSpriteId ?? null,
    spriteVariant: draftAction.spriteVariant ?? 'default',
    nickname: null,
    catchLocation: draftAction.catchLocation ?? null,
    pairId: draftAction.pairId ?? null,
    isDead: false,
  }
}

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
    catchLocation: member.catchLocation ?? null,
    pairId: member.pairId ?? null,
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
  const roster = rosters[playerId] ?? { team: [], box: [] }
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

  return {
    team,
    box,
    pinnedGym: progress.pinnedGym ?? null,
    remainingGyms: allGyms.filter((gym) => !defeatedGymSet.has(gym.type)),
    defeatedGymsList: allGyms.filter((gym) => defeatedGymSet.has(gym.type)),
  }
}

import { BERRIES, ITEMS } from '../data/berries.js'
import { getMegaEvolution } from '../data/megaEvolutions.js'
import {
  getPokemonDataForRules,
  getPokemonTypesForRules,
} from '../data/pokemon.js'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
  isTypeAvailable,
} from '../data/types.js'

export function getMemberTypesForRules(
  member,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (!member) return []

  const derivedTypes = member.name
    ? getPokemonTypesForRules(member.name, ruleset)
    : []

  if (derivedTypes.length > 0) return derivedTypes

  return (member.types || []).filter((type) => isTypeAvailable(type, ruleset))
}

export function sanitizePokemonMemberForRules(
  member,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  const sanitized = {
    ...member,
    types: getMemberTypesForRules(member, ruleset),
    moves: (member.moves || []).filter((type) =>
      isTypeAvailable(type, ruleset),
    ),
  }

  const berryType = BERRIES[sanitized.berry] ?? ITEMS[sanitized.berry]
  if (berryType && !isTypeAvailable(berryType, ruleset)) {
    sanitized.berry = null
  }

  if (ruleset === GENERATION_RULESETS.PRE_GEN_6) {
    const mega = getMegaEvolution(sanitized.name, sanitized.megaForm)
    sanitized.megaForm = null
    sanitized.megaTypes = null
    sanitized.megaSpriteId = null

    if (mega?.ability && sanitized.ability === mega.ability) {
      sanitized.ability = null
    }
  }

  return sanitized
}

export function sanitizePokemonCollectionForRules(
  collection,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  return collection.map((member) =>
    sanitizePokemonMemberForRules(member, ruleset),
  )
}

export function sanitizeDraftActionForRules(
  draftAction,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (!draftAction) return null

  const sanitized = {
    ...draftAction,
  }

  if (sanitized.pokemon?.name) {
    sanitized.pokemon =
      getPokemonDataForRules(sanitized.pokemon.name, ruleset) ??
      sanitized.pokemon
  }

  sanitized.moves = (sanitized.moves || []).filter((type) =>
    isTypeAvailable(type, ruleset),
  )

  const berryType = BERRIES[sanitized.berry] ?? ITEMS[sanitized.berry]
  if (berryType && !isTypeAvailable(berryType, ruleset)) {
    sanitized.berry = null
  }

  if (ruleset === GENERATION_RULESETS.PRE_GEN_6) {
    const mega = getMegaEvolution(sanitized.pokemon?.name, sanitized.megaForm)
    sanitized.megaForm = null
    sanitized.megaTypes = null
    sanitized.megaSpriteId = null

    if (mega?.ability && sanitized.ability === mega.ability) {
      sanitized.ability = null
    }
  }

  return sanitized
}

export function sanitizeDefeatedGymsForRules(
  defeatedGyms,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  return defeatedGyms.filter((type) => isTypeAvailable(type, ruleset))
}

export function sanitizePinnedGymForRules(
  pinnedGym,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  return isTypeAvailable(pinnedGym, ruleset) ? pinnedGym : null
}

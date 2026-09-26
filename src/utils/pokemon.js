import { POKEMON_DATA } from '../data/pokemon.js'

const SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'

function resolveSpriteId(pokemonName) {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null
  return POKEMON_DATA[index].spriteId ?? index + 1
}

export function getSpriteUrl(pokemonName, variant = 'default') {
  const id = resolveSpriteId(pokemonName)
  if (id === null) return null

  // Female variants have no HD artwork — return small sprite directly
  if (variant === 'female') return `${SPRITE_BASE}/pokemon/female/${id}.png`
  if (variant === 'shiny-female')
    return `${SPRITE_BASE}/pokemon/shiny/female/${id}.png`
  const shinySegment = variant === 'shiny' ? 'shiny/' : ''
  return `${SPRITE_BASE}/pokemon/other/official-artwork/${shinySegment}${id}.png`
}

function getSmallSpriteUrl(pokemonName, variant = 'default') {
  const id = resolveSpriteId(pokemonName)
  if (id === null) return null

  if (variant === 'default') return `/sprites/${id}.png`

  const variantSegment =
    { shiny: 'shiny/', female: 'female/', 'shiny-female': 'shiny/female/' }[
      variant
    ] || ''
  return `${SPRITE_BASE}/pokemon/${variantSegment}${id}.png`
}

export function getBerrySprite(berryName) {
  if (!berryName) return null
  // Special case: Nevermelt Ice uses different slug format
  if (berryName === 'Nevermelt Ice') {
    return `${SPRITE_BASE}/items/never-melt-ice.png`
  }
  const slug = berryName.toLowerCase().replace(' ', '-')
  return `${SPRITE_BASE}/items/${slug}.png`
}

export function resolveSpriteUrl(name, { variant, megaSpriteId, small } = {}) {
  const v = variant || 'default'
  if (megaSpriteId) return getMegaSpriteUrl(megaSpriteId, v)
  return small ? getSmallSpriteUrl(name, v) : getSpriteUrl(name, v)
}

/**
 * Sprite for a roster member / partner object.
 * @param {{ name: string, spriteVariant?: string, megaSpriteId?: number }} member
 */
export function resolveMemberSpriteUrl(member, { small = false } = {}) {
  if (!member) return null
  return resolveSpriteUrl(member.name, {
    variant: member.spriteVariant,
    megaSpriteId: member.megaSpriteId,
    small,
  })
}

export function getMegaSpriteUrl(spriteId, variant = 'default') {
  const shinySegment = variant === 'shiny' ? 'shiny/' : ''
  return `${SPRITE_BASE}/pokemon/other/official-artwork/${shinySegment}${spriteId}.png`
}

/** @param {'team' | 'box' | 'temp'} source */
export function generatePokemonId(source = 'team') {
  const base = Date.now().toString()
  if (source === 'team') return base
  return `${base}-${source}`
}

const MEMBER_FIELD_DEFAULTS = {
  ability: null,
  berry: null,
  moves: [],
  specialMove: null,
  megaForm: null,
  megaTypes: null,
  megaSpriteId: null,
  teraType: null,
  spriteVariant: 'default',
  nickname: null,
  catchLocation: null,
  pairId: null,
  updatedAt: null,
}

export function pickMemberFields(source) {
  const result = {}
  for (const [field, defaultValue] of Object.entries(MEMBER_FIELD_DEFAULTS)) {
    result[field] = source[field] ?? defaultValue
  }
  return result
}

/** @param {Object} source - draftAction.value or an existing Pokemon object */
export function buildPokemonMember(source, options = {}) {
  const isDraft = !!source.pokemon
  return {
    id: options.id ?? generatePokemonId(options.source),
    name: isDraft ? source.pokemon.name : source.name,
    types: isDraft ? source.pokemon.types : source.types,
    ...pickMemberFields(source),
    ...(isDraft && { moves: (source.moves ?? []).filter(Boolean) }),
    updatedAt: Date.now(),
  }
}

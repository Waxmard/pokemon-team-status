import { POKEMON_DATA } from '../data/pokemon.js'

export function getSpriteUrl(pokemonName, variant = 'default') {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null

  const pokemon = POKEMON_DATA[index]
  // Use spriteId if present (for alternate forms), otherwise use array index + 1
  const id = pokemon.spriteId ?? index + 1
  // Female variants have no HD artwork — return small sprite directly
  if (variant === 'female')
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/${id}.png`
  if (variant === 'shiny-female')
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/${id}.png`
  const shinySegment = variant === 'shiny' ? 'shiny/' : ''
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shinySegment}${id}.png`
}

export function getSmallSpriteUrl(pokemonName, variant = 'default') {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null

  const pokemon = POKEMON_DATA[index]
  const id = pokemon.spriteId ?? index + 1
  const variantSegment =
    { shiny: 'shiny/', female: 'female/', 'shiny-female': 'shiny/female/' }[
      variant
    ] || ''
  // Small 96x96 sprites (~2-5KB each)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${variantSegment}${id}.png`
}

export function getBerrySprite(berryName) {
  if (!berryName) return null
  // Special case: Nevermelt Ice uses different slug format
  if (berryName === 'Nevermelt Ice') {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/never-melt-ice.png'
  }
  // "Occa Berry" → "occa-berry"
  const slug = berryName.toLowerCase().replace(' ', '-')
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
}

export function getMegaSpriteUrl(spriteId, variant = 'default') {
  const shinySegment = variant === 'shiny' ? 'shiny/' : ''
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shinySegment}${spriteId}.png`
}

/**
 * Generate a unique Pokemon ID with an optional suffix for source identification
 * @param {'team' | 'box' | 'temp'} source - The source/destination of the Pokemon
 */
export function generatePokemonId(source = 'team') {
  const base = Date.now().toString()
  if (source === 'team') return base
  return `${base}-${source}`
}

/**
 * Build a Pokemon member object from draft action state or an existing Pokemon
 * @param {Object} source - Either draftAction.value or an existing Pokemon object
 * @param {Object} options - Optional overrides (id, etc.)
 */
export function buildPokemonMember(source, options = {}) {
  // Handle draftAction format (has .pokemon property)
  if (source.pokemon) {
    return {
      id: options.id ?? generatePokemonId(options.source),
      name: source.pokemon.name,
      types: source.pokemon.types,
      ability: source.ability ?? null,
      berry: source.berry ?? null,
      moves: (source.moves ?? []).filter(Boolean),
      specialMove: source.specialMove ?? null,
      megaForm: source.megaForm ?? null,
      megaTypes: source.megaTypes ?? null,
      megaSpriteId: source.megaSpriteId ?? null,
      spriteVariant: source.spriteVariant ?? 'default',
      nickname: source.nickname ?? null,
      pairId: source.pairId ?? null,
    }
  }

  // Handle existing Pokemon object format
  return {
    id: options.id ?? generatePokemonId(options.source),
    name: source.name,
    types: source.types,
    ability: source.ability ?? null,
    berry: source.berry ?? null,
    moves: source.moves ?? [],
    specialMove: source.specialMove ?? null,
    megaForm: source.megaForm ?? null,
    megaTypes: source.megaTypes ?? null,
    megaSpriteId: source.megaSpriteId ?? null,
    spriteVariant: source.spriteVariant ?? 'default',
    nickname: source.nickname ?? null,
    pairId: source.pairId ?? null,
  }
}

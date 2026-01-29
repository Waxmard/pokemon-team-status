import { POKEMON_DATA } from '../data/pokemon.js'

export function getSpriteUrl(pokemonName) {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null

  const pokemon = POKEMON_DATA[index]
  // Use spriteId if present (for alternate forms), otherwise use array index + 1
  const id = pokemon.spriteId ?? index + 1
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export function getSmallSpriteUrl(pokemonName) {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null

  const pokemon = POKEMON_DATA[index]
  const id = pokemon.spriteId ?? index + 1
  // Small 96x96 sprites (~2-5KB each)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function getBerrySprite(berryName) {
  if (!berryName) return null
  // "Occa Berry" → "occa-berry"
  const slug = berryName.toLowerCase().replace(' ', '-')
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
}

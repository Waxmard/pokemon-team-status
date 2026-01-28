import { POKEMON_DATA } from '../data/pokemon.js'

export function getSpriteUrl(pokemonName) {
  const index = POKEMON_DATA.findIndex((p) => p.name === pokemonName)
  if (index === -1) return null
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${index + 1}.png`
}

export function getBerrySprite(berryName) {
  if (!berryName) return null
  // "Occa Berry" → "occa-berry"
  const slug = berryName.toLowerCase().replace(' ', '-')
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
}

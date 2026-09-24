// Type effectiveness chart
// TYPE_CHART[attacking][defending] = multiplier
export const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
}

export const GENERATION_RULESETS = {
  PRE_GEN_6: 'pre-gen-6',
  POST_GEN_6: 'post-gen-6',
}

export const DEFAULT_GENERATION_RULESET = GENERATION_RULESETS.POST_GEN_6

export const ALL_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

export const PRE_GEN_6_TYPES = ALL_TYPES.filter((type) => type !== 'fairy')

export function getAllTypesForRules(ruleset = DEFAULT_GENERATION_RULESET) {
  return ruleset === GENERATION_RULESETS.PRE_GEN_6 ? PRE_GEN_6_TYPES : ALL_TYPES
}

export function isTypeAvailable(type, ruleset = DEFAULT_GENERATION_RULESET) {
  return getAllTypesForRules(ruleset).includes(type)
}

export const TYPE_COLORS = {
  normal: { bg: '#A8A878', text: '#fff', label: '#7d7d4f' },
  fire: { bg: '#F08030', text: '#fff', label: '#d94708' },
  water: { bg: '#6890F0', text: '#fff', label: '#2d6fe6' },
  electric: { bg: '#F8D030', text: '#333', label: '#c79600' },
  grass: { bg: '#78C850', text: '#fff', label: '#3f9f2a' },
  ice: { bg: '#98D8D8', text: '#333', label: '#2d9fb0' },
  fighting: { bg: '#C03028', text: '#fff', label: '#9f1f19' },
  poison: { bg: '#A040A0', text: '#fff', label: '#812c98' },
  ground: { bg: '#E0C068', text: '#333', label: '#b88a1c' },
  flying: { bg: '#A890F0', text: '#fff', label: '#6c63db' },
  psychic: { bg: '#F85888', text: '#fff', label: '#e03274' },
  bug: { bg: '#A8B820', text: '#fff', label: '#7d9100' },
  rock: { bg: '#B8A038', text: '#fff', label: '#90761c' },
  ghost: { bg: '#705898', text: '#fff', label: '#53408c' },
  dragon: { bg: '#7038F8', text: '#fff', label: '#4c16d1' },
  dark: { bg: '#705848', text: '#fff', label: '#4c3b30' },
  steel: { bg: '#B8B8D0', text: '#333', label: '#7b86a8' },
  fairy: { bg: '#EE99AC', text: '#333', label: '#d75f85' },
}

export function getTypeIcon(type) {
  return `/types/${type}.svg`
}

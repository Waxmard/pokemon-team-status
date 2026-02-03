export const BERRIES = {
  'Occa Berry': 'fire',
  'Passho Berry': 'water',
  'Wacan Berry': 'electric',
  'Rindo Berry': 'grass',
  'Yache Berry': 'ice',
  'Chople Berry': 'fighting',
  'Kebia Berry': 'poison',
  'Shuca Berry': 'ground',
  'Coba Berry': 'flying',
  'Payapa Berry': 'psychic',
  'Tanga Berry': 'bug',
  'Charti Berry': 'rock',
  'Kasib Berry': 'ghost',
  'Haban Berry': 'dragon',
  'Colbur Berry': 'dark',
  'Babiri Berry': 'steel',
  'Roseli Berry': 'fairy',
}

export const BERRY_NAMES = Object.keys(BERRIES)

// Reverse lookup: type → berry name
export const BERRY_BY_TYPE = Object.fromEntries(
  Object.entries(BERRIES).map(([berry, type]) => [type, berry]),
)

import { DEFAULT_GENERATION_RULESET, GENERATION_RULESETS } from './types.js'

// Mega evolution data with types and PokeAPI sprite IDs
export const MEGA_EVOLUTIONS = {
  Venusaur: [
    {
      form: 'mega',
      types: ['grass', 'poison'],
      spriteId: 10033,
      ability: 'Thick Fat',
    },
  ],
  Charizard: [
    { form: 'mega-x', types: ['fire', 'dragon'], spriteId: 10034 },
    { form: 'mega-y', types: ['fire', 'flying'], spriteId: 10035 },
  ],
  Blastoise: [{ form: 'mega', types: ['water'], spriteId: 10036 }],
  Alakazam: [{ form: 'mega', types: ['psychic'], spriteId: 10037 }],
  Gengar: [{ form: 'mega', types: ['ghost', 'poison'], spriteId: 10038 }],
  Kangaskhan: [{ form: 'mega', types: ['normal'], spriteId: 10039 }],
  Pinsir: [{ form: 'mega', types: ['bug', 'flying'], spriteId: 10040 }],
  Gyarados: [{ form: 'mega', types: ['water', 'dark'], spriteId: 10041 }],
  Aerodactyl: [{ form: 'mega', types: ['rock', 'flying'], spriteId: 10042 }],
  Mewtwo: [
    { form: 'mega-x', types: ['psychic', 'fighting'], spriteId: 10043 },
    { form: 'mega-y', types: ['psychic'], spriteId: 10044 },
  ],
  Ampharos: [{ form: 'mega', types: ['electric', 'dragon'], spriteId: 10045 }],
  Scizor: [{ form: 'mega', types: ['bug', 'steel'], spriteId: 10046 }],
  Heracross: [{ form: 'mega', types: ['bug', 'fighting'], spriteId: 10047 }],
  Houndoom: [{ form: 'mega', types: ['dark', 'fire'], spriteId: 10048 }],
  Tyranitar: [{ form: 'mega', types: ['rock', 'dark'], spriteId: 10049 }],
  Blaziken: [{ form: 'mega', types: ['fire', 'fighting'], spriteId: 10050 }],
  Gardevoir: [{ form: 'mega', types: ['psychic', 'fairy'], spriteId: 10051 }],
  Mawile: [{ form: 'mega', types: ['steel', 'fairy'], spriteId: 10052 }],
  Aggron: [{ form: 'mega', types: ['steel'], spriteId: 10053 }],
  Medicham: [{ form: 'mega', types: ['fighting', 'psychic'], spriteId: 10054 }],
  Manectric: [{ form: 'mega', types: ['electric'], spriteId: 10055 }],
  Banette: [{ form: 'mega', types: ['ghost'], spriteId: 10056 }],
  Absol: [{ form: 'mega', types: ['dark'], spriteId: 10057 }],
  Garchomp: [{ form: 'mega', types: ['dragon', 'ground'], spriteId: 10058 }],
  Lucario: [{ form: 'mega', types: ['fighting', 'steel'], spriteId: 10059 }],
  Abomasnow: [{ form: 'mega', types: ['grass', 'ice'], spriteId: 10060 }],
  Beedrill: [{ form: 'mega', types: ['bug', 'poison'], spriteId: 10090 }],
  Pidgeot: [{ form: 'mega', types: ['normal', 'flying'], spriteId: 10073 }],
  Slowbro: [{ form: 'mega', types: ['water', 'psychic'], spriteId: 10071 }],
  Steelix: [{ form: 'mega', types: ['steel', 'ground'], spriteId: 10072 }],
  Sceptile: [
    {
      form: 'mega',
      types: ['grass', 'dragon'],
      spriteId: 10065,
      ability: 'Lightning Rod',
    },
  ],
  Swampert: [{ form: 'mega', types: ['water', 'ground'], spriteId: 10064 }],
  Sableye: [{ form: 'mega', types: ['dark', 'ghost'], spriteId: 10066 }],
  Sharpedo: [{ form: 'mega', types: ['water', 'dark'], spriteId: 10070 }],
  Camerupt: [{ form: 'mega', types: ['fire', 'ground'], spriteId: 10087 }],
  Altaria: [{ form: 'mega', types: ['dragon', 'fairy'], spriteId: 10067 }],
  Glalie: [{ form: 'mega', types: ['ice'], spriteId: 10074 }],
  Salamence: [{ form: 'mega', types: ['dragon', 'flying'], spriteId: 10089 }],
  Metagross: [{ form: 'mega', types: ['steel', 'psychic'], spriteId: 10076 }],
  Latias: [{ form: 'mega', types: ['dragon', 'psychic'], spriteId: 10062 }],
  Latios: [{ form: 'mega', types: ['dragon', 'psychic'], spriteId: 10063 }],
  Rayquaza: [
    {
      form: 'mega',
      types: ['dragon', 'flying'],
      spriteId: 10079,
      ability: 'Delta Stream',
    },
  ],
  Lopunny: [{ form: 'mega', types: ['normal', 'fighting'], spriteId: 10088 }],
  Gallade: [{ form: 'mega', types: ['psychic', 'fighting'], spriteId: 10068 }],
  Audino: [{ form: 'mega', types: ['normal', 'fairy'], spriteId: 10069 }],
  Diancie: [{ form: 'mega', types: ['rock', 'fairy'], spriteId: 10075 }],
}

export function getMegaEvolution(pokemonName, form) {
  return (MEGA_EVOLUTIONS[pokemonName] || []).find((mega) => mega.form === form)
}

export function getMegaOptions(
  pokemonName,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  if (ruleset === GENERATION_RULESETS.PRE_GEN_6) return []
  return MEGA_EVOLUTIONS[pokemonName] || []
}

export function hasMegaEvolution(
  pokemonName,
  ruleset = DEFAULT_GENERATION_RULESET,
) {
  return getMegaOptions(pokemonName, ruleset).length > 0
}

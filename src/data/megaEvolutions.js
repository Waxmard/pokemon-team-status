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
  Absol: [
    { form: 'mega', types: ['dark'], spriteId: 10057 },
    { form: 'mega-z', types: ['dark', 'ghost'], spriteId: 10307 },
  ],
  Garchomp: [
    { form: 'mega', types: ['dragon', 'ground'], spriteId: 10058 },
    { form: 'mega-z', types: ['dragon'], spriteId: 10309, ability: 'Levitate' },
  ],
  Lucario: [
    { form: 'mega', types: ['fighting', 'steel'], spriteId: 10059 },
    { form: 'mega-z', types: ['fighting', 'steel'], spriteId: 10310 },
  ],
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
  Clefable: [{ form: 'mega', types: ['fairy', 'flying'], spriteId: 10278 }],
  Victreebel: [{ form: 'mega', types: ['grass', 'poison'], spriteId: 10279 }],
  Starmie: [{ form: 'mega', types: ['water', 'psychic'], spriteId: 10280 }],
  Dragonite: [{ form: 'mega', types: ['dragon', 'flying'], spriteId: 10281 }],
  Meganium: [{ form: 'mega', types: ['grass', 'fairy'], spriteId: 10282 }],
  Feraligatr: [{ form: 'mega', types: ['water', 'dragon'], spriteId: 10283 }],
  Skarmory: [{ form: 'mega', types: ['steel', 'flying'], spriteId: 10284 }],
  Froslass: [{ form: 'mega', types: ['ice', 'ghost'], spriteId: 10285 }],
  Emboar: [{ form: 'mega', types: ['fire', 'fighting'], spriteId: 10286 }],
  Excadrill: [{ form: 'mega', types: ['ground', 'steel'], spriteId: 10287 }],
  Scolipede: [{ form: 'mega', types: ['bug', 'poison'], spriteId: 10288 }],
  Scrafty: [{ form: 'mega', types: ['dark', 'fighting'], spriteId: 10289 }],
  Eelektross: [{ form: 'mega', types: ['electric'], spriteId: 10290 }],
  Chandelure: [{ form: 'mega', types: ['ghost', 'fire'], spriteId: 10291 }],
  Chesnaught: [{ form: 'mega', types: ['grass', 'fighting'], spriteId: 10292 }],
  Delphox: [
    {
      form: 'mega',
      types: ['fire', 'psychic'],
      spriteId: 10293,
      ability: 'Levitate',
    },
  ],
  Greninja: [
    {
      form: 'mega',
      types: ['water', 'dark'],
      spriteId: 10294,
      ability: 'Protean',
    },
  ],
  Pyroar: [{ form: 'mega', types: ['fire', 'normal'], spriteId: 10295 }],
  'Floette-Eternal': [{ form: 'mega', types: ['fairy'], spriteId: 10296 }],
  Malamar: [{ form: 'mega', types: ['dark', 'psychic'], spriteId: 10297 }],
  Barbaracle: [{ form: 'mega', types: ['rock', 'fighting'], spriteId: 10298 }],
  Dragalge: [{ form: 'mega', types: ['poison', 'dragon'], spriteId: 10299 }],
  Hawlucha: [{ form: 'mega', types: ['fighting', 'flying'], spriteId: 10300 }],
  'Zygarde-Complete': [
    { form: 'mega', types: ['dragon', 'ground'], spriteId: 10301 },
  ],
  Drampa: [{ form: 'mega', types: ['normal', 'dragon'], spriteId: 10302 }],
  Falinks: [{ form: 'mega', types: ['fighting'], spriteId: 10303 }],
  Raichu: [
    { form: 'mega-x', types: ['electric'], spriteId: 10304 },
    { form: 'mega-y', types: ['electric'], spriteId: 10305 },
  ],
  Chimecho: [
    {
      form: 'mega',
      types: ['psychic', 'steel'],
      spriteId: 10306,
      ability: 'Levitate',
    },
  ],
  Staraptor: [{ form: 'mega', types: ['fighting', 'flying'], spriteId: 10308 }],
  Heatran: [{ form: 'mega', types: ['fire', 'steel'], spriteId: 10311 }],
  Darkrai: [{ form: 'mega', types: ['dark'], spriteId: 10312 }],
  Golurk: [{ form: 'mega', types: ['ground', 'ghost'], spriteId: 10313 }],
  Meowstic: [{ form: 'mega', types: ['psychic'], spriteId: 10314 }],
  Crabominable: [{ form: 'mega', types: ['fighting', 'ice'], spriteId: 10315 }],
  Golisopod: [{ form: 'mega', types: ['bug', 'steel'], spriteId: 10316 }],
  Magearna: [{ form: 'mega', types: ['steel', 'fairy'], spriteId: 10317 }],
  'Magearna-Original': [
    { form: 'mega', types: ['steel', 'fairy'], spriteId: 10318 },
  ],
  Zeraora: [{ form: 'mega', types: ['electric'], spriteId: 10319 }],
  Scovillain: [{ form: 'mega', types: ['grass', 'fire'], spriteId: 10320 }],
  Glimmora: [{ form: 'mega', types: ['rock', 'poison'], spriteId: 10321 }],
  Tatsugiri: [{ form: 'mega', types: ['dragon', 'water'], spriteId: 10322 }],
  'Tatsugiri-Droopy': [
    { form: 'mega', types: ['dragon', 'water'], spriteId: 10323 },
  ],
  'Tatsugiri-Stretchy': [
    { form: 'mega', types: ['dragon', 'water'], spriteId: 10324 },
  ],
  Baxcalibur: [{ form: 'mega', types: ['dragon', 'ice'], spriteId: 10325 }],
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

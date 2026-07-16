// Fetches PokeAPI evolution data, writes evolvesTo into pokemon.js entries (string | array | omitted).
// Usage: node scripts/fetch-evolutions.js

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const POKEMON_FILE = path.join(__dirname, '../src/data/pokemon.js')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(1000 * (i + 1))
    }
  }
}

function formatName(name) {
  // PokeAPI uses lowercase hyphenated names
  const specialCases = {
    'nidoran-f': 'Nidoran\u2640',
    'nidoran-m': 'Nidoran\u2642',
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'porygon-z': 'Porygon-Z',
    'ho-oh': 'Ho-Oh',
    'tapu-koko': 'Tapu Koko',
    'tapu-lele': 'Tapu Lele',
    'tapu-bulu': 'Tapu Bulu',
    'tapu-fini': 'Tapu Fini',
    'type-null': 'Type: Null',
    'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o',
    'kommo-o': 'Kommo-o',
    farfetchd: "Farfetch'd",
  }

  if (specialCases[name]) {
    return specialCases[name]
  }

  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

function parseEvolutionChain(chain, evolutionMap) {
  const pokemonName = formatName(chain.species.name)

  if (chain.evolves_to && chain.evolves_to.length > 0) {
    const evolutions = chain.evolves_to.map((evo) =>
      formatName(evo.species.name),
    )

    if (evolutions.length === 1) {
      evolutionMap[pokemonName] = evolutions[0]
    } else {
      evolutionMap[pokemonName] = evolutions
    }

    for (const evo of chain.evolves_to) {
      parseEvolutionChain(evo, evolutionMap)
    }
  }

  return evolutionMap
}

async function fetchAllEvolutionChains() {
  console.log('Fetching evolution chain list...')

  const evolutionMap = {}
  let url = 'https://pokeapi.co/api/v2/evolution-chain?limit=500'

  while (url) {
    const data = await fetchWithRetry(url)

    console.log(`Processing ${data.results.length} evolution chains...`)

    for (const chain of data.results) {
      await delay(100) // Rate limiting

      try {
        const chainData = await fetchWithRetry(chain.url)
        parseEvolutionChain(chainData.chain, evolutionMap)
      } catch (error) {
        console.error(`Failed to fetch chain ${chain.url}:`, error.message)
      }
    }

    url = data.next
  }

  return evolutionMap
}

function updatePokemonFile(evolutionMap) {
  console.log('Reading pokemon.js...')
  const content = fs.readFileSync(POKEMON_FILE, 'utf-8')

  const dataMatch = content.match(/export const POKEMON_DATA = \[([\s\S]*?)\]/)
  if (!dataMatch) {
    throw new Error('Could not find POKEMON_DATA in pokemon.js')
  }

  const entriesRegex =
    /\{ name: "([^"]+)", types: \[([^\]]*)](?:, evolvesTo: (?:"[^"]+"|\[[^\]]*]))? \}/g

  let newContent = content
  let match = entriesRegex.exec(content)

  while (match !== null) {
    const fullMatch = match[0]
    const pokemonName = match[1]
    const typesStr = match[2]

    const evolution = evolutionMap[pokemonName]

    let newEntry
    if (evolution) {
      if (Array.isArray(evolution)) {
        const evoStr = JSON.stringify(evolution)
        newEntry = `{ name: "${pokemonName}", types: [${typesStr}], evolvesTo: ${evoStr} }`
      } else {
        newEntry = `{ name: "${pokemonName}", types: [${typesStr}], evolvesTo: "${evolution}" }`
      }
    } else {
      newEntry = `{ name: "${pokemonName}", types: [${typesStr}] }`
    }

    newContent = newContent.replace(fullMatch, newEntry)
    match = entriesRegex.exec(content)
  }

  console.log('Writing updated pokemon.js...')
  fs.writeFileSync(POKEMON_FILE, newContent)
}

try {
  const evolutionMap = await fetchAllEvolutionChains()

  console.log(
    `\nFound evolutions for ${Object.keys(evolutionMap).length} Pokemon`,
  )

  console.log('\nExamples:')
  console.log('  Bulbasaur ->', evolutionMap['Bulbasaur'])
  console.log('  Eevee ->', evolutionMap['Eevee'])
  console.log('  Poliwhirl ->', evolutionMap['Poliwhirl'])

  updatePokemonFile(evolutionMap)

  console.log('\nDone! pokemon.js has been updated with evolution data.')
} catch (error) {
  console.error('Error:', error)
  process.exit(1)
}

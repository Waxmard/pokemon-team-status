/**
 * Fetches missing Pokemon forms from PokeAPI and outputs entries for pokemon.js.
 *
 * Forms include: Rotom, Alolan, Galarian, Paldean, Oricorio, Wormadam, Shaymin, Castform
 *
 * Usage: node scripts/fetch-missing-forms.js
 */

// API names to fetch
const MISSING_FORMS = [
  // Rotom forms
  'rotom-heat',
  'rotom-wash',
  'rotom-frost',
  'rotom-fan',
  'rotom-mow',
  // Alolan forms
  'rattata-alola',
  'raticate-alola',
  'raichu-alola',
  'sandshrew-alola',
  'sandslash-alola',
  'vulpix-alola',
  'ninetales-alola',
  'diglett-alola',
  'dugtrio-alola',
  'meowth-alola',
  'persian-alola',
  'geodude-alola',
  'graveler-alola',
  'golem-alola',
  'grimer-alola',
  'muk-alola',
  'exeggutor-alola',
  'marowak-alola',
  // Galarian forms
  'meowth-galar',
  'ponyta-galar',
  'rapidash-galar',
  'slowpoke-galar',
  'slowbro-galar',
  'slowking-galar',
  'farfetchd-galar',
  'weezing-galar',
  'mr-mime-galar',
  'corsola-galar',
  'zigzagoon-galar',
  'linoone-galar',
  'darumaka-galar',
  'darmanitan-standard-galar',
  'yamask-galar',
  'stunfisk-galar',
  // Paldean forms
  'wooper-paldea',
  // Oricorio styles
  'oricorio-pom-pom',
  'oricorio-pau',
  'oricorio-sensu',
  // Wormadam forms
  'wormadam-sandy',
  'wormadam-trash',
  // Shaymin
  'shaymin-sky',
  // Castform weather forms
  'castform-sunny',
  'castform-rainy',
  'castform-snowy',
]

// Rate limiting helper
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

// Format API name to display name
function formatDisplayName(apiName) {
  // Regional forms: suffix becomes prefix
  if (apiName.endsWith('-alola')) {
    const base = apiName.replace('-alola', '')
    return 'Alolan ' + capitalize(base)
  }
  if (apiName.endsWith('-galar')) {
    const base = apiName.replace('-galar', '')
    return 'Galarian ' + capitalize(base)
  }
  if (apiName.endsWith('-paldea')) {
    const base = apiName.replace('-paldea', '')
    return 'Paldean ' + capitalize(base)
  }

  // Special handling for darmanitan-standard-galar
  if (apiName === 'darmanitan-standard-galar') {
    return 'Galarian Darmanitan'
  }

  // Rotom forms: Rotom-Heat, Rotom-Wash, etc.
  if (apiName.startsWith('rotom-')) {
    const form = apiName.replace('rotom-', '')
    return 'Rotom-' + capitalize(form)
  }

  // Oricorio styles: Oricorio Pom-Pom, Oricorio Pa'u, Oricorio Sensu
  if (apiName.startsWith('oricorio-')) {
    const style = apiName.replace('oricorio-', '')
    if (style === 'pom-pom') return 'Oricorio Pom-Pom'
    if (style === 'pau') return "Oricorio Pa'u"
    if (style === 'sensu') return 'Oricorio Sensu'
  }

  // Wormadam forms: Wormadam-Sandy, Wormadam-Trash
  if (apiName.startsWith('wormadam-')) {
    const form = apiName.replace('wormadam-', '')
    return 'Wormadam-' + capitalize(form)
  }

  // Shaymin: Shaymin-Sky
  if (apiName === 'shaymin-sky') {
    return 'Shaymin-Sky'
  }

  // Castform: Castform-Sunny, Castform-Rainy, Castform-Snowy
  if (apiName.startsWith('castform-')) {
    const form = apiName.replace('castform-', '')
    return 'Castform-' + capitalize(form)
  }

  // Fallback
  return apiName
    .split('-')
    .map((w) => capitalize(w))
    .join('-')
}

function capitalize(str) {
  // Handle special cases
  const specialCases = {
    farfetchd: "Farfetch'd",
    'mr-mime': 'Mr. Mime',
  }
  if (specialCases[str]) return specialCases[str]

  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function fetchPokemonForm(apiName) {
  const url = `https://pokeapi.co/api/v2/pokemon/${apiName}`
  const data = await fetchWithRetry(url)

  const types = data.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)

  return {
    apiName,
    displayName: formatDisplayName(apiName),
    types,
    spriteId: data.id,
  }
}

async function main() {
  console.log(`Fetching ${MISSING_FORMS.length} Pokemon forms from PokeAPI...\n`)

  const results = []

  for (const apiName of MISSING_FORMS) {
    try {
      await delay(100) // Rate limiting
      const pokemon = await fetchPokemonForm(apiName)
      results.push(pokemon)
      console.log(`  ${pokemon.displayName}: ${pokemon.types.join('/')}`)
    } catch (error) {
      console.error(`  Failed to fetch ${apiName}: ${error.message}`)
    }
  }

  console.log('\n// ============================================')
  console.log('// Add these entries to the end of POKEMON_DATA')
  console.log('// ============================================\n')

  // Group by category
  const categories = {
    rotom: results.filter((r) => r.apiName.startsWith('rotom-')),
    alolan: results.filter((r) => r.apiName.endsWith('-alola')),
    galarian: results.filter(
      (r) => r.apiName.endsWith('-galar') || r.apiName.includes('-galar')
    ),
    paldean: results.filter((r) => r.apiName.endsWith('-paldea')),
    oricorio: results.filter((r) => r.apiName.startsWith('oricorio-')),
    wormadam: results.filter((r) => r.apiName.startsWith('wormadam-')),
    shaymin: results.filter((r) => r.apiName.startsWith('shaymin-')),
    castform: results.filter((r) => r.apiName.startsWith('castform-')),
  }

  function formatEntry(p) {
    return `  { name: '${p.displayName}', types: [${p.types.map((t) => `'${t}'`).join(', ')}], spriteId: ${p.spriteId} },`
  }

  console.log('  // Rotom Forms')
  for (const p of categories.rotom) {
    console.log(formatEntry(p))
  }

  console.log('  // Alolan Forms')
  for (const p of categories.alolan) {
    console.log(formatEntry(p))
  }

  console.log('  // Galarian Forms')
  for (const p of categories.galarian) {
    console.log(formatEntry(p))
  }

  console.log('  // Paldean Forms')
  for (const p of categories.paldean) {
    console.log(formatEntry(p))
  }

  console.log('  // Oricorio Styles')
  for (const p of categories.oricorio) {
    console.log(formatEntry(p))
  }

  console.log('  // Wormadam Forms')
  for (const p of categories.wormadam) {
    console.log(formatEntry(p))
  }

  console.log('  // Shaymin Forms')
  for (const p of categories.shaymin) {
    console.log(formatEntry(p))
  }

  console.log('  // Castform Forms')
  for (const p of categories.castform) {
    console.log(formatEntry(p))
  }

  console.log(`\n// Total: ${results.length} forms added`)
}

main()

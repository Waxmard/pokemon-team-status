import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPRITES_DIR = join(__dirname, '..', 'public', 'sprites')
const BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// Dynamically import data modules (they use bare export, no DOM deps)
const { POKEMON_DATA } = await import('../src/data/pokemon.js')
const { MEGA_EVOLUTIONS } = await import('../src/data/megaEvolutions.js')

// Collect all unique sprite IDs
const spriteIds = new Set()

for (let i = 0; i < POKEMON_DATA.length; i++) {
  spriteIds.add(POKEMON_DATA[i].spriteId ?? i + 1)
}

for (const megas of Object.values(MEGA_EVOLUTIONS)) {
  for (const mega of megas) {
    spriteIds.add(mega.spriteId)
  }
}

console.log(`Found ${spriteIds.size} unique sprite IDs`)

mkdirSync(SPRITES_DIR, { recursive: true })

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    return res
  }
}

let downloaded = 0
let skipped = 0
let failed = 0

const ids = [...spriteIds].sort((a, b) => a - b)
const batchSize = 30

for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize)

  await Promise.all(
    batch.map(async (id) => {
      const dest = join(SPRITES_DIR, `${id}.png`)

      if (existsSync(dest)) {
        skipped++
        return
      }

      try {
        const res = await fetchWithRetry(`${BASE_URL}/${id}.png`)
        if (!res.ok) {
          console.warn(`  SKIP ${id}.png — HTTP ${res.status}`)
          failed++
          return
        }
        const buffer = Buffer.from(await res.arrayBuffer())
        writeFileSync(dest, buffer)
        downloaded++
      } catch (err) {
        console.warn(`  FAIL ${id}.png — ${err.message}`)
        failed++
      }
    }),
  )

  const progress = Math.min(i + batchSize, ids.length)
  process.stdout.write(`\r  ${progress}/${ids.length}`)
}

console.log(
  `\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`,
)

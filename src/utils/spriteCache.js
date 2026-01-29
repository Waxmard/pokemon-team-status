import { POKEMON_DATA } from '../data/pokemon.js'
import { getSmallSpriteUrl } from './pokemon.js'

/**
 * Pre-fetches all small sprites to populate the service worker cache.
 * ~2.5MB total for 847 Pokemon.
 */
export async function prefetchAllSprites() {
  const urls = POKEMON_DATA.map((p) => getSmallSpriteUrl(p.name)).filter(
    Boolean,
  )

  // Fetch in parallel batches to avoid overwhelming the browser
  const batchSize = 50
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map((url) => fetch(url, { mode: 'no-cors' })),
    )
  }
}

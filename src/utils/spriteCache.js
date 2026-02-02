import { BERRY_NAMES } from '../data/berries.js'
import { POKEMON_DATA } from '../data/pokemon.js'
import { ALL_TYPES, getTypeIcon } from '../data/types.js'
import { getBerrySprite, getSmallSpriteUrl } from './pokemon.js'

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
    await Promise.allSettled(batch.map((url) => fetch(url)))
  }
}

/**
 * Pre-fetches all berry sprites to populate the service worker cache.
 */
export async function prefetchBerrySprites() {
  const urls = BERRY_NAMES.map(getBerrySprite).filter(Boolean)
  await Promise.allSettled(urls.map((url) => fetch(url)))
}

/**
 * Pre-fetches all type icons to populate the service worker cache.
 */
export async function prefetchTypeIcons() {
  const urls = ALL_TYPES.map(getTypeIcon)
  await Promise.allSettled(urls.map((url) => fetch(url)))
}

import { BERRY_NAMES, ITEM_NAMES } from '../data/berries.js'
import { ALL_TYPES, getTypeIcon } from '../data/types.js'
import { getBerrySprite } from './pokemon.js'

/**
 * Pre-fetches all berry sprites to populate the service worker cache.
 */
export async function prefetchBerrySprites() {
  const urls = [...BERRY_NAMES, ...ITEM_NAMES]
    .map(getBerrySprite)
    .filter(Boolean)
  await Promise.allSettled(urls.map((url) => fetch(url, { mode: 'no-cors' })))
}

/**
 * Pre-fetches all type icons to populate the service worker cache.
 */
export async function prefetchTypeIcons() {
  const urls = ALL_TYPES.map(getTypeIcon)
  await Promise.allSettled(urls.map((url) => fetch(url)))
}

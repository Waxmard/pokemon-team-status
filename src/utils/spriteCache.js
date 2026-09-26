import { BERRY_NAMES, ITEM_NAMES } from '../data/berries.js'
import { ALL_TYPES, getTypeIcon } from '../data/types.js'
import { getBerrySprite } from './pokemon.js'

/**
 * Pre-fetches berry and type-icon sprites to populate the service worker cache.
 *
 * Berry sprites come from a third-party host and are requested as `no-cors`;
 * type icons are same-origin and do not need that.
 */
export async function prefetchSprites() {
  const requests = [
    ...[...BERRY_NAMES, ...ITEM_NAMES]
      .map(getBerrySprite)
      .filter(Boolean)
      .map((url) => fetch(url, { mode: 'no-cors' })),
    ...ALL_TYPES.map(getTypeIcon).map((url) => fetch(url)),
  ]
  await Promise.allSettled(requests)
}

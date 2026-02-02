import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

// Clean old caches
cleanupOutdatedCaches()

// Precache all assets from the manifest (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// Runtime caching for local type icons (belt-and-suspenders with precache)
registerRoute(
  ({ url }) => url.pathname.match(/\/types\/.*\.svg$/),
  new CacheFirst({
    cacheName: 'type-icons',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  }),
)

// Runtime caching for high-res official artwork
registerRoute(
  ({ url }) =>
    url.origin === 'https://raw.githubusercontent.com' &&
    url.pathname.includes(
      '/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',
    ),
  new CacheFirst({
    cacheName: 'pokemon-sprites-hd',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Runtime caching for small sprites
registerRoute(
  ({ url }) =>
    url.origin === 'https://raw.githubusercontent.com' &&
    url.pathname.match(
      /\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\d+\.png$/,
    ),
  new CacheFirst({
    cacheName: 'pokemon-sprites-small',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Runtime caching for berry and item sprites
registerRoute(
  ({ url }) =>
    url.origin === 'https://raw.githubusercontent.com' &&
    url.pathname.includes('/PokeAPI/sprites/master/sprites/items/'),
  new CacheFirst({
    cacheName: 'pokemon-items',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Take control immediately
self.skipWaiting()
self.clients.claim()

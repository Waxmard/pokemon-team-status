# Deployment

## Why a Web App?

This app is a Progressive Web App (PWA) rather than a native mobile app for several reasons:

- **No hosting costs**: Cloudflare Pages free tier handles everything
- **No App Store fees**: Apple charges $99/year, Google charges $25 one-time
- **No approval process**: Push to main and it's live
- **Works everywhere**: Any device with a browser
- **Easy updates**: Users always get the latest version

The tradeoff is slightly worse integration with the OS, but for a simple calculator app, PWA capabilities are sufficient.

## Cloudflare Pages Setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your GitHub repository
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Deploy

Cloudflare automatically redeploys on every push to main.

## Offline-First Design

The app is designed to work offline because the primary use case is checking team matchups while playing Pokemon on a handheld device. You might not have reliable internet.

### IndexedDB Persistence

All user data is stored in IndexedDB (`pokemon-team-calculator` database):

- Team composition
- Box (reserve Pokemon)
- Defeated gyms
- Pinned gym

This data persists across sessions and survives browser restarts.

### Sprite Caching Strategy

Pokemon sprites are fetched from GitHub (PokeAPI sprites repository) and cached aggressively using Workbox:

| Cache | Contents | Max Entries | Expiration |
|-------|----------|-------------|------------|
| `pokemon-sprites-hd` | High-res artwork | 500 | 30 days |
| `pokemon-sprites-small` | Small sprites | 1000 | 30 days |
| `pokemon-items` | Berry/item sprites | 100 | 30 days |

All caches use `CacheFirst` strategy: serve from cache if available, only fetch from network on cache miss.

On first load, the app pre-fetches all small sprites (~2.5MB) in the background. This ensures offline access to all Pokemon sprites after the initial load.

### Service Worker

The service worker (`vite-plugin-pwa` with Workbox):

- Caches all app assets (JS, CSS, HTML, icons)
- Auto-updates when new versions are deployed
- Falls back to cache when offline

## Safari/iOS Optimization

The primary target platform is Safari on iOS (iPhone/iPad). The app includes:

- PWA meta tags for home screen installation
- Apple touch icons (192x192, 512x512)
- `display: standalone` for full-screen experience
- Theme color matching the app background

### Installing on iOS

1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app now runs like a native app

### iOS Offline Behavior

**Important**: On iOS, offline support only works when the app is installed to the Home Screen.

| Method | Offline Support |
|--------|-----------------|
| Home Screen PWA | Works offline after initial load |
| Safari tabs | Does NOT work offline if Safari is fully closed |

This is an iOS Safari limitation. When Safari is closed completely (swiped away in app switcher), the browser terminates the service worker. When reopened offline, Safari cannot re-register the service worker, so the cached content is inaccessible.

Home Screen PWAs run in their own process and maintain service worker registration, which is why offline works there.

**Recommendation**: Always install to Home Screen for reliable offline access.

## Build Output

The production build outputs to `dist/`:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── sw.js              # Service worker
├── workbox-[hash].js  # Workbox runtime
└── manifest.webmanifest
```

This folder can be deployed to any static hosting provider.

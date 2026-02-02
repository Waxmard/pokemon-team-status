# Pokemon Team Weakness Calculator

A PWA for calculating team weaknesses against gym types. Built with Vue 3 + Vite.

Primarily designed for [Pokemon Emerald Rogue](https://www.pokecommunity.com/threads/pokemon-emerald-rogue.479406/) where gym types are randomized, but works for any Pokemon game.

## Quick Start

```bash
npm install
npm run dev
```

To run locally on your phone:

```bash
npx vite --host
```

## Documentation

- [How It Works](docs/how-it-works.md) - Scoring algorithm and Pokemon basics
- [Developer Guide](docs/developer-guide.md) - Architecture and contributing
- [Deployment](docs/deployment.md) - Cloudflare Pages setup and offline strategy

## Features

- Build a team of up to 6 Pokemon with reserve box
- See weakness/resistance scores against all 18 types
- Track defeated gyms
- Mega evolution support
- Works fully offline (PWA)
  - **iOS**: Must be added to Home Screen for offline support

## Tech Stack

- Vue 3 + Vite
- Naive UI
- IndexedDB (offline storage)
- PWA with Workbox

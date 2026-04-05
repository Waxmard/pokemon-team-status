# Pokemon Team Weakness Calculator

A PWA for calculating team weaknesses against gym types. Built with Vue 3 +
Vite. Works on mobile and desktop.

Works for any Pokemon game. Especially useful for romhacks with randomized
gym types.

**[Try it live](https://pokemon-team-status.pages.dev)**

## Quick Start

```bash
npm install
npm run dev
```

To run locally on your phone:

```bash
npx vite --host
```

### Supabase (Soul Link sync)

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and
anon key. Without these, the app runs in local-only mode (no online sync).

## Documentation

- [How It Works](docs/how-it-works.md) - Scoring algorithm and Pokemon basics
- [Developer Guide](docs/developer-guide.md) - Architecture and contributing
- [Deployment](docs/deployment.md) - Cloudflare Pages setup and offline strategy

## Features

- Build a team of up to 6 Pokemon with reserve box
- See weakness/resistance scores against all 18 types
- Track defeated gyms
- Swap suggestions to optimize team coverage
- Mega evolution support
- Death box: track fainted Pokemon, revive or delete them
- Solo run management: save multiple runs, name them, switch between them
- Generation rules: toggle Pre-Gen 6 / Post-Gen 6 rulesets
- Cloud backup for solo runs via invite codes
- **Soul Link mode**: Shared two-player runs with paired catches, real-time
  sync via Supabase, and invite code sharing
- Works fully offline (PWA)
  - **iOS**: Must be added to Home Screen for offline support

## Tech Stack

- Vue 3 + Vite
- Naive UI
- IndexedDB (offline storage)
- Supabase (Soul Link sync + Realtime)
- PWA with Workbox

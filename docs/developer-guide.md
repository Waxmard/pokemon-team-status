# Developer Guide

## Prerequisites

- Node.js 18+
- npm

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Mobile Testing

To test on your phone (must be on the same network):

```bash
npx vite --host
```

This exposes the dev server on your local IP
(e.g., `http://192.168.1.100:5173`).

#### Testing PWA/Offline on iOS

**Service workers require HTTPS** (except `localhost`). Testing via local IP
(`http://192.168.x.x`) won't register the service worker.

Options for HTTPS testing:

1. **Cloudflare Tunnel** (easiest):

   ```bash
   npm run build && npm run preview
   cloudflared tunnel --url http://localhost:4173
   ```

   Use the `https://xxxx.trycloudflare.com` URL on your iPhone.

2. **ngrok**:

   ```bash
   npm run build && npm run preview
   ngrok http 4173
   ```

To verify the service worker registered:

- Mac Safari → Develop menu → [Your iPhone] → [The URL]
- Check Console for registration messages
- Check Application/Storage → Service Workers

**iOS offline only works as Home Screen PWA** (not Safari tabs). See
[Deployment docs](deployment.md#ios-offline-behavior) for details.

## Project Structure

```text
src/
├── components/     # Vue components
├── composables/    # Shared state (useRunStore, useSoulLinkStore, etc.)
├── data/           # Pokemon, types, abilities data
├── services/       # Supabase client, repositories
├── utils/          # Scoring, Soul Link model/pairing
├── theme/          # Naive UI theming
└── styles/         # Global CSS

public/
└── icons/          # PWA icons

docs/               # Documentation
```

## Available Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Check for linting issues (Biome) |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format all source files |

## Architecture Overview

### State Management

The app uses Vue composables with module-level refs (singleton pattern). State
is shared across all components that import the composable.

#### useRunStore.js (Solo Mode)

Handles solo run state and IndexedDB persistence:

- `team` - Active Pokemon team (up to 6)
- `box` - Reserve Pokemon storage
- `defeatedGyms` - List of defeated gym types
- `pinnedGym` - Currently pinned gym type

#### useSoulLinkStore.js (Soul Link Mode)

Full state management for two-player Soul Link runs:

- Player rosters (team + box per player), gym progress, player names
- Supabase sync: `createSession`, `joinSession`, `pushState`, `pullState`
- Realtime subscription for instant partner updates
- Local persistence via IndexedDB snapshots

#### useRunModeStore.js

Persists the selected run mode (`solo` or `soul-link`) across sessions via
localStorage.

#### useDraftAction.js

Manages the draft/editing state for adding or modifying Pokemon:

- Tracks current edit operation (add to team, add to box, edit, swap)
- Holds temporary Pokemon configuration (pokemon, ability, berry, moves,
  specialMove)

### Services

#### supabaseClient.js

Shared Supabase client. Exports `null` when env vars are missing (graceful
degradation for local-only mode).

#### supabaseRepository.js

Data access layer for the `sessions` table:

- `createSession` / `fetchSessionById` / `fetchSessionByInviteCode`
- `pushSessionState` (optimistic concurrency via version column)
- `deleteSession`
- `subscribeToSession` (Supabase Realtime)

#### localRunRepository.js

IndexedDB persistence for both solo and Soul Link data.

### Core Type Calculation

`src/utils/typeCalc.js` contains the scoring algorithm:

- `calculateScore(gymType, team)` - Main scoring function
- `getDefensiveMultiplier()` - Type effectiveness calculation
- `applyAbilityDefense()` - Ability modifier application
- `hasEffectiveMove()` - Offensive coverage check
- `calculateBerryTiebreaker()` - Tiebreaker for equal scores
- `findBestSwap()` - Best swap candidate from a pool (prioritizes pinned gym)
- `findGlobalBestSwap()` - Best single team/box swap (prioritizes pinned gym)
- `calculateTypeSuggestionScore()` - Per-type improvement score (prioritizes pinned gym)

See [How It Works](how-it-works.md) for algorithm details.

### Data Files

| File | Contents |
| ---- | -------- |
| `src/data/types.js` | Type chart, colors, and icons |
| `src/data/pokemon.js` | Pokemon definitions with types and evolution chains |
| `src/data/abilities.js` | Ability effects (immunities, resistances, etc.) |
| `src/data/berries.js` | Type-reducing berries |
| `src/data/specialMoves.js` | Moves with unique type mechanics |

### Component Hierarchy

```text
App.vue
├── TeamSection.vue              # Team and box display with DraftPanel
│   ├── TeamSlot.vue             # Individual Pokemon slot
│   └── DraftPanel.vue           # Multi-step wizard for adding/editing
├── GymColumns.vue               # Gym type weakness columns
│   └── GymColumn.vue            # Individual gym type with score
│       └── GymRow.vue           # Single gym entry
├── SwapPreview.vue              # Preview when swapping box/team Pokemon
└── SoulLinkShell.vue            # Soul Link mode wrapper
    └── SoulLinkPlayerView.vue   # Player view (TeamSection + GymColumns)
```

## Code Style

The project uses [Biome](https://biomejs.dev/) for linting and formatting:

- No semicolons
- Single quotes
- 2-space indentation
- No trailing commas

Run `npm run lint:fix` before committing.

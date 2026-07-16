# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Build Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Linting

- `npm run lint` - Check for linting/formatting issues
- `npm run lint:fix` - Auto-fix linting and formatting issues
- `npm run format` - Format all source files
- `npx markdownlint-cli2 docs/*.md README.md` - Lint markdown files

## Release Process

Uses [Release Please](https://github.com/googleapis/release-please) with [conventional commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

- Commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `test:`
- Release Please automatically creates a "Release PR" when releasable commits land on `main`
- Merging the Release PR bumps the version in `package.json`, updates `CHANGELOG.md`, and creates a `v*` tag
- Cloudflare Pages auto-deploys on every push to `main`
- Configuration: `release-please-config.json` and `.release-please-manifest.json`

## Development Guidelines

- Delete unused code completely; don't comment it out or leave fallbacks
- Avoid backwards-compatibility hacks (no `_` prefixed unused vars, no `// removed` comments)
- Keep changes minimal and focused on what's requested
- Prefer editing existing files over creating new abstractions
- Do not run git add, commit, or push commands
- Do not run npm run dev (user will run it themselves)
- When editing markdown files, run `npx markdownlint-cli2 <file>` to check for lint errors

## Architecture

This is a Vue 3 PWA for calculating Pokemon team weaknesses against gym types. It uses Vite as the build tool and Naive UI as the component library.

### State Management

The app uses Vue composables with module-level refs (singleton pattern). State is shared across all components that import the composable.

- **`useRunStore.js`** - Solo mode state and IndexedDB persistence:
  - `team` - Active Pokemon team (up to 6)
  - `box` - Reserve Pokemon storage
  - `dead` - Death box (fainted Pokemon)
  - `defeatedGyms` - List of defeated gym types
  - `pinnedGym` - Currently pinned gym type
  - `generationRules` - Active ruleset (Pre-Gen 6 or Post-Gen 6)

- **`useSoulLinkStore.js`** - Two-player Soul Link state:
  - Player rosters (team + box + dead per player), gym progress, player names
  - Supabase sync: `createSession`, `joinSession`, `pushState`, `pullState`
  - Realtime subscription for instant partner updates
  - Local persistence via IndexedDB snapshots

- **`useRunModeStore.js`** - Persists selected run mode (`solo` or `soul-link`) via localStorage

- **`useDraftAction.js`** - Draft/editing state for adding or modifying Pokemon:
  - Tracks current edit operation (add to team, add to box, edit, swap)
  - Holds temporary Pokemon configuration (pokemon, ability, berry, moves, specialMove)

Other composables: `useSoloRunManager.js` and `useSoulLinkRunManager.js` (run index/registry), `useSoloSync.js` and `useSessionSync.js` (Supabase sync), `useSoulLinkHandlers.js` (Soul Link event handlers), `useWizardNavigation.js` (draft panel steps), `createRunIndexManager.js` (shared run index factory)

### Core Type Calculation Logic

`src/utils/typeCalc.js` contains the scoring algorithm:

- Scores teams against gym types by summing defensive multipliers and offensive coverage
- Accounts for abilities (immunities, resistances) and berries
- Special moves (Flying Press, Freeze-Dry) have custom effectiveness rules
- Protean ability adds move types as defensive types
- Swap suggestions evaluate team/box swaps using score profiles (pinned gym first, then undefeated gyms)
- Type suggestions score each gym type by simulating hypothetical additions (< 6 members) or replacements (full team)

### Data Files

- `src/data/types.js` - Type chart, colors, and icons
- `src/data/pokemon.js` - Pokemon definitions with types and evolution chains
- `src/data/abilities.js` - Ability effects (immunities, resistances, weaknesses, protean)
- `src/data/berries.js` - Type-reducing berries
- `src/data/specialMoves.js` - Moves with unique type mechanics
- `src/data/megaEvolutions.js` - Mega evolution forms with types and sprite IDs

### Component Hierarchy

```text
App.vue
├── AppHeader.vue                # Header with title and action buttons
├── TeamSection.vue              # Team and box display with DraftPanel (solo mode)
│   ├── TeamSlot.vue             # Individual Pokemon slot
│   └── DraftPanel.vue           # Multi-step wizard for adding/editing
│       └── PokemonPreview.vue   # Pokemon preview with sprites and evolution animation
├── GymColumns.vue               # Gym type weakness columns (includes inline swap preview)
│   └── GymColumn.vue            # Individual gym type with score
│       └── GymRow.vue           # Single gym entry
├── SoulLinkShell.vue            # Soul Link mode wrapper
│   └── SoulLinkPlayerView.vue   # Player view (TeamSection + GymColumns)
├── SessionDialog.vue            # Session management (used for both Solo and Soul Link)
├── DialogActionSection.vue      # Dialog section container
└── SpriteImg.vue                # Sprite image with caching
```

### Services

- `src/services/supabaseClient.js` - Shared Supabase client (exports `null` when env vars missing)
- `src/services/supabaseRepository.js` - Data access layer for sessions table
- `src/services/localRunRepository.js` - IndexedDB persistence for solo and Soul Link data

### Key Utilities

- `src/utils/typeCalc.js` - Scoring algorithm (see Core Type Calculation Logic above)
- `src/utils/pokemon.js` - Pokemon data helpers (sprite URLs, member building)
- `src/utils/generationRules.js` - Ruleset sanitization
- `src/utils/runSnapshot.js` - Run state serialization/deserialization
- `src/utils/soulLinkModel.js` - Soul Link state building and merging
- `src/utils/soulLinkPairing.js` - Linked Pokemon pairing logic
- `src/utils/spriteCache.js` - Sprite preloading

### PWA Configuration

The app is configured as a Progressive Web App via `vite-plugin-pwa` with offline support and workbox caching.

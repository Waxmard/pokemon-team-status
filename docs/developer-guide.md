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

## Project Structure

```text
src/
├── components/     # Vue components
├── composables/    # Shared state (useStorage, useDraftAction)
├── data/           # Pokemon, types, abilities data
├── utils/          # Scoring algorithm (typeCalc.js)
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

#### useStorage.js

Handles persistent data via IndexedDB (`pokemon-team-calculator` database):

- `team` - Active Pokemon team (up to 6)
- `box` - Reserve Pokemon storage (up to 3)
- `defeatedGyms` - List of defeated gym types
- `pinnedGym` - Currently pinned gym type

Data persists across sessions and works offline.

#### useDraftAction.js

Manages the draft/editing state for adding or modifying Pokemon:

- Tracks current edit operation (add to team, add to box, edit, swap)
- Holds temporary Pokemon configuration (pokemon, ability, berry, moves,
  specialMove)

### Core Type Calculation

`src/utils/typeCalc.js` contains the scoring algorithm:

- `calculateScore(gymType, team)` - Main scoring function
- `getDefensiveMultiplier()` - Type effectiveness calculation
- `applyAbilityDefense()` - Ability modifier application
- `hasEffectiveMove()` - Offensive coverage check
- `calculateBerryTiebreaker()` - Tiebreaker for equal scores

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
├── TeamSection.vue          # Team and box display with DraftPanel
│   ├── TeamSlot.vue         # Individual Pokemon slot
│   └── DraftPanel.vue       # Multi-step wizard for adding/editing
├── GymColumns.vue           # Gym type weakness columns
│   └── GymColumn.vue        # Individual gym type with score
│       └── GymRow.vue       # Single gym entry
└── SwapPreview.vue          # Preview when swapping box/team Pokemon
```

## Code Style

The project uses [Biome](https://biomejs.dev/) for linting and formatting:

- No semicolons
- Single quotes
- 2-space indentation
- No trailing commas

Run `npm run lint:fix` before committing.

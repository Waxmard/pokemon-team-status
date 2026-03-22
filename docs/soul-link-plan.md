# Soul Link Plan

## Goal

Add a simple shared run mode for Soul Link play so two players can keep one run
in sync without requiring accounts.

The app currently stores team, box, defeated gyms, and pinned gym locally in
IndexedDB via `useStorage.js`. That offline-first model works well for solo use,
but Soul Link needs those same concepts to move toward a shared run/session
model that can sync across devices.

For v1, scope the feature to exactly two players sharing one session, linked
catches, death state, separate gym progress per player, and a UI that mostly
reuses the existing app shell instead of introducing a separate app surface.

## Completed

### Shell + State Management

- **Options dialog entry points** — Solo Run / Soul Link Run actions in
  `src/App.vue` let the user pick a run mode
- **Title area** — Shows the currently viewed player name (editable via click)
  with swap controls to switch between players
- **`useSoulLinkStore.js`** — Full state management composable handling players,
  rosters (team + box), and gym progress for both players
- **`soulLinkModel.js`** — Data model for Soul Link members including `pairId`,
  `isDead`, `catchLocation`, and related fields
- **`SoulLinkShell.vue` and `SoulLinkPlayerView.vue`** — View components that
  compose the Soul Link UI using the existing app shell
- **`useRunModeStore.js`** — Persists the selected run mode across sessions
- **Read-only mode** — `TeamSection` and `GymColumns` accept props to disable
  editing, used when viewing the remote player

### Phase 1: Local Editing + Options Menu

- **Options menu** — Finalized layout with generation rules toggle, view other
  player button, reset actions, and new run actions
- **Local player editing** — Removed read-only restriction; all editing
  interactions (add/edit/delete/swap Pokemon, defeat/undefeat/pin gyms) flow
  through `useSoulLinkStore` when in Soul Link mode
- **Reverse adapters** — `adaptUiMemberToSoulLinkMember` and
  `buildSoulLinkMemberFromDraft` in `soulLinkUi.js` convert between UI and
  soul link member formats
- **`setPlayerRoster`** — Atomic full-roster replacement in the store for swap
  operations that update team + box simultaneously
- **DraftPanel swap suggestions** — Added `box`, `defeatedGyms`, `pinnedGym`
  props so DraftPanel works in Soul Link mode (falls back to solo store)
- **Pin touch fix** — `GymColumn.vue` now calls `event.preventDefault()` on
  `touchend` when a pin occurs, preventing a synthetic click from
  defeating/undefeating the gym underneath

### Phase 2: Paired Pokemon

- Paired partner sprite display in TeamSlot (visual indicator of linked catch)
- Catch location step in DraftPanel for auto-pairing by location
- `reconcileSoulLinkPairing` in App.vue for bidirectional pair resolution
- Linked-pair deletion with confirmation dialog
- Removed unused `isDead` field from data model
- Partner roster computed for cross-player pair resolution

### Phase 3: Local Persistence

- IndexedDB persistence for Soul Link state via `localRunRepository.js`
  settings store
- Save/restore rosters, gym progress, player config, and generation rules
  between sessions
- Fire-and-forget persist on every mutation through `replaceSoulLinkState`
  bottleneck
- `loadSoulLinkData` restores snapshot on mount, falls back to fresh run

### Phase 4: Supabase Backend

- Supabase client with graceful degradation when env vars are missing
- `sessions` table with hybrid-lite schema: relational columns for joinable
  fields (id, invite_code) plus JSONB `state` column for full snapshot
- Row Level Security policies for anonymous access (gated by invite code)
- `supabaseRepository.js` data access layer: create session, fetch by id or
  invite code, push state with optimistic concurrency, delete session
- `.env.example` documenting required environment variables

Key files: `src/services/supabaseClient.js`, `src/services/supabaseRepository.js`

### Phase 5: Sync

- Snapshot-based sync via Supabase: full shared state push/pull with
  optimistic concurrency (version compare-and-swap)
- `buildRemoteState` / `mergeRemoteState` pure helpers in `soulLinkModel.js`
  for extracting shared state and merging remote player data
- Store methods: `createSession`, `joinSession`, `pushState`, `pullState`,
  `syncSession`, `deleteRemoteSession` in `useSoulLinkStore.js`
- Session management UI in options dialog: create/join/sync/leave/copy code
- Auto-sync on mount when session exists, 5-second debounced auto-push after
  mutations
- `isLocal` flag flips for joining player (device-only, never stored remotely)
- Conflict resolution: pull then retry push on version mismatch

Key files: `src/utils/soulLinkModel.js`, `src/composables/useSoulLinkStore.js`,
`src/App.vue`

## Remaining Phases

### Phase 6: Activity Feed

- In-app activity notifications for partner updates (roster changes, gym
  progress)
- Short recent-events feed, not full history
- Per-device notification settings stored locally
- Browser/phone push notifications out of scope for v1

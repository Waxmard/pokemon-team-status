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

## Remaining Phases

### Phase 2: Paired Pokemon

- Display paired partner Pokemon in TeamSlot (visual indicator of linked catch)
- Add pair management in DraftPanel (link/unlink pairs)

Key files: `TeamSlot.vue`, `DraftPanel.vue`, `soulLinkModel.js`

### Phase 3: Local Persistence

- Add IndexedDB persistence for Soul Link state, mirroring `useStorage.js`
  patterns
- Save/restore rosters, gym progress, and player config between sessions

Key files: `useSoulLinkStore.js`, `useStorage.js` (reference patterns)

### Phase 4: Supabase Backend

- Tables for sessions, players, rosters, gym progress
- Data access layer: create session, join by invite code, fetch/push state
- No accounts required — session creator is v1 owner, join via code

Key files: new `src/services/supabase.js` or similar

### Phase 5: Sync

- Manual Sync action + background polling on app open and after key changes
- Change-set based sync — each change set is the unit of save, sync, fetch,
  and reconciliation (not single-field writes)
- Local player edits apply immediately; cross-player edits require
  owner-based confirmation before applying
- Deaths take precedence, notify partner, undo death is an explicit action
- Web app only for v1 — no native conversion

Key files: `useSoulLinkStore.js`, Supabase service layer

### Phase 6: Activity Feed

- In-app activity notifications for partner updates (roster changes, gym
  progress)
- Short recent-events feed, not full history
- Per-device notification settings stored locally
- Browser/phone push notifications out of scope for v1

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

The Soul Link shell and state management layer are in place:

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

## Remaining Phases

### Phase 1: Local Editing + Options Menu

Finalize the options menu layout:

- Solo mode: add a divider between the generation rules toggle and the reset
  buttons
- Soul Link mode: same menu as solo, plus a "View {other player name}" button
  at the top in its own divider section; remove the current multi-button
  "Viewing Player" section and replace with a single toggle-style button
  showing the other player's name
- Enable Reset Team & Box and Reset Gyms in Soul Link mode (currently disabled)

Wire up local player editing:

- Remove read-only restriction for the local player's view
- Reuse existing DraftPanel wizard and gym defeat flow as-is, scoped to local
  player
- Wire add/edit/swap Pokemon and gym toggles through `useSoulLinkStore`

Key files: `src/App.vue` (options dialog), `SoulLinkPlayerView.vue`,
`useSoulLinkStore.js`, `TeamSection.vue`

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

# Soul Link Plan

## Goal

Add a simple shared run mode for Soul Link play so two players can keep one run
in sync without requiring accounts.

The app currently stores team, box, defeated gyms, and pinned gym locally in
IndexedDB via `useStorage.js`. That offline-first model works well for solo use,
but Soul Link needs those same concepts to move toward a shared run/session
model that can sync across devices.

For v1, scope the feature to exactly two players sharing one session, one shared
generation ruleset (`pre-gen-6` or `post-gen-6`), linked catches, death state,
and fully separate gym progress per player.

## Recommended Approach

Use Supabase for a lightweight backend in v1, with join codes and no required
accounts, but keep sync local-first and explicit.

- Store each Soul Link run as a shared session record plus related state for
  exactly two players
- Choose the session ruleset during creation (`pre-gen-6` or `post-gen-6`) and
  keep it fixed for the whole session
- Keep v1 member data focused on species, optional nickname, catch location,
  owner, `pair_id`, death state, and separate per-player gym progress; do not
  split data into `box` vs `active team` yet
- Cache the local player's slot per session on each device, with a manual
  override in case a device needs to switch players
- Let the session creator act as the v1 owner for share/recovery actions, using a
  join code to add the second player and keeping recovery intentionally manual
  rather than adding account-based auth
- Use a Git-like sync flow: pull on app open, push on key changes (new catch,
  edits, link changes, deaths, undo death), poll occasionally, and expose manual
  pull/push controls
- Keep v1 sync feedback focused on manual pull/push actions; passive
  offline/pending-sync messaging is out of scope for now
- Sync in change sets rather than single-field writes, and treat each change set
  as the unit of local save, push, pull, and reconciliation
- Apply a local player's own roster or gym edits immediately, but require a
  confirmation dialog before applying a change set that edits the other
  player's roster or gym progress
- Use that owner-based confirmation in place of a generic conflict-resolution UI
  for v1; deaths still take precedence, notify the partner, and treat undoing a
  death as an explicit action
- Add in-app activity/notifications for partner updates and store per-device
  notification settings in local cached app settings; keep the feed short and
  focused on recent sync-relevant events rather than full history
- Stay with the web app for v1; native iPhone conversion is out of scope, with
  web push as a possible later enhancement

This fits the current architecture because most state already flows through
shared Vue composables. The main change is evolving `useStorage.js` from purely
local persistence into a layer that can load, save, and reconcile a shared run.

## Phases

1. Define a shared session model for two players, including session metadata,
   fixed ruleset, members with `pair_id` and death state, and per-player gym
   progress.
2. Add Supabase tables and a small data access layer for creating a session,
   joining by code, pulling latest state, and pushing local changes.
3. Update `useStorage.js` to cache shared session data locally, remember the
   device's player slot, and keep local notification preferences per device.
4. Add pull/push triggers, occasional polling, change-set reconciliation,
   owner-based confirmation for cross-player edits, and lightweight in-app
   activity for partner updates.
5. Add clear failure feedback for manual pull/push actions, while leaving passive
   offline or pending-sync messaging out of v1.

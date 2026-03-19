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

## UI and Flow

- Enter Soul Link from a new action area in the Options dialog in `src/App.vue`
- Plan the dialog around mutually exclusive run types, with `New Solo Run` and
  `New Soul Link Run` actions spaced apart from safer options
- Do not add extra reset-warning copy for those actions; `New` is sufficient
- Keep generation rules in the shared options flow so they apply regardless of
  run type, rather than making Soul Link own a nested session-specific rules
  field
- Reuse the shell title area by showing the currently viewed player name instead
  of `Weakness Calculator`, with a pencil icon to edit the name and a swap icon
  to switch which player's roster is in view
- Represent paired Pokemon in `TeamSlot` and `DraftPanel` when the UI work
  starts, so linked state appears inside the existing team editing surfaces

## Recommended Approach

Use Supabase for a lightweight backend in v1, with join codes and no required
accounts, but keep sync local-first and explicit.

- Store each Soul Link run as a shared session record plus related state for
  exactly two players
- Keep v1 member data focused on species, optional nickname, catch location,
  owner, `pair_id`, death state, and separate per-player gym progress while
  fitting into the existing team/box-oriented UI patterns
- Cache the local player's slot per session on each device, with a manual
  override in case a device needs to switch players
- Let the session creator act as the v1 owner for share/recovery actions, using a
  join code to add the second player and keeping recovery intentionally manual
  rather than adding account-based auth
- Use one visible `Sync` action for manual reconciliation, plus background
  polling on app open and at intervals after key changes
- Keep v1 sync feedback focused on in-app activity and notifications; browser or
  phone notifications, plus broader passive offline messaging, are out of scope
  for now
- Sync in change sets rather than single-field writes, and treat each change set
  as the unit of local save, sync, fetch, and reconciliation
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

1. Add the Options-dialog entry points in `src/App.vue`, including separate
   `New Solo Run` and `New Soul Link Run` actions and shared generation rules.
2. Add Supabase tables and a small data access layer for creating a session,
   joining by code, fetching latest state, and syncing local changes.
3. Update `useStorage.js` to cache shared session data locally, remember the
   device's player slot, and keep local notification preferences per device.
4. Rework the main shell to show the viewed player name in the title area, add
   edit/swap controls there, and surface paired Pokemon inside `TeamSlot` and
   `DraftPanel`.
5. Add the manual `Sync` action, background polling, change-set reconciliation,
   owner-based confirmation for cross-player edits, and lightweight in-app
   activity for partner updates.

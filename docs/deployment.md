# Deployment

## Why a Web App?

This app is a Progressive Web App (PWA) rather than a native mobile app for
several reasons:

- **No hosting costs**: Cloudflare Pages free tier handles everything
- **No App Store fees**: Apple charges $99/year, Google charges $25 one-time
- **No app store approval process**: Manually promote reviewed changes to `main`
- **Works everywhere**: Any device with a browser
- **Easy updates**: Users always get the latest version

The tradeoff is slightly worse integration with the OS, but for a simple
calculator app, PWA capabilities are sufficient.

## Cloudflare Pages setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your GitHub repository
3. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Deploy

Cloudflare Pages Git integration deploys production on every push to `main`,
including promotion merges, emergency fixes, and automated version PR merges.
Keep production on `main` when changing GitHub's default branch to `dev`.
Routine development targets `dev`, not production.

### Preview and promotion

In **Workers & Pages** → **pokemon-team-status** → **Settings** →
**Builds & deployments**, enable `dev` preview deployments while retaining
other allowed preview branches. The stable branch preview is
<https://dev.pokemon-team-status.pages.dev>. Native Git integration provides
this preview; the separate label-driven **Deploy Preview** workflow remains
unchanged and uses a shared preview branch.

Verify the Preview environment has `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` configured before testing sync. Do not expose their
values. Without them, the preview supports local-only smoke testing, not sync
verification. The preview can share existing Supabase data; it is not isolated
database staging. Use only disposable runs and sessions. No second database or
migrations are needed for this branch-flow change.

Before manually merging a `dev` → `main` promotion, require green checks and
smoke-test the preview for the exact candidate SHA. Repeat the smoke check if
`dev` changes. Use **Create a merge commit**, not squash, rebase, or auto-merge.
After a version PR or `main`-only emergency fix, merge a `main` → `dev` sync PR
with **Create a merge commit** before the next promotion. See the
contribution [release instructions](../CONTRIBUTING.md#deploys--releases) for
released metadata conflict handling.

## Activate the release flow

Repository edits do not activate GitHub enforcement or Pages previews. Complete
these steps yourself, in order, before treating the release flow as active.

### Bootstrap before changing the default

1. Land the migration through a checked PR to the current `main` first. Keep
   unrelated feature work out of that PR. Let any resulting version PR finish.
2. Fetch fresh refs with `git fetch --prune origin`, then check for `dev` with
   `git show-ref --verify refs/remotes/origin/dev`. If it exists, run
   `git rev-list --left-right --count origin/main...origin/dev` and
   `git merge-base --is-ancestor origin/dev origin/main`. The second count must
   be zero and the ancestry command must succeed before advancing `dev`.
   If `dev` has unique commits, preserve them and stop activation for review.
   Never reset, delete, force-push, or silently promote those commits.
3. If `dev` is an ancestor of `main` with no unique commits, advance it with
   `git push origin origin/main:refs/heads/dev`, without force. If the remote
   `dev` ref is absent after pruning, the same command creates it. If protection
   rejects the fast-forward, use a `main` → `dev` merge-commit PR instead.
4. Once `dev` contains the migration and released metadata, go to GitHub
   **Settings** → **General** → **Default branch** and select `dev`. Retarget
   ordinary open feature PRs to `dev`. Review and retarget or recreate existing
   Dependabot PRs individually; do not bulk-merge them. Release Please PRs
   stay on `main`.

Dependabot version updates target `dev` for npm and GitHub Actions. Security
update PRs can follow the default branch independently; `target-branch` alone
does not control them.

### Configure enforcement and preview

1. In GitHub **Settings** → **General** → **Pull Requests**, allow merge
   commits, squash, and rebase. Disable automatic head-branch deletion so
   `dev` survives promotion. Do not require linear history on `main` or `dev`.
2. In **Settings** → **Rules** → **Rulesets** (or existing branch protections),
   require PRs for `main` and `dev`, with the emitted **Test**, **Lint**, and
   **Build** checks passing and branches up to date before merging. Wait for
   those checks to emit before selecting their exact contexts. Block force
   pushes and deletions; enforce for administrators without unrestricted
   bypass. Preserve existing human-approval requirements and security controls;
   do not add a new mandatory external reviewer for a solo maintainer.
3. Do not require path-filtered **Documentation** or optional **Deploy Preview**
   checks: they might never run. Release automation must satisfy required
   checks, not use a personal access token (PAT) bypass. If your GitHub plan or
   permissions cannot enforce these rules, report that limitation; a checklist
   alone is not enforced safety.
4. In Cloudflare **Workers & Pages** → **pokemon-team-status** → **Settings** →
   **Builds & deployments**, confirm Git integration, production `main`,
   build command `npm run build`, and output `dist`. Enable the `dev` preview
   and verify Preview Supabase variables as described above. If Git integration
   is absent or production is not `main`, pause hosted activation and report
   the conflicting setting rather than changing hosting or adding deployment CI.

### Verify live activation

1. Open a real feature PR targeting `dev` and observe **Test**, **Lint**, and
   **Build**. Confirm an existing failed required check prevents merging when
   one is available; do not manufacture broken code. After a green `dev` merge,
   observe a preview deployment for that SHA, no production deployment, and no
   Release Please PR or tag caused by the `dev` push.
2. In a fresh browser context, open the `dev` preview with a disposable solo
   run. Add a Pokémon to the team, move it to the box and back, refresh, and
   observe the retained roster and gym scoring. With Preview Supabase values
   configured, create and join a disposable Soul Link session in two contexts
   and observe a partner roster change. Otherwise report sync unverified.
   Observe visible interactions and page errors, then close the contexts.
3. For an authorized promotion, verify required checks and smoke coverage of
   the current `dev` SHA before manually merging with **Create a merge commit**.
   Observe production deployment for the resulting `main` SHA and Release
   Please targeting `main` only. For the next actual `feat`/`fix` batch, confirm
   individual promoted changes appear in the version PR changelog. A
   chores-only migration might correctly produce no release PR.
4. After the automated version PR merge, merge a `main` → `dev` sync PR with
   **Create a merge commit**. Fetch fresh refs and verify
   `git merge-base --is-ancestor origin/main origin/dev` succeeds. The next
   promotion diff must not repeat the previous release or lose its metadata.

## Offline-First Design

The app is designed to work offline because the primary use case is checking
team matchups while playing Pokemon on a handheld device. You might not have
reliable internet.

### IndexedDB Persistence

All user data is stored in IndexedDB (`pokemon-team-calculator` database):

- Team composition
- Box (reserve Pokemon)
- Dead (fainted Pokemon / death box)
- Defeated gyms
- Pinned gym
- Generation rules
- Soul Link snapshot (full state for Soul Link runs)

This data persists across sessions and survives browser restarts.

### Sprite Caching Strategy

Pokemon sprites are fetched from GitHub (PokeAPI sprites repository) and
cached aggressively using Workbox:

| Cache | Contents | Max Entries | Expiration |
| ----- | -------- | ----------- | ---------- |
| `pokemon-sprites-hd` | High-res artwork | 500 | 30 days |
| `pokemon-sprites-small` | Small sprites | 1000 | 30 days |
| `pokemon-items` | Berry/item sprites | 100 | 30 days |

All caches use `CacheFirst` strategy: serve from cache if available, only
fetch from network on cache miss.

On first load, the app pre-fetches all small sprites (~2.5MB) in the
background. This ensures offline access to all Pokemon sprites after the
initial load.

### Service Worker

The service worker (`vite-plugin-pwa` with Workbox):

- Caches all app assets (JS, CSS, HTML, icons)
- Auto-updates when new versions are deployed
- Falls back to cache when offline

## Safari/iOS Support

The app includes iOS-specific PWA configuration:

- PWA meta tags for home screen installation
- Apple touch icons (192x192, 512x512)
- `display: standalone` for full-screen experience
- Theme color matching the app background

### Installing on iOS

1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app now runs like a native app

### iOS Offline Behavior

**Important**: On iOS, offline support only works when the app is installed to the Home Screen.

| Method          | Offline Support                              |
|-----------------|----------------------------------------------|
| Home Screen PWA | Works offline after initial load             |
| Safari tabs     | Does NOT work offline if Safari is fully closed |

This is an iOS Safari limitation. When Safari is closed completely (swiped away
in app switcher), the browser terminates the service worker. When reopened
offline, Safari cannot re-register the service worker, so the cached content
is inaccessible.

Home Screen PWAs run in their own process and maintain service worker
registration, which is why offline works there.

**Technical detail**: Home Screen PWAs on iOS are loaded via the `webapp://`
protocol instead of `https://`. This gives them an isolated context separate
from Safari, allowing the service worker to persist even when the app is
closed.

**Recommendation**: Always install to Home Screen for reliable offline access.

## Supabase Setup (Soul Link and Solo Sync)

Soul Link mode and Solo cloud backup both require a Supabase project for
online sync.

### Environment Variables

Copy `.env.example` to `.env.local` (local dev) or set in your hosting
provider:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these, the app runs in local-only mode with no sync features.

### Database Setup

Run this SQL in the Supabase Dashboard SQL Editor:

```sql
create table if not exists public.sessions (
  id uuid primary key,
  invite_code text not null unique,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Enable Realtime

In the Supabase Dashboard, go to Database > Replication and enable the
`sessions` table for the `supabase_realtime` publication. This enables
instant partner updates via WebSocket.

## Build Output

The production build outputs to `dist/`:

```text
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── sw.js              # Service worker
├── workbox-[hash].js  # Workbox runtime
└── manifest.webmanifest
```

This folder can be deployed to any static hosting provider.

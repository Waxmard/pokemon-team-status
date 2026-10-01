# Contributing to pokemon-team-status

Thanks for contributing. This guide covers how a change flows from a branch to a release.

## Branching

`dev` is the integration and default branch after
activation (see [release-flow activation](docs/deployment.md#activate-the-release-flow)).
Ordinary pull requests target `dev`; production promotions target `main`. Never
push development changes directly to either branch.

Start a feature branch from the latest `dev`:

    git switch dev && git pull --ff-only
    git switch -c feat/short-description

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`.
`feat:` → minor, `fix:` → patch, `!`/`BREAKING CHANGE:` → major. `docs`/`chore`/`refactor`/`test`
are used as normal. These types drive automated versioning (see Deploys & Releases).

Let [git-ai](https://github.com/Waxmard/git-ai) draft a conventional commit from staged changes.
Install the CLI once with `npm install -g @waxmard/git-ai`, then:

    git add -A
    git-ai commit                     # prints a Conventional Commits message to stdout — review it
    git commit -m "$(git-ai commit)"  # …or commit with it in one line

Run `git-ai setup` once to configure a provider.

## Pull Requests

Always open one — even for small changes.

- **Squash feature PRs into `dev`.** Use a Conventional Commit title and body
  for the squashed commit; release tooling reads that message. Let git-ai
  draft it: `git-ai pr --base dev`.
- **Promote `dev` to `main` manually.** Open a promotion PR with a title such
  as `chore: promote dev to main`. Use **Create a merge commit**, never squash
  or rebase, to preserve individual conventional commits and shared ancestry.
  Require green checks and smoke-test the `dev` preview for the exact candidate
  SHA before merging. Further `dev` changes invalidate that smoke check.
  Do not enable auto-merge for promotion PRs.
- **Reference the issue.** If the change closes or relates to an issue, add `#<issuenum>`
  to the description so the PR links back to it.
- **Keep it focused.** One logical change per PR keeps review and the changelog clean.

## Review & Approval

Every PR needs a human pass before it merges.

- A [CODEOWNER](.github/CODEOWNERS) is auto-requested; one human approval is required
  to merge.

## Deploys & Releases

Every push to `main` immediately triggers production deployment through
Cloudflare Pages Git integration. Manual promotion is the production approval;
the version PR is not the production gate. Pushes to `dev` deploy the
configured [development preview](docs/deployment.md#preview-and-promotion), not production.

[Release Please](https://github.com/googleapis/release-please) runs and targets
`main` only. It reads conventional commits since the last release and maintains
a version PR with the version and `CHANGELOG.md` updates. Version PRs retain
rebase auto-merge after required checks pass. After the version PR merges,
Release Please creates the tag and release; the merge can deploy production
again. A chores-only batch might not create a version PR.

After a version PR or a `main`-only emergency fix, open a `main` → `dev` sync
PR before the next promotion. Use **Create a merge commit**, never squash or
rebase. Resolve version, release manifest, and changelog conflicts with `main`'s
released metadata while preserving `dev` application changes. Never hand-bump
versions to imitate a release.

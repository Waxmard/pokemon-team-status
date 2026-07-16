# Contributing to pokemon-team-status

Thanks for contributing. This guide covers how a change flows from a branch to a release.

## Branching

`main` is the default and target branch — branch off the latest `main`, never push to it
directly. Every change lands through a pull request.

    git switch main && git pull
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

- **Squash on merge.** The branch's WIP commits collapse into a single commit on `main`,
  so the **squashed title and body must be the real, conventional message** — that line is
  what release tooling reads. Let git-ai draft it: `git-ai pr --base main`.
- **Reference the issue.** If the change closes or relates to an issue, add `#<issuenum>`
  to the description so the PR links back to it.
- **Keep it focused.** One logical change per PR keeps review and the changelog clean.

## Review & Approval

Every PR needs two passes — **automated review first, then a human.**

- **Bot first.** Let Claude Code Review comment and be addressed before adding a human
  reviewer.
- **Then a human.** A [CODEOWNER](.github/CODEOWNERS) is auto-requested; one human
  approval is required to merge.

## Deploys & Releases

On every push to `main`, [release-please](https://github.com/googleapis/release-please)
reads the conventional commits since the last tag, bumps the version, updates
`CHANGELOG.md`, and tags the release. Merging the release PR triggers the Cloudflare
Pages deploy. This is why commit hygiene matters: every commit on `main` is read by the
release tooling.

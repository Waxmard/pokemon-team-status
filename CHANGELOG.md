# Changelog

## [1.2.0](https://github.com/Waxmard/pokemon-team-status/compare/v1.1.0...v1.2.0) (2026-03-30)


### Features

* support multiple soul link runs with local persistence ([#57](https://github.com/Waxmard/pokemon-team-status/issues/57)) ([ae4c8e1](https://github.com/Waxmard/pokemon-team-status/commit/ae4c8e1dca3b7b04a9aab9eaffe632e005d07f6b))

## [1.1.0](https://github.com/Waxmard/pokemon-team-status/compare/pokemon-team-status-v1.0.1...pokemon-team-status-v1.1.0) (2026-03-28)


### Features

* add favicon asset to PWA ([#56](https://github.com/Waxmard/pokemon-team-status/issues/56)) ([93b9329](https://github.com/Waxmard/pokemon-team-status/commit/93b932913a92f7384f42e2ad146ff54458f2f8ae))


### Bug Fixes

* append team additions and prepend box additions ([84439ff](https://github.com/Waxmard/pokemon-team-status/commit/84439ff12414d4b7ac85ca7868d36434a41ce9ad))
* deduplicate roster members by catch location ([c22c6d7](https://github.com/Waxmard/pokemon-team-status/commit/c22c6d7d3eb7b6aff0dbb32e9803e9088d3a71af))
* properly merge remote player roster on sync conflict ([a14dd9e](https://github.com/Waxmard/pokemon-team-status/commit/a14dd9e1a84e3776224c38f006903e0cd36d8379))


### Code Refactoring

* allow generationRules to be passed as prop in DraftPanel ([f828f4b](https://github.com/Waxmard/pokemon-team-status/commit/f828f4b3b083af391619d5149556a4d3e538265e))

## [1.0.1](https://github.com/Waxmard/pokemon-team-status/compare/v1.0.0...v1.0.1) (2026-03-28)

### Bug Fixes

* append team additions and prepend box additions ([84439ff](https://github.com/Waxmard/pokemon-team-status/commit/84439ff12414d4b7ac85ca7868d36434a41ce9ad))
* deduplicate roster members by catch location ([c22c6d7](https://github.com/Waxmard/pokemon-team-status/commit/c22c6d7d3eb7b6aff0dbb32e9803e9088d3a71af))
* properly merge remote player roster on sync conflict ([a14dd9e](https://github.com/Waxmard/pokemon-team-status/commit/a14dd9e1a84e3776224c38f006903e0cd36d8379))

## 1.0.0 (2026-01-27)

### Features

* initial Vue 3 app with Naive UI and type calculation engine
* team management with drag-and-drop and Pokemon selection
* berries, abilities (Protean), and special moves (Flying Press, Freeze-Dry)
* draft wizard for mobile Pokemon configuration
* swap mode between team and box
* gym type weakness columns with scoring
* evolutions and special move support
* Pokemon forms, caching, and gym pinning
* type suggestions and swap suggestions
* desktop responsive layout
* soul link mode with multi-player Supabase sync
* death tracking with graveyard box
* gym progress tracking and defeat status
* Progressive Web App with offline support

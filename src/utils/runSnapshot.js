import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../data/types.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonCollectionForRules,
} from './generationRules.js'
import { createDefaultSoulLinkState, emptyProgress } from './soulLinkModel.js'

export const RUN_MODES = {
  SOLO: 'solo',
  SOUL_LINK: 'soul-link',
}

/**
 * Canonical field set of a persisted or remote solo snapshot, with the
 * fallback applied when a snapshot omits the field. This is the single
 * source of truth for the flat solo-snapshot shape.
 */
const SOLO_SNAPSHOT_DEFAULTS = {
  team: [],
  box: [],
  dead: [],
  _tombstones: [],
  defeatedGyms: [],
  pinnedGym: null,
  progressUpdatedAt: null,
  generationRules: undefined,
  generationRulesUpdatedAt: null,
  teraEnabled: false,
  teraEnabledUpdatedAt: null,
}

export const SOLO_SNAPSHOT_FIELDS = Object.keys(SOLO_SNAPSHOT_DEFAULTS)

export function pickSoloSnapshotFields(source) {
  return Object.fromEntries(
    Object.entries(SOLO_SNAPSHOT_DEFAULTS).map(([field, fallback]) => [
      field,
      source[field] ?? fallback,
    ]),
  )
}

export function normalizeGenerationRules(ruleset) {
  return ruleset === GENERATION_RULESETS.PRE_GEN_6
    ? GENERATION_RULESETS.PRE_GEN_6
    : DEFAULT_GENERATION_RULESET
}

export function createDefaultSoloRunState(
  generationRules = DEFAULT_GENERATION_RULESET,
  teraEnabled = false,
  generationRulesUpdatedAt = null,
  teraEnabledUpdatedAt = null,
) {
  return {
    mode: RUN_MODES.SOLO,
    team: [],
    box: [],
    dead: [],
    _tombstones: [],
    progress: emptyProgress(),
    rules: {
      generation: normalizeGenerationRules(generationRules),
      teraEnabled: !!teraEnabled,
      generationRulesUpdatedAt,
      teraEnabledUpdatedAt,
    },
  }
}

export function createDefaultSoulLinkRunState(
  generationRules = DEFAULT_GENERATION_RULESET,
  teraEnabled = false,
) {
  const normalizedGenerationRules = normalizeGenerationRules(generationRules)

  return {
    mode: RUN_MODES.SOUL_LINK,
    rules: {
      generation: normalizedGenerationRules,
      teraEnabled: !!teraEnabled,
    },
    soulLink: createDefaultSoulLinkState(),
  }
}

function createUnsupportedRunModeError(context, mode, expectedMode = 'solo') {
  return new Error(
    `${context} only supports ${expectedMode} runs right now. Received mode: ${mode}.`,
  )
}

export function assertSoloRunState(runState, context = 'This operation') {
  if (runState?.mode !== RUN_MODES.SOLO) {
    throw createUnsupportedRunModeError(context, runState?.mode ?? 'unknown')
  }

  return runState
}

export function assertSoulLinkRunState(runState, context = 'This operation') {
  if (runState?.mode !== RUN_MODES.SOUL_LINK) {
    throw createUnsupportedRunModeError(
      context,
      runState?.mode ?? 'unknown',
      'soul-link',
    )
  }

  return runState
}

export function sanitizeTeraTypeForCollection(
  collection,
  teraEnabled,
  clearedAt = null,
) {
  if (teraEnabled) return collection
  return collection.map((member) => {
    if (!member.teraType) return member
    return {
      ...member,
      teraType: null,
      ...(clearedAt == null
        ? {}
        : { updatedAt: Math.max(clearedAt, (member.updatedAt ?? 0) + 1) }),
    }
  })
}

export function sanitizePersistedSoloRunSnapshot(
  snapshot,
  teraClearedAt = null,
) {
  const generationRules = normalizeGenerationRules(snapshot.generationRules)
  const teraEnabled = !!snapshot.teraEnabled

  return {
    name: snapshot.name ?? null,
    team: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.team, generationRules),
      teraEnabled,
      teraClearedAt,
    ),
    box: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.box, generationRules),
      teraEnabled,
      teraClearedAt,
    ),
    dead: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.dead ?? [], generationRules),
      teraEnabled,
      teraClearedAt,
    ),
    _tombstones: snapshot._tombstones ?? [],
    defeatedGyms: sanitizeDefeatedGymsForRules(
      snapshot.defeatedGyms,
      generationRules,
    ),
    pinnedGym: sanitizePinnedGymForRules(snapshot.pinnedGym, generationRules),
    progressUpdatedAt: snapshot.progressUpdatedAt ?? null,
    generationRules,
    generationRulesUpdatedAt: snapshot.generationRulesUpdatedAt ?? null,
    teraEnabled,
    teraEnabledUpdatedAt: snapshot.teraEnabledUpdatedAt ?? null,
  }
}

export function mapPersistedSoloSnapshotToRunState(snapshot) {
  const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot(snapshot)

  return {
    ...createDefaultSoloRunState(
      sanitizedSnapshot.generationRules,
      sanitizedSnapshot.teraEnabled,
      sanitizedSnapshot.generationRulesUpdatedAt,
      sanitizedSnapshot.teraEnabledUpdatedAt,
    ),
    team: sanitizedSnapshot.team,
    box: sanitizedSnapshot.box,
    dead: sanitizedSnapshot.dead,
    _tombstones: sanitizedSnapshot._tombstones,
    progress: {
      defeatedGyms: sanitizedSnapshot.defeatedGyms,
      pinnedGym: sanitizedSnapshot.pinnedGym,
      updatedAt: sanitizedSnapshot.progressUpdatedAt,
    },
  }
}

export function mapSoloRunStateToPersistedSnapshot(runState) {
  const soloRunState = assertSoloRunState(
    runState,
    'Mapping a run state to a persisted snapshot',
  )

  return {
    team: soloRunState.team,
    box: soloRunState.box,
    dead: soloRunState.dead,
    _tombstones: soloRunState._tombstones ?? [],
    defeatedGyms: soloRunState.progress.defeatedGyms,
    pinnedGym: soloRunState.progress.pinnedGym,
    progressUpdatedAt: soloRunState.progress.updatedAt ?? null,
    generationRules: soloRunState.rules.generation,
    generationRulesUpdatedAt:
      soloRunState.rules.generationRulesUpdatedAt ?? null,
    teraEnabled: soloRunState.rules.teraEnabled,
    teraEnabledUpdatedAt: soloRunState.rules.teraEnabledUpdatedAt ?? null,
  }
}

export function isEmptySoloRun(snapshot) {
  return (
    (snapshot.team?.length ?? 0) === 0 &&
    (snapshot.box?.length ?? 0) === 0 &&
    (snapshot.dead?.length ?? 0) === 0 &&
    (snapshot.defeatedGyms?.length ?? 0) === 0 &&
    snapshot.pinnedGym == null &&
    snapshot.name == null
  )
}

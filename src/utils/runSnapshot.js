import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../data/types.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonCollectionForRules,
} from './generationRules.js'
import { createDefaultSoulLinkState } from './soulLinkModel.js'

export const RUN_MODES = {
  SOLO: 'solo',
  SOUL_LINK: 'soul-link',
}

function createDefaultSoloProgress() {
  return {
    defeatedGyms: [],
    pinnedGym: null,
    updatedAt: null,
  }
}

export function normalizeGenerationRules(ruleset) {
  return ruleset === GENERATION_RULESETS.PRE_GEN_6
    ? GENERATION_RULESETS.PRE_GEN_6
    : DEFAULT_GENERATION_RULESET
}

export function createDefaultSoloRunState(
  generationRules = DEFAULT_GENERATION_RULESET,
  teraEnabled = false,
) {
  return {
    mode: RUN_MODES.SOLO,
    team: [],
    box: [],
    dead: [],
    _tombstones: [],
    progress: createDefaultSoloProgress(),
    rules: {
      generation: normalizeGenerationRules(generationRules),
      teraEnabled: !!teraEnabled,
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

export function createDefaultRunState() {
  return createDefaultSoloRunState()
}

export function createUnsupportedRunModeError(
  context,
  mode,
  expectedMode = 'solo',
) {
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

function sanitizeTeraTypeForCollection(collection, teraEnabled) {
  if (teraEnabled) return collection
  return collection.map((member) =>
    member.teraType ? { ...member, teraType: null } : member,
  )
}

export function sanitizePersistedSoloRunSnapshot(snapshot) {
  const generationRules = normalizeGenerationRules(snapshot.generationRules)
  const teraEnabled = !!snapshot.teraEnabled

  return {
    name: snapshot.name ?? null,
    team: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.team, generationRules),
      teraEnabled,
    ),
    box: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.box, generationRules),
      teraEnabled,
    ),
    dead: sanitizeTeraTypeForCollection(
      sanitizePokemonCollectionForRules(snapshot.dead ?? [], generationRules),
      teraEnabled,
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
    generationRulesUpdatedAt: soloRunState.rules.generationUpdatedAt ?? null,
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

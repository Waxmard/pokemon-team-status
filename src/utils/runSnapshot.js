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
  }
}

export function normalizeGenerationRules(ruleset) {
  return ruleset === GENERATION_RULESETS.PRE_GEN_6
    ? GENERATION_RULESETS.PRE_GEN_6
    : DEFAULT_GENERATION_RULESET
}

export function createDefaultSoloRunState(
  generationRules = DEFAULT_GENERATION_RULESET,
) {
  return {
    mode: RUN_MODES.SOLO,
    team: [],
    box: [],
    progress: createDefaultSoloProgress(),
    rules: {
      generation: normalizeGenerationRules(generationRules),
    },
  }
}

export function createDefaultSoulLinkRunState(
  generationRules = DEFAULT_GENERATION_RULESET,
) {
  const normalizedGenerationRules = normalizeGenerationRules(generationRules)

  return {
    mode: RUN_MODES.SOUL_LINK,
    rules: {
      generation: normalizedGenerationRules,
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

export function sanitizePersistedSoloRunSnapshot(snapshot) {
  const generationRules = normalizeGenerationRules(snapshot.generationRules)

  return {
    team: sanitizePokemonCollectionForRules(snapshot.team, generationRules),
    box: sanitizePokemonCollectionForRules(snapshot.box, generationRules),
    defeatedGyms: sanitizeDefeatedGymsForRules(
      snapshot.defeatedGyms,
      generationRules,
    ),
    pinnedGym: sanitizePinnedGymForRules(snapshot.pinnedGym, generationRules),
    generationRules,
  }
}

export function mapPersistedSoloSnapshotToRunState(snapshot) {
  const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot(snapshot)

  return {
    ...createDefaultSoloRunState(sanitizedSnapshot.generationRules),
    team: sanitizedSnapshot.team,
    box: sanitizedSnapshot.box,
    progress: {
      defeatedGyms: sanitizedSnapshot.defeatedGyms,
      pinnedGym: sanitizedSnapshot.pinnedGym,
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
    defeatedGyms: soloRunState.progress.defeatedGyms,
    pinnedGym: soloRunState.progress.pinnedGym,
    generationRules: soloRunState.rules.generation,
  }
}

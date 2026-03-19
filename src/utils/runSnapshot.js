import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../data/types.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonCollectionForRules,
} from './generationRules.js'

export function createDefaultRunState() {
  return {
    mode: 'solo',
    team: [],
    box: [],
    progress: {
      defeatedGyms: [],
      pinnedGym: null,
    },
    rules: {
      generation: DEFAULT_GENERATION_RULESET,
    },
  }
}

export function normalizeGenerationRules(ruleset) {
  return ruleset === GENERATION_RULESETS.PRE_GEN_6
    ? GENERATION_RULESETS.PRE_GEN_6
    : DEFAULT_GENERATION_RULESET
}

export function sanitizePersistedRunSnapshot(snapshot) {
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

export function mapPersistedSnapshotToRunState(snapshot) {
  const sanitizedSnapshot = sanitizePersistedRunSnapshot(snapshot)

  return {
    mode: 'solo',
    team: sanitizedSnapshot.team,
    box: sanitizedSnapshot.box,
    progress: {
      defeatedGyms: sanitizedSnapshot.defeatedGyms,
      pinnedGym: sanitizedSnapshot.pinnedGym,
    },
    rules: {
      generation: sanitizedSnapshot.generationRules,
    },
  }
}

export function mapRunStateToPersistedSnapshot(runState) {
  return {
    team: runState.team,
    box: runState.box,
    defeatedGyms: runState.progress.defeatedGyms,
    pinnedGym: runState.progress.pinnedGym,
    generationRules: runState.rules.generation,
  }
}

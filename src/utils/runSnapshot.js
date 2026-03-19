import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../data/types.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonCollectionForRules,
} from './generationRules.js'

export const RUN_MODES = {
  SOLO: 'solo',
  SOUL_LINK: 'soul-link',
}

const DEFAULT_SOUL_LINK_PLAYER_IDS = {
  LOCAL: 'player-1',
  PARTNER: 'player-2',
}

function createDefaultSoloProgress() {
  return {
    defeatedGyms: [],
    pinnedGym: null,
  }
}

function createDefaultSoulLinkPlayer(id, name, isLocal) {
  return {
    id,
    name,
    isLocal,
  }
}

function createDefaultSoulLinkPlayerMembers() {
  return {
    team: [],
    box: [],
  }
}

function createDefaultSoulLinkPlayerProgress() {
  return createDefaultSoloProgress()
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
  const localPlayerId = DEFAULT_SOUL_LINK_PLAYER_IDS.LOCAL
  const partnerPlayerId = DEFAULT_SOUL_LINK_PLAYER_IDS.PARTNER

  return {
    mode: RUN_MODES.SOUL_LINK,
    rules: {
      generation: normalizeGenerationRules(generationRules),
    },
    soulLink: {
      metadata: {
        sessionId: null,
        inviteCode: null,
        name: null,
      },
      players: [
        createDefaultSoulLinkPlayer(localPlayerId, 'Player 1', true),
        createDefaultSoulLinkPlayer(partnerPlayerId, 'Player 2', false),
      ],
      members: {
        [localPlayerId]: createDefaultSoulLinkPlayerMembers(),
        [partnerPlayerId]: createDefaultSoulLinkPlayerMembers(),
      },
      progress: {
        [localPlayerId]: createDefaultSoulLinkPlayerProgress(),
        [partnerPlayerId]: createDefaultSoulLinkPlayerProgress(),
      },
      activity: {
        syncState: 'local-only',
        lastUpdatedAt: null,
      },
      local: {
        devicePlayerId: localPlayerId,
        preferredPlayerId: localPlayerId,
        sessionPreference: 'soul-link',
      },
    },
  }
}

export function createDefaultRunState() {
  return createDefaultSoloRunState()
}

export function createUnsupportedRunModeError(context, mode) {
  return new Error(
    `${context} only supports solo runs right now. Received mode: ${mode}.`,
  )
}

export function assertSoloRunState(runState, context = 'This operation') {
  if (runState?.mode !== RUN_MODES.SOLO) {
    throw createUnsupportedRunModeError(context, runState?.mode ?? 'unknown')
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

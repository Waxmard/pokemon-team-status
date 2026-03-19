import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../../data/types.js'
import {
  createDefaultRunState,
  mapPersistedSnapshotToRunState,
  mapRunStateToPersistedSnapshot,
  normalizeGenerationRules,
  sanitizePersistedRunSnapshot,
} from '../runSnapshot.js'

describe('runSnapshot helpers', () => {
  it('creates the default normalized run state shape', () => {
    expect(createDefaultRunState()).toEqual({
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
    })
  })

  it('normalizes unsupported generation rules to the default ruleset', () => {
    expect(normalizeGenerationRules(GENERATION_RULESETS.PRE_GEN_6)).toBe(
      GENERATION_RULESETS.PRE_GEN_6,
    )
    expect(normalizeGenerationRules('unsupported')).toBe(
      DEFAULT_GENERATION_RULESET,
    )
  })

  it('sanitizes a persisted snapshot before use', () => {
    expect(
      sanitizePersistedRunSnapshot({
        team: [
          {
            id: '1',
            name: 'Tapu Fini',
            types: ['water', 'fairy'],
            moves: ['water', 'fairy'],
            berry: 'Roseli Berry',
            megaForm: null,
            megaTypes: null,
            megaSpriteId: null,
          },
        ],
        box: [],
        defeatedGyms: ['water', 'fairy'],
        pinnedGym: 'fairy',
        generationRules: GENERATION_RULESETS.PRE_GEN_6,
      }),
    ).toEqual({
      team: [
        expect.objectContaining({
          name: 'Tapu Fini',
          types: ['water'],
          moves: ['water'],
          berry: null,
        }),
      ],
      box: [],
      defeatedGyms: ['water'],
      pinnedGym: null,
      generationRules: GENERATION_RULESETS.PRE_GEN_6,
    })
  })

  it('maps between persisted snapshots and normalized run state', () => {
    const runState = mapPersistedSnapshotToRunState({
      team: [],
      box: [],
      defeatedGyms: ['fire'],
      pinnedGym: 'water',
      generationRules: DEFAULT_GENERATION_RULESET,
    })

    expect(runState).toEqual({
      mode: 'solo',
      team: [],
      box: [],
      progress: {
        defeatedGyms: ['fire'],
        pinnedGym: 'water',
      },
      rules: {
        generation: DEFAULT_GENERATION_RULESET,
      },
    })

    expect(mapRunStateToPersistedSnapshot(runState)).toEqual({
      team: [],
      box: [],
      defeatedGyms: ['fire'],
      pinnedGym: 'water',
      generationRules: DEFAULT_GENERATION_RULESET,
    })
  })
})

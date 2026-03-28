import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../../data/types.js'
import {
  createDefaultRunState,
  createDefaultSoloRunState,
  createDefaultSoulLinkRunState,
  mapPersistedSoloSnapshotToRunState,
  mapSoloRunStateToPersistedSnapshot,
  normalizeGenerationRules,
  RUN_MODES,
  sanitizePersistedSoloRunSnapshot,
} from '../runSnapshot.js'

describe('runSnapshot helpers', () => {
  it('creates the default normalized run state shape', () => {
    expect(createDefaultRunState()).toEqual({
      mode: RUN_MODES.SOLO,
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
      sanitizePersistedSoloRunSnapshot({
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
    const runState = mapPersistedSoloSnapshotToRunState({
      team: [],
      box: [],
      defeatedGyms: ['fire'],
      pinnedGym: 'water',
      generationRules: DEFAULT_GENERATION_RULESET,
    })

    expect(runState).toEqual({
      mode: RUN_MODES.SOLO,
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

    expect(mapSoloRunStateToPersistedSnapshot(runState)).toEqual({
      team: [],
      box: [],
      defeatedGyms: ['fire'],
      pinnedGym: 'water',
      generationRules: DEFAULT_GENERATION_RULESET,
    })
  })

  it('keeps solo snapshots round-tripping through the normalized shape', () => {
    const soloRunState = createDefaultSoloRunState(
      GENERATION_RULESETS.PRE_GEN_6,
    )

    soloRunState.team.push({
      id: '1',
      name: 'Gengar',
      types: ['ghost', 'poison'],
      moves: [],
      berry: null,
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
    })
    soloRunState.box.push({
      id: '2',
      name: 'Snorlax',
      types: ['normal'],
      moves: [],
      berry: null,
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
    })
    soloRunState.progress.defeatedGyms.push('poison')
    soloRunState.progress.pinnedGym = 'ghost'

    expect(
      mapPersistedSoloSnapshotToRunState(
        mapSoloRunStateToPersistedSnapshot(soloRunState),
      ),
    ).toEqual(soloRunState)
  })

  it('creates a valid default Soul Link run shape', () => {
    const runState = createDefaultSoulLinkRunState(
      GENERATION_RULESETS.PRE_GEN_6,
    )

    expect(runState).toEqual({
      mode: RUN_MODES.SOUL_LINK,
      rules: {
        generation: GENERATION_RULESETS.PRE_GEN_6,
      },
      soulLink: {
        metadata: {
          sessionId: null,
          inviteCode: null,
          name: null,
          createdAt: null,
        },
        players: [
          { id: 'player-1', name: 'Player 1', isLocal: true },
          { id: 'player-2', name: 'Player 2', isLocal: false },
        ],
        rosters: {
          'player-1': {
            team: [],
            box: [],
            dead: [],
            _tombstones: [],
          },
          'player-2': {
            team: [],
            box: [],
            dead: [],
            _tombstones: [],
          },
        },
        progress: {
          'player-1': {
            defeatedGyms: [],
            pinnedGym: null,
            updatedAt: null,
          },
          'player-2': {
            defeatedGyms: [],
            pinnedGym: null,
            updatedAt: null,
          },
        },
        sync: {
          version: 1,
          pendingChangeSets: [],
          lastAppliedChangeSetId: null,
        },
        activity: {
          syncState: 'local-only',
          lastUpdatedAt: null,
          recentEntries: [],
        },
        local: {
          devicePlayerId: 'player-1',
          preferredPlayerId: 'player-1',
          cachedPlayerSlot: 'player-1',
          sessionPreference: 'soul-link',
          notifications: {
            enabled: true,
            partnerUpdates: true,
            gymProgress: true,
            memberChanges: true,
          },
        },
      },
    })
  })

  it('rejects persisting non-solo run states through the solo mapper', () => {
    expect(() =>
      mapSoloRunStateToPersistedSnapshot(createDefaultSoulLinkRunState()),
    ).toThrow(/only supports solo runs/i)
  })
})

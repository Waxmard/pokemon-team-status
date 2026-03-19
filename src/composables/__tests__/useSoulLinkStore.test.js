import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../../data/types.js'
import { RUN_MODES } from '../../utils/runSnapshot.js'
import {
  createDefaultSoulLinkMember,
  SOUL_LINK_PLAYER_IDS,
} from '../../utils/soulLinkModel.js'
import { useSoulLinkStore } from '../useSoulLinkStore.js'

describe('useSoulLinkStore', () => {
  beforeEach(() => {
    useSoulLinkStore().resetLocalRun()
  })

  it('keeps a singleton Soul Link run state and default selectors', () => {
    const firstStore = useSoulLinkStore()
    const secondStore = useSoulLinkStore()

    firstStore.updateSessionMetadata({
      sessionId: 'session-1',
      name: 'Emerald Soul Link',
    })

    expect(firstStore.runState.value.mode).toBe(RUN_MODES.SOUL_LINK)
    expect(secondStore.sessionMetadata.value).toEqual({
      sessionId: 'session-1',
      inviteCode: null,
      name: 'Emerald Soul Link',
      createdAt: null,
    })
    expect(firstStore.players.value).toHaveLength(2)
    expect(firstStore.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([])
    expect(firstStore.pendingChangeSets.value).toEqual([])
  })

  it('returns defensive read views instead of mutable live state', () => {
    const store = useSoulLinkStore()

    store.addRosterMember(
      SOUL_LINK_PLAYER_IDS.LOCAL,
      'team',
      createDefaultSoulLinkMember({
        id: 'member-1',
        speciesName: 'Mudkip',
      }),
    )

    const runStateView = store.runState.value
    const playersView = store.players.value
    const teamView = store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)

    expect(() => {
      runStateView.mode = 'solo'
    }).toThrow()
    expect(() => {
      playersView[0].name = 'Mutated'
    }).toThrow()
    expect(() => {
      teamView.push({ id: 'member-2' })
    }).toThrow()

    expect(store.runState.value.mode).toBe(RUN_MODES.SOUL_LINK)
    expect(store.players.value[0].name).toBe('Player 1')
    expect(store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({ id: 'member-1', speciesName: 'Mudkip' }),
    ])
  })

  it('creates and resets a local Soul Link run from snapshot helpers', () => {
    const store = useSoulLinkStore()

    store.createLocalRun({
      generationRules: GENERATION_RULESETS.PRE_GEN_6,
      metadata: {
        sessionId: 'session-2',
        inviteCode: 'PAIR42',
      },
      local: {
        preferredPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      },
      rosters: {
        [SOUL_LINK_PLAYER_IDS.LOCAL]: {
          team: [
            createDefaultSoulLinkMember({
              id: 'member-boot-1',
              speciesName: 'Treecko',
              ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
            }),
          ],
          box: [],
        },
      },
    })

    expect(store.generationRules.value).toBe(GENERATION_RULESETS.PRE_GEN_6)
    expect(store.sessionMetadata.value.sessionId).toBe('session-2')
    expect(store.localPreferences.value.preferredPlayerId).toBe(
      SOUL_LINK_PLAYER_IDS.PARTNER,
    )
    expect(store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({
        id: 'member-boot-1',
        ownerPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
      }),
    ])

    store.resetLocalRun()

    expect(store.runState.value).toEqual(
      expect.objectContaining({
        mode: RUN_MODES.SOUL_LINK,
        rules: {
          generation: DEFAULT_GENERATION_RULESET,
        },
      }),
    )
    expect(store.sessionMetadata.value.sessionId).toBeNull()
    expect(store.localPreferences.value.cachedPlayerSlot).toBe(
      SOUL_LINK_PLAYER_IDS.LOCAL,
    )
  })

  it('starts a fresh local Soul Link run with the convenience initializer', () => {
    const store = useSoulLinkStore()

    store.updateSessionMetadata({ name: 'Existing Run' })
    store.addRosterMember(
      SOUL_LINK_PLAYER_IDS.LOCAL,
      'team',
      createDefaultSoulLinkMember({
        id: 'member-reset-1',
        speciesName: 'Torchic',
      }),
    )

    store.startNewLocalSoulLinkRun(GENERATION_RULESETS.PRE_GEN_6)

    expect(store.runState.value.mode).toBe(RUN_MODES.SOUL_LINK)
    expect(store.generationRules.value).toBe(GENERATION_RULESETS.PRE_GEN_6)
    expect(store.sessionMetadata.value.name).toBeNull()
    expect(store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([])
  })

  it('sanitizes Soul Link rosters and gym progress when rules change', () => {
    const store = useSoulLinkStore()

    store.createLocalRun({
      generationRules: DEFAULT_GENERATION_RULESET,
      rosters: {
        [SOUL_LINK_PLAYER_IDS.LOCAL]: {
          team: [
            createDefaultSoulLinkMember({
              id: 'member-fairy-1',
              speciesName: 'Clefairy',
              berry: 'Roseli Berry',
              moves: ['fairy', 'normal'],
              megaForm: 'Mega',
              megaTypes: ['fairy'],
              megaSpriteId: 'test-mega-sprite',
            }),
          ],
          box: [],
        },
      },
      progress: {
        [SOUL_LINK_PLAYER_IDS.LOCAL]: {
          defeatedGyms: ['fairy', 'rock'],
          pinnedGym: 'fairy',
        },
      },
    })

    store.setGenerationRules(GENERATION_RULESETS.PRE_GEN_6)

    expect(store.generationRules.value).toBe(GENERATION_RULESETS.PRE_GEN_6)
    expect(store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({
        id: 'member-fairy-1',
        speciesName: 'Clefairy',
        types: ['normal'],
        berry: null,
        moves: ['normal'],
        megaForm: null,
        megaTypes: null,
        megaSpriteId: null,
      }),
    ])
    expect(store.getPlayerGymProgress(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual({
      defeatedGyms: ['rock'],
      pinnedGym: null,
    })
  })

  it('manages per-player rosters and gym progress', () => {
    const store = useSoulLinkStore()
    const localMember = createDefaultSoulLinkMember({
      id: 'member-1',
      speciesName: 'Treecko',
      ownerPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
    })
    const partnerMember = createDefaultSoulLinkMember({
      id: 'member-2',
      speciesName: 'Torchic',
      ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
    })

    store.addRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', localMember)
    store.addRosterMember(SOUL_LINK_PLAYER_IDS.PARTNER, 'box', partnerMember)
    store.updateRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', 'member-1', {
      nickname: 'Leaf',
      ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
    })
    store.updatePlayerGymProgress(SOUL_LINK_PLAYER_IDS.LOCAL, {
      defeatedGyms: ['rock'],
      pinnedGym: 'electric',
    })
    store.removeRosterMember(SOUL_LINK_PLAYER_IDS.PARTNER, 'box', 'member-2')

    expect(store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({
        id: 'member-1',
        nickname: 'Leaf',
        ownerPlayerId: SOUL_LINK_PLAYER_IDS.LOCAL,
      }),
    ])
    expect(store.getPlayerBox(SOUL_LINK_PLAYER_IDS.PARTNER)).toEqual([])
    expect(store.getPlayerGymProgress(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual({
      defeatedGyms: ['rock'],
      pinnedGym: 'electric',
    })
  })

  it('tracks local preferences, pending sync changes, and activity entries', () => {
    const store = useSoulLinkStore()

    store.setCachedPlayerSlot(SOUL_LINK_PLAYER_IDS.PARTNER)
    store.setLocalPreferences({
      notifications: {
        gymProgress: false,
      },
    })
    store.enqueuePendingChangeSet({
      id: 'change-1',
      operations: [{ op: 'replace', path: '/metadata/name', value: 'Run' }],
    })
    store.appendActivityEntry({
      id: 'activity-1',
      actorPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      createdAt: '2026-03-18T10:00:00.000Z',
      message: 'Partner updated their team',
    })
    store.markActivityEntryRead('activity-1', '2026-03-18T11:00:00.000Z')
    store.removePendingChangeSet('change-1')

    expect(store.localPreferences.value.cachedPlayerSlot).toBe(
      SOUL_LINK_PLAYER_IDS.PARTNER,
    )
    expect(store.localPreferences.value.notifications.gymProgress).toBe(false)
    expect(store.pendingChangeSets.value).toEqual([])
    expect(store.activityFeed.value).toEqual([
      expect.objectContaining({
        id: 'activity-1',
        readAt: '2026-03-18T11:00:00.000Z',
      }),
    ])
    expect(store.activity.value.lastUpdatedAt).toBe('2026-03-18T10:00:00.000Z')
  })

  it('validates player references when creating runs and updating preferences', () => {
    const store = useSoulLinkStore()

    expect(() =>
      store.createLocalRun({
        local: {
          devicePlayerId: 'unknown-player',
        },
      }),
    ).toThrow(/valid Soul Link device player id/i)

    expect(() =>
      store.createLocalRun({
        rosters: {
          'unknown-player': {
            team: [],
            box: [],
          },
        },
      }),
    ).toThrow(/valid Soul Link player id/i)

    expect(() =>
      store.createLocalRun({
        players: [
          { id: 'player-a', name: 'Alpha', isLocal: false },
          { id: 'player-b', name: 'Beta', isLocal: false },
        ],
      }),
    ).toThrow(/exactly one local Soul Link player/i)

    expect(() =>
      store.setLocalPreferences({
        devicePlayerId: 'unknown-player',
      }),
    ).toThrow(/valid Soul Link device player id/i)

    expect(() => store.setCachedPlayerSlot('unknown-player')).toThrow(
      /valid Soul Link player id/i,
    )
  })
})

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

  it('appends team additions and prepends box and dead additions', () => {
    const store = useSoulLinkStore()

    const first = createDefaultSoulLinkMember({
      id: 'team-1',
      speciesName: 'Treecko',
    })
    const second = createDefaultSoulLinkMember({
      id: 'team-2',
      speciesName: 'Torchic',
    })
    const boxFirst = createDefaultSoulLinkMember({
      id: 'box-1',
      speciesName: 'Mudkip',
    })
    const boxSecond = createDefaultSoulLinkMember({
      id: 'box-2',
      speciesName: 'Ralts',
    })

    store.addRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', first)
    store.addRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', second)
    store.addRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'box', boxFirst)
    store.addRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'box', boxSecond)

    const team = store.getPlayerTeam(SOUL_LINK_PLAYER_IDS.LOCAL)
    expect(team[0]).toEqual(expect.objectContaining({ id: 'team-1' }))
    expect(team[1]).toEqual(expect.objectContaining({ id: 'team-2' }))

    const box = store.getPlayerBox(SOUL_LINK_PLAYER_IDS.LOCAL)
    expect(box[0]).toEqual(expect.objectContaining({ id: 'box-2' }))
    expect(box[1]).toEqual(expect.objectContaining({ id: 'box-1' }))
  })

  it('preserves linked pairIds when linked members are killed and revived', () => {
    const store = useSoulLinkStore()

    store.addRosterMember(
      SOUL_LINK_PLAYER_IDS.LOCAL,
      'team',
      createDefaultSoulLinkMember({
        id: 'local-linked',
        speciesName: 'Treecko',
        catchLocation: 'Route 1',
        pairId: 'partner-linked',
      }),
    )
    store.addRosterMember(
      SOUL_LINK_PLAYER_IDS.PARTNER,
      'team',
      createDefaultSoulLinkMember({
        id: 'partner-linked',
        speciesName: 'Torchic',
        catchLocation: 'Route 1',
        pairId: 'local-linked',
        ownerPlayerId: SOUL_LINK_PLAYER_IDS.PARTNER,
      }),
    )

    store.killRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', 'local-linked')
    store.killRosterMember(
      SOUL_LINK_PLAYER_IDS.PARTNER,
      'team',
      'partner-linked',
    )

    expect(store.getPlayerDead(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({
        id: 'local-linked',
        pairId: 'partner-linked',
      }),
    ])
    expect(store.getPlayerDead(SOUL_LINK_PLAYER_IDS.PARTNER)).toEqual([
      expect.objectContaining({
        id: 'partner-linked',
        pairId: 'local-linked',
      }),
    ])

    store.reviveRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'local-linked')
    store.reviveRosterMember(SOUL_LINK_PLAYER_IDS.PARTNER, 'partner-linked')

    expect(store.getPlayerBox(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual([
      expect.objectContaining({
        id: 'local-linked',
        pairId: 'partner-linked',
      }),
    ])
    expect(store.getPlayerBox(SOUL_LINK_PLAYER_IDS.PARTNER)).toEqual([
      expect.objectContaining({
        id: 'partner-linked',
        pairId: 'local-linked',
      }),
    ])
  })

  it('exposes dead members only through the full roster accessor', () => {
    const store = useSoulLinkStore()

    store.addRosterMember(
      SOUL_LINK_PLAYER_IDS.LOCAL,
      'team',
      createDefaultSoulLinkMember({
        id: 'member-dead-1',
        speciesName: 'Gastly',
      }),
    )
    store.killRosterMember(SOUL_LINK_PLAYER_IDS.LOCAL, 'team', 'member-dead-1')

    expect(store.getPlayerRoster(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual({
      team: [],
      box: [],
    })
    expect(store.getFullPlayerRoster(SOUL_LINK_PLAYER_IDS.LOCAL)).toEqual({
      team: [],
      box: [],
      dead: [
        expect.objectContaining({
          id: 'member-dead-1',
          speciesName: 'Gastly',
        }),
      ],
    })
  })

  it('tracks local preferences', () => {
    const store = useSoulLinkStore()

    store.setCachedPlayerSlot(SOUL_LINK_PLAYER_IDS.PARTNER)
    store.setLocalPreferences({
      notifications: {
        gymProgress: false,
      },
    })

    expect(store.localPreferences.value.cachedPlayerSlot).toBe(
      SOUL_LINK_PLAYER_IDS.PARTNER,
    )
    expect(store.localPreferences.value.notifications.gymProgress).toBe(false)
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

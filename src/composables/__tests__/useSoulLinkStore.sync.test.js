import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { soloRepository, supabaseRepository, subscription } = vi.hoisted(() => ({
  soloRepository: {
    persistSoulLinkSnapshot: vi.fn(),
    loadSoulLinkSnapshot: vi.fn(),
  },
  supabaseRepository: {
    fetchSessionById: vi.fn(),
    pushSessionState: vi.fn(),
    subscribeToSession: vi.fn(),
  },
  subscription: { callback: null },
}))

vi.mock('../../services/localRunRepository.js', () => ({
  localRunRepository: soloRepository,
}))

vi.mock('../../services/supabaseRepository.js', () => ({
  createSupabaseRepository: () => supabaseRepository,
}))

vi.mock('../../services/supabaseClient.js', () => ({ supabase: null }))

import { DEFAULT_GENERATION_RULESET } from '../../data/types.js'
import {
  buildRemoteState,
  createDefaultSoulLinkMember,
  createDefaultSoulLinkState,
  SOUL_LINK_PLAYER_IDS,
} from '../../utils/soulLinkModel.js'

const LOCAL = SOUL_LINK_PLAYER_IDS.LOCAL
const PARTNER = SOUL_LINK_PLAYER_IDS.PARTNER

function buildRemote(rosters, teraEnabled, extra = {}) {
  const base = createDefaultSoulLinkState()

  return buildRemoteState(
    {
      ...base,
      ...extra,
      rosters: rosters ?? base.rosters,
    },
    DEFAULT_GENERATION_RULESET,
    teraEnabled,
  )
}

function member(overrides) {
  return createDefaultSoulLinkMember(overrides)
}

function rostersWith(localRoster, partnerRoster = {}) {
  return {
    [LOCAL]: { team: [], box: [], dead: [], ...localRoster },
    [PARTNER]: { team: [], box: [], dead: [], ...partnerRoster },
  }
}

async function loadStore() {
  vi.resetModules()
  const { useSoulLinkStore } = await import('../useSoulLinkStore.js')
  return useSoulLinkStore()
}

function seedSession(store, { teraEnabled, rosters, version = 3 }) {
  store.createLocalRun({
    teraEnabled,
    metadata: { sessionId: 'session-1', inviteCode: 'CODE1' },
    rosters,
    sync: { version },
  })
}

describe('useSoulLinkStore session sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscription.callback = null

    soloRepository.persistSoulLinkSnapshot.mockResolvedValue(undefined)
    soloRepository.loadSoulLinkSnapshot.mockResolvedValue(null)
    supabaseRepository.fetchSessionById.mockResolvedValue(null)
    supabaseRepository.pushSessionState.mockResolvedValue({
      success: true,
      version: 4,
    })
    supabaseRepository.subscribeToSession.mockImplementation(
      (_id, onUpdate) => {
        subscription.callback = onUpdate
        return () => {
          subscription.callback = null
        }
      },
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies remote settings on initial sync instead of reverting the server', async () => {
    const store = await loadStore()
    const localMember = member({
      id: 'member-1',
      speciesName: 'Bulbasaur',
      updatedAt: 1000,
    })

    seedSession(store, {
      teraEnabled: false,
      rosters: rostersWith({ team: [localMember] }),
    })

    supabaseRepository.fetchSessionById.mockResolvedValue({
      id: 'session-1',
      inviteCode: 'CODE1',
      version: 5,
      state: buildRemote(
        rostersWith({
          team: [
            {
              ...localMember,
              ownerPlayerId: LOCAL,
              teraType: 'fire',
              updatedAt: 2000,
            },
          ],
        }),
        true,
      ),
    })

    await store.syncSession()

    expect(store.teraEnabled.value).toBe(true)
    expect(store.getPlayerRoster(LOCAL).team[0].teraType).toBe('fire')
    expect(supabaseRepository.pushSessionState).toHaveBeenCalledTimes(1)

    const [sessionId, pushedState, expectedVersion] =
      supabaseRepository.pushSessionState.mock.calls[0]
    expect(sessionId).toBe('session-1')
    expect(expectedVersion).toBe(5)
    expect(pushedState.teraEnabled).toBe(true)
    expect(pushedState.rosters[LOCAL].team[0].teraType).toBe('fire')
  })

  it('applies fetched settings on the conflict retry and keeps local-only members', async () => {
    const store = await loadStore()
    const sharedMember = member({
      id: 'shared-1',
      speciesName: 'Bulbasaur',
      teraType: 'fire',
      updatedAt: 5000,
    })
    const localOnlyMember = member({
      id: 'local-only-1',
      speciesName: 'Charmander',
      teraType: 'water',
      updatedAt: 6000,
    })

    seedSession(store, {
      teraEnabled: true,
      rosters: rostersWith({ team: [sharedMember, localOnlyMember] }),
    })

    supabaseRepository.pushSessionState
      .mockResolvedValueOnce({ success: false, version: null })
      .mockResolvedValueOnce({ success: true, version: 5 })
    supabaseRepository.fetchSessionById.mockResolvedValue({
      id: 'session-1',
      inviteCode: 'CODE1',
      version: 4,
      state: buildRemote(
        rostersWith({
          team: [
            {
              ...sharedMember,
              ownerPlayerId: LOCAL,
              teraType: null,
              updatedAt: 7000,
            },
          ],
        }),
        false,
      ),
    })

    await store.pushState()

    expect(supabaseRepository.pushSessionState).toHaveBeenCalledTimes(2)
    expect(supabaseRepository.pushSessionState.mock.calls[0][2]).toBe(3)
    expect(supabaseRepository.pushSessionState.mock.calls[1][2]).toBe(4)

    const retriedTeam =
      supabaseRepository.pushSessionState.mock.calls[1][1].rosters[LOCAL].team
    expect(
      supabaseRepository.pushSessionState.mock.calls[1][1].teraEnabled,
    ).toBe(false)
    expect(retriedTeam.find((m) => m.id === 'shared-1')).toEqual(
      expect.objectContaining({ teraType: null, updatedAt: 7000 }),
    )
    expect(retriedTeam.find((m) => m.id === 'local-only-1')).toEqual(
      expect.objectContaining({ teraType: null, updatedAt: 6000 }),
    )
    expect(store.teraEnabled.value).toBe(false)

    await Promise.resolve()
  })

  it('applies repeated realtime remote disables without pushing or restamping', async () => {
    const store = await loadStore()

    seedSession(store, {
      teraEnabled: true,
      rosters: rostersWith({
        team: [
          member({
            id: 'member-1',
            speciesName: 'Bulbasaur',
            teraType: 'fire',
            updatedAt: 1000,
          }),
        ],
      }),
    })

    store.subscribeToSessionUpdates()
    expect(subscription.callback).toBeTypeOf('function')

    const session = {
      id: 'session-1',
      inviteCode: 'CODE1',
      version: 9,
      state: buildRemote(
        rostersWith({
          team: [
            member({
              id: 'member-1',
              speciesName: 'Bulbasaur',
              teraType: null,
              updatedAt: 2000,
            }),
          ],
        }),
        false,
      ),
    }

    subscription.callback(session)
    subscription.callback(session)

    expect(store.teraEnabled.value).toBe(false)
    expect(store.getPlayerRoster(LOCAL).team[0]).toEqual(
      expect.objectContaining({
        id: 'member-1',
        teraType: null,
        updatedAt: 2000,
      }),
    )
    expect(supabaseRepository.pushSessionState).not.toHaveBeenCalled()

    store.unsubscribeFromSession()
    await Promise.resolve()
  })

  it('retains the current setting when the remote payload omits teraEnabled', async () => {
    const store = await loadStore()

    seedSession(store, { teraEnabled: true, version: 2 })

    const legacyState = buildRemote(undefined, true)
    delete legacyState.teraEnabled

    supabaseRepository.fetchSessionById.mockResolvedValue({
      id: 'session-1',
      inviteCode: 'CODE1',
      version: 4,
      state: legacyState,
    })

    await store.pullState()

    expect(store.teraEnabled.value).toBe(true)
    expect(supabaseRepository.pushSessionState).not.toHaveBeenCalled()
  })
})

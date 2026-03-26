import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  store: null,
  draft: null,
  reconcileSoulLinkPairing: vi.fn(),
  findLinkedDeleteTarget: vi.fn(),
  preserveSoulLinkPairingFields: vi.fn((member) => member),
}))

vi.mock('../useSoulLinkStore.js', () => ({
  useSoulLinkStore: () => mocks.store,
}))

vi.mock('../useDraftAction.js', () => ({
  useDraftAction: () => mocks.draft,
}))

vi.mock('../../utils/soulLinkPairing.js', () => ({
  findLinkedDeleteTarget: (...args) => mocks.findLinkedDeleteTarget(...args),
  preserveSoulLinkPairingFields: (...args) =>
    mocks.preserveSoulLinkPairingFields(...args),
  reconcileSoulLinkPairing: (...args) =>
    mocks.reconcileSoulLinkPairing(...args),
}))

import { useSoulLinkHandlers } from '../useSoulLinkHandlers.js'

function createDraftAction(overrides = {}) {
  return {
    type: 'add',
    pokemon: { name: 'Eevee', types: ['normal'] },
    ability: null,
    berry: null,
    moves: ['tackle', null],
    specialMove: null,
    megaForm: null,
    megaTypes: null,
    megaSpriteId: null,
    spriteVariant: 'default',
    nickname: 'Scout',
    catchLocation: 'Route 1',
    pairId: null,
    ...overrides,
  }
}

function createStore(overrides = {}) {
  return {
    getPlayerRoster: vi.fn(() => ({ team: [], box: [], dead: [] })),
    getFullPlayerRoster: vi.fn(() => ({ team: [], box: [], dead: [] })),
    getPlayerGymProgress: vi.fn(() => ({ defeatedGyms: [], pinnedGym: null })),
    setPlayerRoster: vi.fn(),
    addRosterMember: vi.fn(),
    updateRosterMember: vi.fn(),
    removeRosterMember: vi.fn(),
    killRosterMember: vi.fn(),
    reviveRosterMember: vi.fn(),
    getPlayerDead: vi.fn(() => []),
    updatePlayerGymProgress: vi.fn(),
    sessionMetadata: ref({ sessionId: 'session-1' }),
    pushState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createDraftMocks(draftValue) {
  return {
    draftAction: ref(draftValue),
    cancel: vi.fn(),
    enterSwapMode: vi.fn(),
    exitSwapMode: vi.fn(),
    updateInHandPokemon: vi.fn(),
  }
}

describe('useSoulLinkHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findLinkedDeleteTarget.mockReturnValue(null)
  })

  it('adds box drafts, reconciles pairing, and syncs', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(createDraftAction({ type: 'addToBox' }))

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkConfirmDraft()

    expect(mocks.store.addRosterMember).toHaveBeenCalledWith(
      'player-1',
      'box',
      expect.objectContaining({
        speciesName: 'Eevee',
        ownerPlayerId: 'player-1',
        catchLocation: 'Route 1',
      }),
    )
    expect(mocks.reconcileSoulLinkPairing).toHaveBeenCalledWith(
      'player-1',
      expect.any(String),
      'box',
      expect.any(Object),
    )
    expect(mocks.draft.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.store.pushState).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileSoulLinkPairing).toHaveBeenCalledWith(
      'player-1',
      expect.any(String),
      'box',
      expect.objectContaining({
        getPlayerRoster: mocks.store.getFullPlayerRoster,
      }),
    )
  })

  it('updates dead roster members and keeps existing reconciliation behavior', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(
      createDraftAction({
        type: 'edit',
        isDeadPokemon: true,
        deadPokemonId: 'dead-1',
      }),
    )

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkConfirmDraft()

    expect(mocks.store.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'dead',
      'dead-1',
      expect.objectContaining({
        speciesName: 'Eevee',
        nickname: 'Scout',
        catchLocation: 'Route 1',
      }),
    )
    expect(mocks.reconcileSoulLinkPairing).toHaveBeenCalledWith(
      'player-1',
      'dead-1',
      'dead',
      expect.any(Object),
    )
    expect(mocks.draft.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.store.pushState).toHaveBeenCalledTimes(1)
  })

  it('reconciles pairing immediately for add-to-dead drafts', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(createDraftAction({ type: 'addToDead' }))

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkConfirmDraft()

    expect(mocks.store.addRosterMember).toHaveBeenCalledWith(
      'player-1',
      'dead',
      expect.objectContaining({
        speciesName: 'Eevee',
        ownerPlayerId: 'player-1',
        catchLocation: 'Route 1',
      }),
    )
    expect(mocks.reconcileSoulLinkPairing).toHaveBeenCalledWith(
      'player-1',
      expect.any(String),
      'dead',
      expect.objectContaining({
        getPlayerRoster: mocks.store.getFullPlayerRoster,
      }),
    )
    expect(mocks.draft.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.store.pushState).toHaveBeenCalledTimes(1)
  })

  it('uses the full roster accessor for linked-delete lookups', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(createDraftAction())
    mocks.findLinkedDeleteTarget.mockReturnValue({
      memberId: 'team-1',
      rosterKey: 'team',
      partnerPlayerId: 'player-2',
      partnerMemberId: 'dead-2',
      partnerRosterKey: 'dead',
    })

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkDeleteTeamPokemon('team-1')

    expect(mocks.findLinkedDeleteTarget).toHaveBeenCalledWith(
      'player-1',
      'team-1',
      'team',
      expect.objectContaining({
        getPlayerRoster: mocks.store.getFullPlayerRoster,
      }),
    )
  })

  it('opens linked-delete confirmation for dead linked members', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(createDraftAction({ type: 'edit' }))
    mocks.findLinkedDeleteTarget.mockReturnValue({
      memberId: 'dead-1',
      rosterKey: 'dead',
      partnerPlayerId: 'player-2',
      partnerMemberId: 'dead-2',
      partnerRosterKey: 'dead',
    })

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkDeleteDeadPokemon({ id: 'dead-1' })

    expect(mocks.findLinkedDeleteTarget).toHaveBeenCalledWith(
      'player-1',
      'dead-1',
      'dead',
      expect.objectContaining({
        getPlayerRoster: mocks.store.getFullPlayerRoster,
      }),
    )
    expect(mocks.store.removeRosterMember).not.toHaveBeenCalled()
    expect(mocks.draft.cancel).not.toHaveBeenCalled()
    expect(mocks.store.pushState).not.toHaveBeenCalled()
    expect(handlers.linkedDeleteTarget.value).toEqual({
      memberId: 'dead-1',
      rosterKey: 'dead',
      partnerPlayerId: 'player-2',
      partnerMemberId: 'dead-2',
      partnerRosterKey: 'dead',
    })
  })

  it('deletes unlinked dead members immediately and closes the draft', () => {
    mocks.store = createStore()
    mocks.draft = createDraftMocks(createDraftAction({ type: 'edit' }))

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkDeleteDeadPokemon({ id: 'dead-1' })

    expect(mocks.store.removeRosterMember).toHaveBeenCalledWith(
      'player-1',
      'dead',
      'dead-1',
    )
    expect(mocks.draft.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.store.pushState).toHaveBeenCalledTimes(1)
  })

  it('enters add-replace mode instead of syncing when the team is full', () => {
    mocks.store = createStore({
      getPlayerRoster: vi.fn(() => ({
        team: Array.from({ length: 6 }, (_, index) => ({
          id: `team-${index}`,
          speciesName: `Member ${index}`,
        })),
        box: [],
        dead: [],
      })),
    })
    mocks.draft = createDraftMocks(createDraftAction({ type: 'add' }))

    const handlers = useSoulLinkHandlers(
      ref('player-1'),
      ref('gen-6'),
      ref([{ id: 'player-1' }, { id: 'player-2' }]),
    )

    handlers.handleSoulLinkConfirmDraft()

    expect(mocks.store.addRosterMember).toHaveBeenCalledWith(
      'player-1',
      'box',
      expect.objectContaining({
        speciesName: 'Eevee',
        ownerPlayerId: 'player-1',
      }),
    )
    expect(mocks.draft.enterSwapMode).toHaveBeenCalledTimes(1)
    expect(mocks.draft.cancel).not.toHaveBeenCalled()
    expect(mocks.store.pushState).not.toHaveBeenCalled()
    expect(mocks.draft.draftAction.value).toEqual(
      expect.objectContaining({
        type: 'edit',
        isBoxPokemon: true,
        isAddReplace: true,
        boxPokemonId: expect.any(String),
      }),
    )
  })
})

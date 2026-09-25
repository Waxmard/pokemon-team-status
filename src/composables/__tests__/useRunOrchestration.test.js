import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  players: null,
  updatePlayer: vi.fn(),
}))

vi.mock('../useSoulLinkStore.js', () => ({
  useSoulLinkStore: () => ({
    players: mocks.players,
    updatePlayer: mocks.updatePlayer,
  }),
}))
vi.mock('../useRunStore.js', () => ({
  useRunStore: () => ({}),
  registerSoloSyncScheduler: vi.fn(),
}))
vi.mock('../useDraftAction.js', () => ({ useDraftAction: () => ({}) }))
vi.mock('../useRunModeStore.js', () => ({ useRunModeStore: () => ({}) }))
vi.mock('../useSoloRunManager.js', () => ({ useSoloRunManager: () => ({}) }))
vi.mock('../useSoulLinkRunManager.js', () => ({
  useSoulLinkRunManager: () => ({}),
}))
vi.mock('../useSoloSync.js', () => ({ useSoloSync: () => ({}) }))

import { useRunOrchestration } from '../useRunOrchestration.js'

function createOrchestration() {
  mocks.players = ref([{ id: 'player-1', name: 'Ash' }])
  return useRunOrchestration({
    viewedSoulLinkPlayerId: ref('player-1'),
    cancelSwap: vi.fn(),
    resetSwapOriginal: vi.fn(),
    handleSoulLinkCancelSwap: vi.fn(),
    soulLinkSwapOriginalRoster: ref(null),
  })
}

describe('useRunOrchestration', () => {
  beforeEach(() => {
    mocks.updatePlayer.mockClear()
  })

  it('exposes the viewed-player rename handler', () => {
    const orchestration = createOrchestration()

    expect(typeof orchestration.handleRenameViewedSoulLinkPlayer).toBe(
      'function',
    )
  })

  it('renames the viewed player with a trimmed name', () => {
    const orchestration = createOrchestration()

    orchestration.handleRenameViewedSoulLinkPlayer(' Misty ')

    expect(mocks.updatePlayer).toHaveBeenCalledWith('player-1', {
      name: 'Misty',
    })
  })

  it('ignores blank and unchanged names', () => {
    const orchestration = createOrchestration()

    orchestration.handleRenameViewedSoulLinkPlayer('   ')
    orchestration.handleRenameViewedSoulLinkPlayer('Ash')

    expect(mocks.updatePlayer).not.toHaveBeenCalled()
  })
})

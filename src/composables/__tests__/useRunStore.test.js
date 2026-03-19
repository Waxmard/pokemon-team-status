import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    loadSoloRunSnapshot: vi.fn(),
    persistSoloTeam: vi.fn(),
    persistSoloBox: vi.fn(),
    persistSoloDefeatedGyms: vi.fn(),
    persistSoloPinnedGym: vi.fn(),
    persistSoloGenerationRules: vi.fn(),
  },
}))

vi.mock('../../services/localRunRepository.js', () => ({
  createLocalSoloRunRepository: () => repository,
}))

vi.mock('../../utils/spriteCache.js', () => ({
  prefetchAllSprites: vi.fn(),
  prefetchBerrySprites: vi.fn(),
  prefetchTypeIcons: vi.fn(),
}))

import {
  createDefaultRunState,
  createDefaultSoulLinkRunState,
} from '../../utils/runSnapshot.js'
import { useRunStore } from '../useRunStore.js'

describe('useRunStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    repository.loadSoloRunSnapshot.mockResolvedValue({
      team: [],
      box: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })
    repository.persistSoloTeam.mockResolvedValue(undefined)
    repository.persistSoloBox.mockResolvedValue(undefined)
    repository.persistSoloDefeatedGyms.mockResolvedValue(undefined)
    repository.persistSoloPinnedGym.mockResolvedValue(undefined)
    repository.persistSoloGenerationRules.mockResolvedValue(undefined)

    useRunStore().runState.value = createDefaultRunState()
  })

  it('rejects Soul Link state in solo persistence mutators', async () => {
    const store = useRunStore()
    store.runState.value = createDefaultSoulLinkRunState()

    expect(() => store.team.value).toThrow(/only supports solo runs/i)
    await expect(store.persistTeam([])).rejects.toThrow(
      /only supports solo runs/i,
    )
    await expect(store.persistGenerationRules('current')).rejects.toThrow(
      /only supports solo runs/i,
    )

    expect(repository.persistSoloTeam).not.toHaveBeenCalled()
    expect(repository.persistSoloGenerationRules).not.toHaveBeenCalled()
  })
})

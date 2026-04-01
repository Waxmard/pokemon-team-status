import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    loadSoloRunSnapshot: vi.fn(),
    persistSoloTeam: vi.fn(),
    persistSoloBox: vi.fn(),
    persistSoloDead: vi.fn(),
    persistSoloDefeatedGyms: vi.fn(),
    persistSoloPinnedGym: vi.fn(),
    persistSoloGenerationRules: vi.fn(),
  },
}))

const { soloRunManager } = vi.hoisted(() => ({
  soloRunManager: {
    persistActiveRunSnapshot: vi.fn(),
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

vi.mock('../useSoloRunManager.js', () => ({
  useSoloRunManager: () => soloRunManager,
}))

import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../../data/types.js'
import {
  createDefaultRunState,
  createDefaultSoulLinkRunState,
} from '../../utils/runSnapshot.js'
import { useRunStore } from '../useRunStore.js'

function createDeferred() {
  let resolve
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

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
    repository.persistSoloDead.mockResolvedValue(undefined)
    repository.persistSoloDefeatedGyms.mockResolvedValue(undefined)
    repository.persistSoloPinnedGym.mockResolvedValue(undefined)
    repository.persistSoloGenerationRules.mockResolvedValue(undefined)
    soloRunManager.persistActiveRunSnapshot.mockResolvedValue(undefined)

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
    expect(soloRunManager.persistActiveRunSnapshot).not.toHaveBeenCalled()
  })

  it('starts a fresh solo run and persists the reset snapshot', async () => {
    const store = useRunStore()

    store.runState.value = {
      ...store.runState.value,
      team: [{ id: 'team-1', name: 'Mudkip' }],
      box: [{ id: 'box-1', name: 'Zigzagoon' }],
      progress: {
        defeatedGyms: ['rock'],
        pinnedGym: 'electric',
      },
    }

    await store.startNewSoloRun(GENERATION_RULESETS.PRE_GEN_6)

    expect(store.team.value).toEqual([])
    expect(store.box.value).toEqual([])
    expect(store.defeatedGyms.value).toEqual([])
    expect(store.pinnedGym.value).toBeNull()
    expect(store.generationRules.value).toBe(GENERATION_RULESETS.PRE_GEN_6)
    expect(repository.persistSoloTeam).toHaveBeenCalledWith([])
    expect(repository.persistSoloBox).toHaveBeenCalledWith([])
    expect(repository.persistSoloDead).toHaveBeenCalledWith([])
    expect(repository.persistSoloDefeatedGyms).toHaveBeenCalledWith([])
    expect(repository.persistSoloPinnedGym).toHaveBeenCalledWith(null)
    expect(repository.persistSoloGenerationRules).toHaveBeenCalledWith(
      GENERATION_RULESETS.PRE_GEN_6,
    )
    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledWith({
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: GENERATION_RULESETS.PRE_GEN_6,
    })
  })

  it('serializes solo writes so a reset cannot be overwritten by an older team save', async () => {
    const store = useRunStore()
    const firstTeamPersist = createDeferred()

    repository.persistSoloTeam.mockImplementation((team) => {
      if (team.length === 1) {
        return firstTeamPersist.promise
      }
      return Promise.resolve()
    })

    store.runState.value = {
      ...store.runState.value,
      team: [{ id: 'team-1', name: 'Mudkip' }],
    }

    const staleWrite = store.persistTeam([{ id: 'team-2', name: 'Treecko' }])
    const resetWrite = store.startNewSoloRun()

    await vi.waitFor(() => {
      expect(repository.persistSoloTeam).toHaveBeenCalledTimes(1)
    })
    expect(repository.persistSoloBox).not.toHaveBeenCalled()
    expect(repository.persistSoloDead).not.toHaveBeenCalled()

    firstTeamPersist.resolve()
    await Promise.all([staleWrite, resetWrite])

    expect(repository.persistSoloTeam).toHaveBeenNthCalledWith(1, [
      { id: 'team-2', name: 'Treecko' },
    ])
    expect(repository.persistSoloTeam).toHaveBeenNthCalledWith(2, [])
    expect(store.team.value).toEqual([])
    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenNthCalledWith(1, {
      team: [{ id: 'team-2', name: 'Treecko' }],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: DEFAULT_GENERATION_RULESET,
    })
    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenNthCalledWith(2, {
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: DEFAULT_GENERATION_RULESET,
    })
  })

  it('syncs the active run snapshot after normal team updates', async () => {
    const store = useRunStore()

    await store.persistTeam([{ id: 'team-3', name: 'Torchic' }])

    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledWith({
      team: [{ id: 'team-3', name: 'Torchic' }],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: DEFAULT_GENERATION_RULESET,
    })
  })
})

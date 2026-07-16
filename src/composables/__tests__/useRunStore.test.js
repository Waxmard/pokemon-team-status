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
    persistSoloGenerationRulesUpdatedAt: vi.fn(),
    persistSoloTeraEnabled: vi.fn(),
    persistSoloTeraEnabledUpdatedAt: vi.fn(),
  },
}))

const { soloRunManager } = vi.hoisted(() => ({
  soloRunManager: {
    persistActiveRunSnapshot: vi.fn(),
    activeRunId: { value: null },
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
    repository.persistSoloGenerationRulesUpdatedAt.mockResolvedValue(undefined)
    repository.persistSoloTeraEnabled.mockResolvedValue(undefined)
    repository.persistSoloTeraEnabledUpdatedAt.mockResolvedValue(undefined)
    soloRunManager.persistActiveRunSnapshot.mockResolvedValue(undefined)
    soloRunManager.activeRunId.value = 'test-run-1'

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
    expect(soloRunManager.persistActiveRunSnapshot).not.toHaveBeenCalled()
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
    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledTimes(1)
    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledWith(
      {
        team: [{ id: 'team-2', name: 'Treecko' }],
        box: [],
        dead: [],
        _tombstones: [],
        defeatedGyms: [],
        pinnedGym: null,
        progressUpdatedAt: null,
        generationRules: DEFAULT_GENERATION_RULESET,
        generationRulesUpdatedAt: null,
        teraEnabled: false,
        teraEnabledUpdatedAt: null,
      },
      'test-run-1',
    )
  })

  it('persists to the run that was active at enqueue time, not execution time', async () => {
    const store = useRunStore()
    const firstTeamPersist = createDeferred()

    repository.persistSoloTeam.mockReturnValue(firstTeamPersist.promise)

    soloRunManager.activeRunId.value = 'run-a'
    store.runState.value = {
      ...store.runState.value,
      team: [{ id: 'team-1', name: 'Mudkip' }],
    }

    const persistPromise = store.persistTeam([
      { id: 'team-2', name: 'Treecko' },
    ])

    // Simulate run switch while persist is queued
    soloRunManager.activeRunId.value = 'run-b'

    firstTeamPersist.resolve()
    await persistPromise

    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        team: [{ id: 'team-2', name: 'Treecko' }],
      }),
      'run-a',
    )
  })

  it('syncs the active run snapshot after normal team updates', async () => {
    const store = useRunStore()

    await store.persistTeam([{ id: 'team-3', name: 'Torchic' }])

    expect(soloRunManager.persistActiveRunSnapshot).toHaveBeenCalledWith(
      {
        team: [{ id: 'team-3', name: 'Torchic' }],
        box: [],
        dead: [],
        _tombstones: [],
        defeatedGyms: [],
        pinnedGym: null,
        progressUpdatedAt: null,
        generationRules: DEFAULT_GENERATION_RULESET,
        generationRulesUpdatedAt: null,
        teraEnabled: false,
        teraEnabledUpdatedAt: null,
      },
      'test-run-1',
    )
  })
})

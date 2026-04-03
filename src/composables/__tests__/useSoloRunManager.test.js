import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../../data/types.js'

const { repository } = vi.hoisted(() => ({
  repository: {
    loadSoloRunIndex: vi.fn(),
    loadSoloRunSnapshot: vi.fn(),
    loadSoloRun: vi.fn(),
    persistSoloTeam: vi.fn(),
    persistSoloBox: vi.fn(),
    persistSoloDead: vi.fn(),
    persistSoloDefeatedGyms: vi.fn(),
    persistSoloPinnedGym: vi.fn(),
    persistSoloGenerationRules: vi.fn(),
    persistSoloRun: vi.fn(),
    persistSoloRunIndex: vi.fn(),
  },
}))

vi.mock('../../services/localRunRepository.js', () => ({
  createLocalSoloRunRepository: () => repository,
}))

describe('useSoloRunManager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'solo-run-1') })

    repository.loadSoloRunIndex.mockResolvedValue(null)
    repository.loadSoloRunSnapshot.mockResolvedValue({
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: null,
    })
    repository.loadSoloRun.mockResolvedValue(null)
    repository.persistSoloTeam.mockResolvedValue(undefined)
    repository.persistSoloBox.mockResolvedValue(undefined)
    repository.persistSoloDead.mockResolvedValue(undefined)
    repository.persistSoloDefeatedGyms.mockResolvedValue(undefined)
    repository.persistSoloPinnedGym.mockResolvedValue(undefined)
    repository.persistSoloGenerationRules.mockResolvedValue(undefined)
    repository.persistSoloRun.mockResolvedValue(undefined)
    repository.persistSoloRunIndex.mockResolvedValue(undefined)
  })

  it('uses the existing solo run index when one is present', async () => {
    const existingIndex = {
      activeRunId: 'solo-run-9',
      runs: [{ id: 'solo-run-9', updatedAt: '2026-04-01T12:00:00.000Z' }],
    }
    repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
    repository.loadSoloRun.mockResolvedValue({
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })

    const { useSoloRunManager } = await import('../useSoloRunManager.js')
    const manager = useSoloRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBe('solo-run-9')
    expect(manager.activeRunSummary.value).toEqual(existingIndex.runs[0])
    expect(repository.loadSoloRunSnapshot).not.toHaveBeenCalled()
    expect(repository.persistSoloRun).not.toHaveBeenCalled()
    expect(repository.persistSoloRunIndex).not.toHaveBeenCalled()
  })

  it('migrates legacy solo snapshot data into the first indexed run', async () => {
    repository.loadSoloRunSnapshot.mockResolvedValue({
      team: [{ id: 'team-1', name: 'Mudkip' }],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })

    const { useSoloRunManager } = await import('../useSoloRunManager.js')
    const manager = useSoloRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBe('solo-run-1')
    expect(repository.persistSoloTeam).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'team-1',
        name: 'Mudkip',
        types: ['water'],
        moves: [],
      }),
    ])
    expect(repository.persistSoloRun).toHaveBeenCalledWith(
      'solo-run-1',
      expect.objectContaining({
        name: null,
        pinnedGym: null,
        defeatedGyms: [],
        team: [
          expect.objectContaining({
            id: 'team-1',
            name: 'Mudkip',
            types: ['water'],
            moves: [],
          }),
        ],
        generationRules: DEFAULT_GENERATION_RULESET,
        createdAt: expect.any(String),
      }),
    )
    expect(repository.persistSoloRunIndex).toHaveBeenCalledWith({
      activeRunId: 'solo-run-1',
      runs: [
        expect.objectContaining({
          id: 'solo-run-1',
          teamCount: 1,
          generationRules: DEFAULT_GENERATION_RULESET,
        }),
      ],
    })
  })

  it('creates a blank solo run when no saved solo data exists', async () => {
    const { useSoloRunManager } = await import('../useSoloRunManager.js')
    const manager = useSoloRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBe('solo-run-1')
    expect(repository.persistSoloTeam).toHaveBeenCalledWith([])
    expect(repository.persistSoloBox).toHaveBeenCalledWith([])
    expect(repository.persistSoloDead).toHaveBeenCalledWith([])
    expect(repository.persistSoloDefeatedGyms).toHaveBeenCalledWith([])
    expect(repository.persistSoloPinnedGym).toHaveBeenCalledWith(null)
    expect(repository.persistSoloGenerationRules).toHaveBeenCalledWith(
      DEFAULT_GENERATION_RULESET,
    )
    expect(repository.persistSoloRun).toHaveBeenCalledWith(
      'solo-run-1',
      expect.objectContaining({
        team: [],
        box: [],
        dead: [],
        defeatedGyms: [],
        pinnedGym: null,
        generationRules: DEFAULT_GENERATION_RULESET,
        createdAt: expect.any(String),
      }),
    )
  })

  it('syncs the active run snapshot while preserving existing metadata', async () => {
    const existingIndex = {
      activeRunId: 'solo-run-9',
      runs: [
        {
          id: 'solo-run-9',
          name: 'Emerald Solo',
          createdAt: '2026-03-31T18:00:00.000Z',
          updatedAt: '2026-04-01T12:00:00.000Z',
          generationRules: 'current',
          teamCount: 0,
        },
      ],
    }
    repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
    repository.loadSoloRun.mockResolvedValue({
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })

    const { useSoloRunManager } = await import('../useSoloRunManager.js')
    const manager = useSoloRunManager()

    await manager.loadRunIndex()
    await manager.persistActiveRunSnapshot({
      team: [{ id: 'team-1', name: 'Mudkip' }],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })

    expect(repository.persistSoloRun).toHaveBeenCalledWith(
      'solo-run-9',
      expect.objectContaining({
        name: 'Emerald Solo',
        createdAt: '2026-03-31T18:00:00.000Z',
        generationRules: DEFAULT_GENERATION_RULESET,
        pinnedGym: null,
        defeatedGyms: [],
        team: [
          expect.objectContaining({
            id: 'team-1',
            name: 'Mudkip',
            types: ['water'],
            moves: [],
          }),
        ],
      }),
    )
    expect(repository.persistSoloRunIndex).toHaveBeenCalledWith({
      activeRunId: 'solo-run-9',
      runs: [
        expect.objectContaining({
          id: 'solo-run-9',
          name: 'Emerald Solo',
          teamCount: 1,
          createdAt: '2026-03-31T18:00:00.000Z',
          updatedAt: expect.any(String),
        }),
      ],
    })
  })

  describe('run index repair on load', () => {
    it('falls back to another valid run when active run snapshot is missing', async () => {
      const existingIndex = {
        activeRunId: 'missing-run',
        runs: [
          { id: 'missing-run', updatedAt: '2026-04-01T12:00:00.000Z' },
          { id: 'valid-run', updatedAt: '2026-03-31T12:00:00.000Z' },
        ],
      }
      repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
      repository.loadSoloRun.mockImplementation((id) =>
        id === 'valid-run'
          ? Promise.resolve({
              team: [{ id: 'team-1', name: 'Treecko' }],
              box: [],
              dead: [],
              defeatedGyms: [],
              pinnedGym: null,
              generationRules: 'current',
            })
          : Promise.resolve(null),
      )

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('valid-run')
      expect(repository.persistSoloRunIndex).toHaveBeenCalledWith(
        expect.objectContaining({ activeRunId: 'valid-run' }),
      )
    })

    it('repairs activeRunId when it does not match any entry in runs', async () => {
      const existingIndex = {
        activeRunId: 'orphaned-id',
        runs: [
          { id: 'run-a', updatedAt: '2026-04-01T12:00:00.000Z' },
          { id: 'run-b', updatedAt: '2026-03-31T12:00:00.000Z' },
        ],
      }
      repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
      repository.loadSoloRun.mockImplementation((id) =>
        id === 'run-a'
          ? Promise.resolve({
              team: [],
              box: [],
              dead: [],
              defeatedGyms: [],
              pinnedGym: null,
              generationRules: 'current',
            })
          : Promise.resolve(null),
      )

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('run-a')
      expect(repository.persistSoloRunIndex).toHaveBeenCalledWith(
        expect.objectContaining({ activeRunId: 'run-a' }),
      )
    })

    it('reinitializes from legacy data when all indexed snapshots are missing', async () => {
      const existingIndex = {
        activeRunId: 'gone-1',
        runs: [
          { id: 'gone-1', updatedAt: '2026-04-01T12:00:00.000Z' },
          { id: 'gone-2', updatedAt: '2026-03-31T12:00:00.000Z' },
        ],
      }
      repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
      repository.loadSoloRun.mockResolvedValue(null)
      repository.loadSoloRunSnapshot.mockResolvedValue({
        team: [{ id: 'team-1', name: 'Torchic' }],
        box: [],
        dead: [],
        defeatedGyms: [],
        pinnedGym: null,
        generationRules: 'current',
      })

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('solo-run-1')
      expect(repository.persistSoloRun).toHaveBeenCalledWith(
        'solo-run-1',
        expect.objectContaining({
          team: [expect.objectContaining({ name: 'Torchic' })],
        }),
      )
    })

    it('creates a default run when all snapshots and legacy data are missing', async () => {
      const existingIndex = {
        activeRunId: 'gone-1',
        runs: [{ id: 'gone-1', updatedAt: '2026-04-01T12:00:00.000Z' }],
      }
      repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
      repository.loadSoloRun.mockResolvedValue(null)

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('solo-run-1')
      expect(repository.persistSoloRun).toHaveBeenCalledWith(
        'solo-run-1',
        expect.objectContaining({
          team: [],
          box: [],
          dead: [],
          defeatedGyms: [],
          generationRules: DEFAULT_GENERATION_RULESET,
        }),
      )
    })

    it('reinitializes when index exists but runs array is empty', async () => {
      repository.loadSoloRunIndex.mockResolvedValue({
        activeRunId: null,
        runs: [],
      })

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('solo-run-1')
      expect(repository.persistSoloRun).toHaveBeenCalledWith(
        'solo-run-1',
        expect.objectContaining({ team: [] }),
      )
    })

    it('skips repair when active run snapshot is valid', async () => {
      const existingIndex = {
        activeRunId: 'solo-run-9',
        runs: [{ id: 'solo-run-9', updatedAt: '2026-04-01T12:00:00.000Z' }],
      }
      repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
      repository.loadSoloRun.mockResolvedValue({
        team: [],
        box: [],
        dead: [],
        defeatedGyms: [],
        pinnedGym: null,
        generationRules: 'current',
      })

      const { useSoloRunManager } = await import('../useSoloRunManager.js')
      const manager = useSoloRunManager()

      await manager.loadRunIndex()

      expect(manager.activeRunId.value).toBe('solo-run-9')
      expect(repository.persistSoloRunIndex).not.toHaveBeenCalled()
      expect(repository.persistSoloRun).not.toHaveBeenCalled()
    })
  })

  it('normalizes reactive solo snapshots before persisting them', async () => {
    const existingIndex = {
      activeRunId: 'solo-run-9',
      runs: [
        {
          id: 'solo-run-9',
          name: 'Emerald Solo',
          createdAt: '2026-03-31T18:00:00.000Z',
          updatedAt: '2026-04-01T12:00:00.000Z',
          generationRules: 'current',
          teamCount: 0,
        },
      ],
    }
    repository.loadSoloRunIndex.mockResolvedValue(existingIndex)
    repository.loadSoloRun.mockResolvedValue({
      team: [],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    })

    const { useSoloRunManager } = await import('../useSoloRunManager.js')
    const manager = useSoloRunManager()

    await manager.loadRunIndex()
    await manager.persistActiveRunSnapshot(
      reactive({
        team: reactive([{ id: 'team-1', name: 'Mudkip' }]),
        box: reactive([]),
        dead: reactive([]),
        defeatedGyms: reactive([]),
        pinnedGym: null,
        generationRules: 'current',
      }),
    )

    expect(repository.persistSoloRun).toHaveBeenCalledWith(
      'solo-run-9',
      expect.objectContaining({
        name: 'Emerald Solo',
        createdAt: '2026-03-31T18:00:00.000Z',
        generationRules: DEFAULT_GENERATION_RULESET,
        pinnedGym: null,
        defeatedGyms: [],
        team: [
          expect.objectContaining({
            id: 'team-1',
            name: 'Mudkip',
            types: ['water'],
            moves: [],
          }),
        ],
        box: [],
        dead: [],
      }),
    )
  })
})

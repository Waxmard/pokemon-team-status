import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    loadSoulLinkRunIndex: vi.fn(),
    loadSoulLinkSnapshot: vi.fn(),
    persistSoulLinkRun: vi.fn(),
    persistSoulLinkRunIndex: vi.fn(),
  },
}))

vi.mock('../../services/localRunRepository.js', () => ({
  createLocalSoloRunRepository: () => repository,
}))

describe('useSoulLinkRunManager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'soul-run-1') })

    repository.loadSoulLinkRunIndex.mockResolvedValue(null)
    repository.loadSoulLinkSnapshot.mockResolvedValue(null)
    repository.persistSoulLinkRun.mockResolvedValue(undefined)
    repository.persistSoulLinkRunIndex.mockResolvedValue(undefined)
  })

  it('uses the existing Soul Link run index when one is present', async () => {
    const existingIndex = {
      activeRunId: 'soul-run-9',
      runs: [{ id: 'soul-run-9', updatedAt: '2026-04-01T12:00:00.000Z' }],
    }
    repository.loadSoulLinkRunIndex.mockResolvedValue(existingIndex)

    const { useSoulLinkRunManager } = await import(
      '../useSoulLinkRunManager.js'
    )
    const manager = useSoulLinkRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBe('soul-run-9')
    expect(manager.activeRunSummary.value).toEqual(existingIndex.runs[0])
    expect(repository.loadSoulLinkSnapshot).not.toHaveBeenCalled()
    expect(repository.persistSoulLinkRun).not.toHaveBeenCalled()
    expect(repository.persistSoulLinkRunIndex).not.toHaveBeenCalled()
  })

  it('migrates a legacy Soul Link snapshot into the first indexed run', async () => {
    repository.loadSoulLinkSnapshot.mockResolvedValue({
      metadata: {
        name: 'Emerald Pair',
        sessionId: 'session-1',
        inviteCode: 'PAIR42',
        createdAt: '2026-03-31T20:00:00.000Z',
      },
      players: [
        { id: 'local', name: 'Max' },
        { id: 'partner', name: 'Ava' },
      ],
      rosters: {},
      progress: {},
      local: {},
      sync: {},
      activity: {},
      generationRules: 'current',
    })

    const { useSoulLinkRunManager } = await import(
      '../useSoulLinkRunManager.js'
    )
    const manager = useSoulLinkRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBe('soul-run-1')
    expect(repository.persistSoulLinkRun).toHaveBeenCalledWith(
      'soul-run-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'Emerald Pair',
          sessionId: 'session-1',
        }),
      }),
    )
    expect(repository.persistSoulLinkRunIndex).toHaveBeenCalledWith({
      activeRunId: 'soul-run-1',
      runs: [
        expect.objectContaining({
          id: 'soul-run-1',
          name: 'Emerald Pair',
          playerNames: ['Max', 'Ava'],
        }),
      ],
    })
  })

  it('does not create a blank Soul Link run when storage is empty', async () => {
    const { useSoulLinkRunManager } = await import(
      '../useSoulLinkRunManager.js'
    )
    const manager = useSoulLinkRunManager()

    await manager.loadRunIndex()

    expect(manager.activeRunId.value).toBeNull()
    expect(manager.activeRunSummary.value).toBeNull()
    expect(repository.persistSoulLinkRun).not.toHaveBeenCalled()
    expect(repository.persistSoulLinkRunIndex).not.toHaveBeenCalled()
  })
})

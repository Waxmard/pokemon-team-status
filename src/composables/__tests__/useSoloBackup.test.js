import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, remoteRepository } = vi.hoisted(() => ({
  repository: {
    loadSoloBackupSessionId: vi.fn(),
    persistSoloBackupSessionId: vi.fn(),
  },
  remoteRepository: {
    fetchSessionById: vi.fn(),
    createSession: vi.fn(),
    pushSessionState: vi.fn(),
  },
}))

vi.mock('../../services/localRunRepository.js', () => ({
  createLocalSoloRunRepository: () => repository,
}))

vi.mock('../../services/supabaseClient.js', () => ({
  supabase: {},
}))

vi.mock('../../services/supabaseRepository.js', () => ({
  createSupabaseRepository: () => remoteRepository,
}))

describe('useSoloBackup', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'backup-session-1') })

    repository.loadSoloBackupSessionId.mockResolvedValue(null)
    repository.persistSoloBackupSessionId.mockResolvedValue(undefined)
    remoteRepository.fetchSessionById.mockResolvedValue(null)
    remoteRepository.createSession.mockResolvedValue({
      id: 'backup-session-1',
      version: 1,
    })
    remoteRepository.pushSessionState.mockResolvedValue({
      success: true,
      version: 2,
    })
  })

  it('creates a backup session with a non-null initial snapshot', async () => {
    const { useSoloBackup } = await import('../useSoloBackup.js')
    const backup = useSoloBackup()
    const snapshot = {
      team: [{ id: 'team-1', name: 'Mudkip' }],
      box: [],
      dead: [],
      defeatedGyms: [],
      pinnedGym: null,
      generationRules: 'current',
    }

    await backup.initBackupSession(() => snapshot)

    expect(remoteRepository.createSession).toHaveBeenCalledWith({
      sessionId: 'backup-session-1',
      inviteCode: 'solo-b',
      state: snapshot,
    })
  })

  it('does not create a backup session when no snapshot is available yet', async () => {
    const { useSoloBackup } = await import('../useSoloBackup.js')
    const backup = useSoloBackup()

    await backup.initBackupSession(() => null)

    expect(remoteRepository.createSession).not.toHaveBeenCalled()
  })
})

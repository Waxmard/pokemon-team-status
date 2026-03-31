import { ref } from 'vue'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import { supabase } from '../services/supabaseClient.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'

const repository = createLocalSoloRunRepository()
const remoteRepository = supabase ? createSupabaseRepository() : null

let _backupScheduled = false
let _getSnapshotFn = null
let _sessionId = null
let _version = 0

const backupStatus = ref('idle')

async function initSession() {
  if (!remoteRepository) return

  const storedId = await repository.loadSoloBackupSessionId()
  if (storedId) {
    try {
      const session = await remoteRepository.fetchSessionById(storedId)
      if (session) {
        _sessionId = storedId
        _version = session.version
        return
      }
    } catch {
      // Session was deleted remotely, create a new one
    }
  }

  // Create a new backup session
  const sessionId = crypto.randomUUID()
  const inviteCode = 'solo-b'
  await remoteRepository.createSession({
    sessionId,
    inviteCode,
    state: null,
  })
  _sessionId = sessionId
  _version = 1
  await repository.persistSoloBackupSessionId(sessionId)
}

async function pushBackup() {
  if (!remoteRepository || !_sessionId || !_getSnapshotFn) return

  backupStatus.value = 'backing-up'
  try {
    const snapshot = _getSnapshotFn()

    // Fetch current version before pushing (in case it was updated elsewhere)
    const session = await remoteRepository.fetchSessionById(_sessionId)
    if (session) {
      _version = session.version
    } else {
      // Session was deleted, recreate
      _sessionId = null
      await initSession()
      if (!_sessionId) return
    }

    const result = await remoteRepository.pushSessionState(
      _sessionId,
      snapshot,
      _version,
    )

    if (result.success) {
      _version = result.version
      backupStatus.value = 'idle'
    } else {
      // Version conflict — refetch and retry once
      const freshSession = await remoteRepository.fetchSessionById(_sessionId)
      if (freshSession) {
        _version = freshSession.version
        const retry = await remoteRepository.pushSessionState(
          _sessionId,
          snapshot,
          _version,
        )
        if (retry.success) {
          _version = retry.version
        }
      }
      backupStatus.value = 'idle'
    }
  } catch (err) {
    console.error('Solo backup failed:', err)
    backupStatus.value = 'error'
  }
}

export function useSoloBackup() {
  function scheduleBackup() {
    if (_backupScheduled || !remoteRepository) return

    _backupScheduled = true
    queueMicrotask(() => {
      _backupScheduled = false
      pushBackup().catch((err) =>
        console.error('Scheduled solo backup failed:', err),
      )
    })
  }

  async function initBackupSession(getSnapshotFn) {
    _getSnapshotFn = getSnapshotFn
    if (!remoteRepository) return
    await initSession()
  }

  async function restore() {
    if (!remoteRepository || !_sessionId) return null

    backupStatus.value = 'restoring'
    try {
      const session = await remoteRepository.fetchSessionById(_sessionId)
      if (!session?.state) {
        backupStatus.value = 'idle'
        return null
      }
      _version = session.version
      backupStatus.value = 'idle'
      return session.state
    } catch (err) {
      console.error('Solo restore failed:', err)
      backupStatus.value = 'error'
      return null
    }
  }

  return {
    backupStatus,
    scheduleBackup,
    initBackupSession,
    restore,
  }
}

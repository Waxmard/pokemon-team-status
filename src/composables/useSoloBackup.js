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

function getCurrentSnapshot() {
  if (!_getSnapshotFn) return null

  try {
    return _getSnapshotFn() ?? null
  } catch {
    return null
  }
}

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
  const snapshot = getCurrentSnapshot()
  if (!snapshot) return

  const sessionId = crypto.randomUUID()
  const inviteCode = 'solo-b'
  await remoteRepository.createSession({
    sessionId,
    inviteCode,
    state: snapshot,
  })
  _sessionId = sessionId
  _version = 1
  await repository.persistSoloBackupSessionId(sessionId)
}

async function ensureSession(snapshot) {
  if (_sessionId) return true

  await initSession()
  if (!_sessionId || !snapshot) return false

  return true
}

async function syncBackupVersion() {
  const session = await remoteRepository.fetchSessionById(_sessionId)
  if (session) {
    _version = session.version
    return true
  }

  _sessionId = null
  return false
}

async function pushBackupSnapshot(snapshot) {
  const result = await remoteRepository.pushSessionState(
    _sessionId,
    snapshot,
    _version,
  )

  if (result.success) {
    _version = result.version
    return
  }

  const freshSession = await remoteRepository.fetchSessionById(_sessionId)
  if (!freshSession) return

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

async function pushBackup() {
  if (!remoteRepository || !_getSnapshotFn) return

  backupStatus.value = 'backing-up'
  try {
    const snapshot = getCurrentSnapshot()
    if (!snapshot) {
      backupStatus.value = 'idle'
      return
    }

    const hasSession = await ensureSession(snapshot)
    if (!hasSession) {
      backupStatus.value = 'idle'
      return
    }

    const hasFreshVersion = await syncBackupVersion()
    if (!hasFreshVersion) {
      const recreatedSession = await ensureSession(snapshot)
      if (!recreatedSession) {
        backupStatus.value = 'idle'
        return
      }
      const refreshedVersion = await syncBackupVersion()
      if (!refreshedVersion) {
        backupStatus.value = 'idle'
        return
      }
    }

    await pushBackupSnapshot(snapshot)
    backupStatus.value = 'idle'
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

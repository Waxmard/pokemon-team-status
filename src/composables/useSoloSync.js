import { ref } from 'vue'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import { supabase } from '../services/supabaseClient.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'
import {
  buildSoloRemotePayload,
  mergeSoloRemoteState,
} from '../utils/soloMergeModel.js'
import { generateInviteCode } from '../utils/soulLinkModel.js'
import { generateUUID } from '../utils/uuid.js'
import { createSessionSync } from './useSessionSync.js'

const repository = createLocalSoloRunRepository()
const remoteRepository = supabase ? createSupabaseRepository() : null

let _getSnapshotFn = null
let _applySnapshotFn = null
let _sessionId = null
let _version = 0

const syncStatus = ref('idle')
const sessionId = ref(null)
const inviteCode = ref(null)

function getCurrentSnapshot() {
  if (!_getSnapshotFn) return null
  try {
    return _getSnapshotFn() ?? null
  } catch {
    return null
  }
}

function applySnapshot(merged) {
  _applySnapshotFn?.(merged)
}

const sync = createSessionSync({
  getSessionId: () => _sessionId,
  getVersion: () => _version,
  setVersion: (v) => {
    _version = v
  },
  getLocalState: () => getCurrentSnapshot(),
  setLocalState: (merged) => applySnapshot(merged),
  buildRemotePayload: () => buildSoloRemotePayload(getCurrentSnapshot()),
  mergeRemote: (local, remote) => mergeSoloRemoteState(local, remote),
})

async function loadStoredSession() {
  if (!remoteRepository) return null

  const storedId = await repository.loadSoloBackupSessionId()
  if (!storedId) return null

  try {
    const session = await remoteRepository.fetchSessionById(storedId)
    if (session) {
      _sessionId = storedId
      _version = session.version
      sessionId.value = storedId
      inviteCode.value = session.inviteCode
      return session
    }
  } catch {
    // Session was deleted remotely
  }

  return null
}

export function useSoloSync() {
  async function initSyncSession(getSnapshotFn, applySnapshotFn) {
    _getSnapshotFn = getSnapshotFn
    _applySnapshotFn = applySnapshotFn
    if (!remoteRepository) return

    const existing = await loadStoredSession()
    if (existing) return
    await createSession()
  }

  async function createSession() {
    if (!remoteRepository) return null

    const snapshot = getCurrentSnapshot()
    if (!snapshot) return null

    const newSessionId = generateUUID()
    const code = generateInviteCode()
    const payload = buildSoloRemotePayload(snapshot)

    try {
      const session = await remoteRepository.createSession({
        sessionId: newSessionId,
        inviteCode: code,
        state: payload,
      })

      _sessionId = session.id
      _version = session.version
      sessionId.value = session.id
      inviteCode.value = session.inviteCode
      await repository.persistSoloBackupSessionId(session.id)

      return { sessionId: session.id, inviteCode: session.inviteCode }
    } catch (err) {
      console.error('Failed to create solo session:', err)
      return null
    }
  }

  async function joinSession(code) {
    if (!remoteRepository) {
      throw new Error('Remote sync is not available.')
    }

    const normalizedCode = code.toUpperCase().trim()
    const session =
      await remoteRepository.fetchSessionByInviteCode(normalizedCode)

    if (!session) {
      throw new Error('No session found with that invite code.')
    }

    _sessionId = session.id
    _version = session.version
    sessionId.value = session.id
    inviteCode.value = session.inviteCode
    await repository.persistSoloBackupSessionId(session.id)

    // Replace local state with remote — joining adopts the remote run's data
    if (session.state) {
      applySnapshot(session.state)
    }

    return { sessionId: session.id, inviteCode: session.inviteCode }
  }

  async function deleteRemoteSession() {
    if (!remoteRepository || !_sessionId) return

    try {
      await remoteRepository.deleteSession(_sessionId)
    } catch (err) {
      console.error('Failed to delete solo session:', err)
    }

    _sessionId = null
    _version = 0
    sessionId.value = null
    inviteCode.value = null
    await repository.persistSoloBackupSessionId(null)
  }

  return {
    syncStatus,
    sessionId,
    inviteCode,
    isAvailable: sync.isAvailable,
    initSyncSession,
    createSession,
    joinSession,
    deleteRemoteSession,
    scheduleAutoSync: sync.scheduleAutoSync,
    pushState: sync.pushState,
    pullState: sync.pullState,
    syncSession: sync.syncSession,
    subscribeToSession: sync.subscribeToSession,
    unsubscribeFromSession: sync.unsubscribeFromSession,
    withSyncSuppressed: sync.withSyncSuppressed,
  }
}

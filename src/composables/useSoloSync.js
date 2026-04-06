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

// Kept for legacy migration only — new sessions use per-run callbacks
const legacyRepository = createLocalSoloRunRepository()
const remoteRepository = supabase ? createSupabaseRepository() : null

let _getSnapshotFn = null
let _applySnapshotFn = null
let _loadSessionId = null
let _saveSessionId = null
let _sessionId = null
let _version = 0

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

  // Try per-run session ID first
  let storedId = _loadSessionId?.() ?? null

  // Fall back to legacy global session ID for migration
  if (!storedId) {
    storedId = await legacyRepository.loadSoloBackupSessionId()
  }

  if (!storedId) return null

  try {
    const session = await remoteRepository.fetchSessionById(storedId)
    if (session) {
      _sessionId = storedId
      _version = session.version
      sessionId.value = storedId
      inviteCode.value = session.inviteCode

      // Migrate legacy global key to per-run storage
      await _saveSessionId?.(session.id, session.inviteCode)
      await legacyRepository.persistSoloBackupSessionId(null)

      return session
    }
  } catch {
    // Session was deleted remotely
  }

  // Clear stale legacy key if it existed
  await legacyRepository.persistSoloBackupSessionId(null)
  return null
}

export function useSoloSync() {
  async function initSyncSession(
    getSnapshotFn,
    applySnapshotFn,
    { loadSessionId, saveSessionId } = {},
  ) {
    _getSnapshotFn = getSnapshotFn
    _applySnapshotFn = applySnapshotFn
    _loadSessionId = loadSessionId ?? null
    _saveSessionId = saveSessionId ?? null
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
      await _saveSessionId?.(session.id, session.inviteCode)

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
    // NOTE: caller handles persisting session ID to the correct run entry
    // after registering the new run (see handleSoloJoinSession in App.vue)

    // Replace local state with remote — joining adopts the remote run's data
    if (session.state) {
      applySnapshot(session.state)
    }

    return {
      sessionId: session.id,
      inviteCode: session.inviteCode,
      state: session.state ?? null,
    }
  }

  async function leaveSession() {
    sync.unsubscribeFromSession()
    _sessionId = null
    _version = 0
    sessionId.value = null
    inviteCode.value = null
    await _saveSessionId?.(null, null)
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
    await _saveSessionId?.(null, null)
  }

  return {
    sessionId,
    inviteCode,
    isAvailable: sync.isAvailable,
    initSyncSession,
    createSession,
    joinSession,
    leaveSession,
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

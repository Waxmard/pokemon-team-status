import { supabase } from '../services/supabaseClient.js'
import { createSupabaseRepository } from '../services/supabaseRepository.js'

let _supabaseRepo = null
function getSupabaseRepository() {
  if (!_supabaseRepo) _supabaseRepo = createSupabaseRepository()
  return _supabaseRepo
}

/**
 * Realtime bidirectional session sync with Supabase; shared by solo and soul link modes.
 *
 * @param {Object} config
 * @param {() => string|null} config.getSessionId
 * @param {() => number} config.getVersion
 * @param {(version: number) => void} config.setVersion
 * @param {() => object} config.getLocalState
 * @param {(merged: object) => void} config.setLocalState
 * @param {() => object} config.buildRemotePayload
 * @param {(localState: object, remoteState: object) => object} config.mergeRemote
 * @param {(session: object) => void} [config.onRemoteUpdate] - extra work after applying a realtime update
 */
export function createSessionSync(config) {
  let _unsubscribe = null
  let _lastPushedVersion = 0
  let _suppressAutoSync = false
  let _autoSyncScheduled = false

  function withSyncSuppressed(fn) {
    const prev = _suppressAutoSync
    _suppressAutoSync = true
    try {
      return fn()
    } finally {
      _suppressAutoSync = prev
    }
  }

  async function withSyncSuppressedAsync(fn) {
    const prev = _suppressAutoSync
    _suppressAutoSync = true
    try {
      return await fn()
    } finally {
      _suppressAutoSync = prev
    }
  }

  function scheduleAutoSync() {
    if (_suppressAutoSync || _autoSyncScheduled) return
    const scheduledSessionId = config.getSessionId()
    if (!scheduledSessionId) return

    _autoSyncScheduled = true
    queueMicrotask(() => {
      _autoSyncScheduled = false
      if (_suppressAutoSync) return
      if (config.getSessionId() !== scheduledSessionId) return
      pushState().catch((err) => console.error('Auto-sync failed:', err))
    })
  }

  async function pushState() {
    return withSyncSuppressedAsync(async () => {
      const sessionId = config.getSessionId()
      if (!sessionId) return

      const repo = getSupabaseRepository()
      const remotePayload = config.buildRemotePayload()
      const expectedVersion = config.getVersion()

      const result = await repo.pushSessionState(
        sessionId,
        remotePayload,
        expectedVersion,
      )

      if (result.success) {
        _lastPushedVersion = result.version
        config.setVersion(result.version)
        return
      }

      // Version conflict — fetch current, merge, retry once
      const session = await repo.fetchSessionById(sessionId)
      if (!session) return

      const currentState = config.getLocalState()
      const merged = config.mergeRemote(currentState, session.state)
      config.setLocalState(merged)
      config.setVersion(session.version)

      const refreshedPayload = config.buildRemotePayload()
      const refreshedVersion = config.getVersion()
      const retryResult = await repo.pushSessionState(
        sessionId,
        refreshedPayload,
        refreshedVersion,
      )

      if (retryResult.success) {
        _lastPushedVersion = retryResult.version
        config.setVersion(retryResult.version)
      }
    })
  }

  async function pullState() {
    return withSyncSuppressedAsync(async () => {
      const sessionId = config.getSessionId()
      if (!sessionId) return

      const repo = getSupabaseRepository()
      const session = await repo.fetchSessionById(sessionId)
      if (!session) return

      const currentState = config.getLocalState()
      const merged = config.mergeRemote(currentState, session.state)
      config.setLocalState(merged)
      config.setVersion(session.version)
    })
  }

  async function syncSession() {
    const sessionId = config.getSessionId()
    if (!sessionId) return

    try {
      await pullState()
      await pushState()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  function subscribeToSession() {
    unsubscribeFromSession()

    const sessionId = config.getSessionId()
    if (!sessionId) return

    const repo = getSupabaseRepository()
    _unsubscribe = repo.subscribeToSession(sessionId, (session) => {
      if (session.version <= _lastPushedVersion) return
      withSyncSuppressed(() => {
        const currentState = config.getLocalState()
        const merged = config.mergeRemote(currentState, session.state)
        config.setLocalState(merged)
        config.setVersion(session.version)
        config.onRemoteUpdate?.(session)
      })
    })
  }

  function unsubscribeFromSession() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
  }

  return {
    get isAvailable() {
      return !!supabase
    },
    scheduleAutoSync,
    pushState,
    pullState,
    syncSession,
    subscribeToSession,
    unsubscribeFromSession,
    withSyncSuppressed,
    withSyncSuppressedAsync,
  }
}

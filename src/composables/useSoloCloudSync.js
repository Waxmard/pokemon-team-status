import { computed, watch } from 'vue'
import { createAuthRepository } from '../services/authRepository.js'
import { supabase } from '../services/supabaseClient.js'
import { mapSoloRunStateToPersistedSnapshot } from '../utils/runSnapshot.js'
import { useAuthStore } from './useAuthStore.js'
import { useRunStore } from './useRunStore.js'

let _authRepo = null
function getAuthRepository() {
  if (!_authRepo) _authRepo = createAuthRepository()
  return _authRepo
}

let _debounceTimer = null
let _remoteVersion = null

async function applyRemoteSnapshot(runStore, remoteSnapshot) {
  await runStore.persistTeam(remoteSnapshot.team ?? [])
  await runStore.persistBox(remoteSnapshot.box ?? [])
  await runStore.persistDefeatedGyms(remoteSnapshot.defeatedGyms ?? [])
  await runStore.persistPinnedGym(remoteSnapshot.pinnedGym ?? null)
  if (remoteSnapshot.generationRules) {
    await runStore.persistGenerationRules(remoteSnapshot.generationRules)
  }
}

function isRemoteNewer(localSnapshot, remote) {
  const localUpdated = new Date(localSnapshot.updatedAt || 0).getTime()
  const remoteUpdated = new Date(remote.updatedAt || 0).getTime()
  return remoteUpdated > localUpdated && !!remote.state
}

export function useSoloCloudSync() {
  const authStore = useAuthStore()
  const runStore = useRunStore()

  const isActive = computed(() => !!supabase && authStore.isAuthenticated.value)

  async function pullAndReconcile() {
    if (!isActive.value) return

    const userId = authStore.user.value.id
    try {
      const remote = await getAuthRepository().fetchSoloRun(userId)
      if (!remote) {
        _remoteVersion = null
        await pushCurrentState()
        return
      }

      _remoteVersion = remote.version

      const localSnapshot = mapSoloRunStateToPersistedSnapshot(
        runStore.runState.value,
      )

      if (isRemoteNewer(localSnapshot, remote)) {
        await applyRemoteSnapshot(runStore, remote.state)
      } else {
        await pushCurrentState()
      }
    } catch (error) {
      console.error('Solo cloud sync pull failed:', error)
    }
  }

  async function pushCurrentState() {
    if (!isActive.value) return

    const userId = authStore.user.value.id
    const snapshot = mapSoloRunStateToPersistedSnapshot(runStore.runState.value)

    try {
      const result = await getAuthRepository().upsertSoloRun(
        userId,
        snapshot,
        _remoteVersion,
      )
      if (result) {
        _remoteVersion = result.version
      }
    } catch (error) {
      console.error('Solo cloud sync push failed:', error)
    }
  }

  function debouncedPush() {
    if (!isActive.value) return
    clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(pushCurrentState, 2000)
  }

  function startWatching() {
    watch(
      () => runStore.runState.value,
      () => debouncedPush(),
      { deep: true },
    )

    watch(
      () => authStore.isAuthenticated.value,
      (authenticated) => {
        if (authenticated) pullAndReconcile()
      },
    )
  }

  return {
    pullAndReconcile,
    pushCurrentState,
    startWatching,
  }
}

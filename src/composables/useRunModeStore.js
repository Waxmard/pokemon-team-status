import { computed, ref } from 'vue'
import { RUN_MODES } from '../utils/runSnapshot.js'

const RUN_MODE_STORAGE_KEY = 'pokemon-team-status:run-mode'
const currentRunMode = ref(RUN_MODES.SOLO)

function normalizeRunMode(mode) {
  return mode === RUN_MODES.SOUL_LINK ? RUN_MODES.SOUL_LINK : RUN_MODES.SOLO
}

function getLocalStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function useRunModeStore() {
  function loadCurrentRunMode() {
    const storedMode = getLocalStorage()?.getItem(RUN_MODE_STORAGE_KEY)
    const nextMode = normalizeRunMode(storedMode)

    currentRunMode.value = nextMode

    return nextMode
  }

  function persistCurrentRunMode(mode) {
    const nextMode = normalizeRunMode(mode)

    currentRunMode.value = nextMode
    getLocalStorage()?.setItem(RUN_MODE_STORAGE_KEY, nextMode)

    return nextMode
  }

  function setCurrentRunMode(mode) {
    return persistCurrentRunMode(mode)
  }

  return {
    currentRunMode: computed(() => currentRunMode.value),
    loadCurrentRunMode,
    persistCurrentRunMode,
    setCurrentRunMode,
  }
}

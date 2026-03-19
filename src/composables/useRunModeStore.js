import { computed, ref } from 'vue'
import { RUN_MODES } from '../utils/runSnapshot.js'

const currentRunMode = ref(RUN_MODES.SOLO)

export function useRunModeStore() {
  function setCurrentRunMode(mode) {
    currentRunMode.value =
      mode === RUN_MODES.SOUL_LINK ? RUN_MODES.SOUL_LINK : RUN_MODES.SOLO
  }

  return {
    currentRunMode: computed(() => currentRunMode.value),
    setCurrentRunMode,
  }
}

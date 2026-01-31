import { onUnmounted, ref } from 'vue'

const DEFAULT_DURATION = 500 // ms

/**
 * Composable for handling long press interactions
 * @param {Function} onLongPress - Callback when long press is triggered
 * @param {number} duration - Duration in ms before long press triggers
 */
export function useLongPress(onLongPress, duration = DEFAULT_DURATION) {
  let longPressTimer = null
  const longPressFired = ref(false)

  function startLongPress() {
    longPressFired.value = false
    longPressTimer = setTimeout(() => {
      onLongPress()
      longPressFired.value = true
      longPressTimer = null
    }, duration)
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handleTouchEnd(onClick) {
    // If timer is still active, this was a quick tap (not a long press)
    if (longPressTimer) {
      cancelLongPress()
      onClick?.()
    }
    // If timer already fired (longPressTimer is null), long press already triggered - do nothing
  }

  // Clean up timer on unmount
  onUnmounted(() => {
    cancelLongPress()
  })

  return {
    longPressFired,
    startLongPress,
    cancelLongPress,
    handleTouchEnd,
  }
}

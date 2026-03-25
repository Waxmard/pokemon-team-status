import { computed, ref, watch } from 'vue'

export function useWizardNavigation(steps, canAdvance) {
  const currentStep = ref(steps.value[0])

  watch(steps, () => {
    currentStep.value = steps.value[0]
  })

  const canGoPrevious = computed(() => currentStep.value !== steps.value[0])
  const canGoNext = computed(() => canAdvance(currentStep.value))

  function goToNext() {
    const currentIndex = steps.value.indexOf(currentStep.value)
    if (currentIndex < steps.value.length - 1) {
      currentStep.value = steps.value[currentIndex + 1]
    }
  }

  function goToPrevious() {
    const currentIndex = steps.value.indexOf(currentStep.value)
    if (currentIndex > 0) {
      currentStep.value = steps.value[currentIndex - 1]
    }
  }

  function reset() {
    currentStep.value = steps.value[0]
  }

  return {
    currentStep,
    canGoPrevious,
    canGoNext,
    goToNext,
    goToPrevious,
    reset,
  }
}

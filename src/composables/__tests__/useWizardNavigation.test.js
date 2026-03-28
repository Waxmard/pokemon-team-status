import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useWizardNavigation } from '../useWizardNavigation.js'

describe('useWizardNavigation', () => {
  let steps
  let canAdvanceFn
  let nav

  beforeEach(() => {
    steps = ref(['pokemon', 'ability', 'moves', 'confirm'])
    canAdvanceFn = vi.fn(() => true)
    nav = useWizardNavigation(steps, canAdvanceFn)
  })

  it('starts on the first step', () => {
    expect(nav.currentStep.value).toBe('pokemon')
  })

  it('canGoPrevious is false on the first step', () => {
    expect(nav.canGoPrevious.value).toBe(false)
  })

  it('canGoNext delegates to the canAdvance callback', () => {
    // canAdvance is called with current step; initial mock returns true
    expect(nav.canGoNext.value).toBe(true)
    expect(canAdvanceFn).toHaveBeenCalledWith('pokemon')
  })

  it('canGoNext returns false when canAdvance returns false', () => {
    canAdvanceFn = vi.fn(() => false)
    nav = useWizardNavigation(steps, canAdvanceFn)
    expect(nav.canGoNext.value).toBe(false)
  })

  describe('goToNext', () => {
    it('advances to the next step', () => {
      nav.goToNext()
      expect(nav.currentStep.value).toBe('ability')
    })

    it('advances through multiple steps', () => {
      nav.goToNext()
      nav.goToNext()
      expect(nav.currentStep.value).toBe('moves')
    })

    it('does not advance past the last step', () => {
      nav.goToNext()
      nav.goToNext()
      nav.goToNext()
      expect(nav.currentStep.value).toBe('confirm')

      nav.goToNext()
      expect(nav.currentStep.value).toBe('confirm')
    })
  })

  describe('goToPrevious', () => {
    it('goes back to the previous step', () => {
      nav.goToNext()
      nav.goToNext()
      nav.goToPrevious()
      expect(nav.currentStep.value).toBe('ability')
    })

    it('does not go before the first step', () => {
      nav.goToPrevious()
      expect(nav.currentStep.value).toBe('pokemon')
    })
  })

  it('canGoPrevious becomes true after advancing', () => {
    nav.goToNext()
    expect(nav.canGoPrevious.value).toBe(true)
  })

  describe('reset', () => {
    it('returns to the first step', () => {
      nav.goToNext()
      nav.goToNext()
      nav.reset()
      expect(nav.currentStep.value).toBe('pokemon')
    })
  })

  describe('steps watcher', () => {
    it('resets to first step when steps ref changes', async () => {
      nav.goToNext()
      nav.goToNext()
      expect(nav.currentStep.value).toBe('moves')

      steps.value = ['step-a', 'step-b']
      await nextTick()

      expect(nav.currentStep.value).toBe('step-a')
    })
  })
})

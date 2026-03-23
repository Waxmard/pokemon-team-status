import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RUN_MODES } from '../../utils/runSnapshot.js'
import { useRunModeStore } from '../useRunModeStore.js'

describe('useRunModeStore', () => {
  beforeEach(() => {
    const storage = new Map()

    vi.stubGlobal('localStorage', {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null
      },
      setItem(key, value) {
        storage.set(key, String(value))
      },
      removeItem(key) {
        storage.delete(key)
      },
      clear() {
        storage.clear()
      },
    })

    useRunModeStore().persistCurrentRunMode(RUN_MODES.SOLO)
  })

  it('defaults to solo when no persisted mode exists', () => {
    const store = useRunModeStore()

    globalThis.localStorage.clear()

    expect(store.loadCurrentRunMode()).toBe(RUN_MODES.SOLO)
    expect(store.currentRunMode.value).toBe(RUN_MODES.SOLO)
  })

  it('loads a persisted soul link mode from local storage', () => {
    const store = useRunModeStore()

    globalThis.localStorage.setItem('pokemon-team-status:run-mode', 'soul-link')

    expect(store.loadCurrentRunMode()).toBe(RUN_MODES.SOUL_LINK)
    expect(store.currentRunMode.value).toBe(RUN_MODES.SOUL_LINK)
  })

  it('persists normalized mode updates through the shared setter', () => {
    const store = useRunModeStore()

    store.setCurrentRunMode('invalid-mode')
    expect(
      globalThis.localStorage.getItem('pokemon-team-status:run-mode'),
    ).toBe(RUN_MODES.SOLO)

    store.setCurrentRunMode(RUN_MODES.SOUL_LINK)
    expect(store.currentRunMode.value).toBe(RUN_MODES.SOUL_LINK)
    expect(
      globalThis.localStorage.getItem('pokemon-team-status:run-mode'),
    ).toBe(RUN_MODES.SOUL_LINK)
  })
})

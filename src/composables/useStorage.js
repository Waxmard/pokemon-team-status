import { ref } from 'vue'
import {
  DEFAULT_GENERATION_RULESET,
  GENERATION_RULESETS,
} from '../data/types.js'
import {
  sanitizeDefeatedGymsForRules,
  sanitizePinnedGymForRules,
  sanitizePokemonCollectionForRules,
} from '../utils/generationRules.js'
import {
  prefetchAllSprites,
  prefetchBerrySprites,
  prefetchTypeIcons,
} from '../utils/spriteCache.js'

const DB_NAME = 'pokemon-team-calculator'
const DB_VERSION = 2

function openDBOnce() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('team')) {
        db.createObjectStore('team', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'name' })
      }
      if (!db.objectStoreNames.contains('box')) {
        db.createObjectStore('box', { keyPath: 'id' })
      }
    }
  })
}

async function openDB() {
  try {
    return await openDBOnce()
  } catch {
    await new Promise((r) => setTimeout(r, 100))
    return openDBOnce()
  }
}

// Generic helper to save an array of items to a store (clears and replaces all)
async function saveArrayToStore(storeName, items) {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)

  store.clear()
  const plainItems = JSON.parse(JSON.stringify(items))
  for (const item of plainItems) {
    store.add(item)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Generic helper to load all items from a store
async function loadArrayFromStore(storeName) {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Generic helper to save a single setting value
async function saveSetting(name, value) {
  const db = await openDB()
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')
  const plainValue = JSON.parse(JSON.stringify(value))
  store.put({ name, value: plainValue })

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Generic helper to load a single setting value
async function loadSetting(name, defaultValue = null) {
  const db = await openDB()
  const tx = db.transaction('settings', 'readonly')
  const store = tx.objectStore('settings')
  const request = store.get(name)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.value ?? defaultValue)
    request.onerror = () => reject(request.error)
  })
}

// Singleton state - shared across all calls
const team = ref([])
const defeatedGyms = ref([])
const box = ref([])
const pinnedGym = ref(null)
const generationRules = ref(DEFAULT_GENERATION_RULESET)
const loadError = ref(false)

function hasStateChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

export function useStorage() {
  async function loadData() {
    try {
      generationRules.value = await loadSetting(
        'generationRules',
        DEFAULT_GENERATION_RULESET,
      )

      const loadedTeam = await loadArrayFromStore('team')
      const loadedDefeatedGyms = await loadSetting('defeatedGyms', [])
      const loadedBox = await loadArrayFromStore('box')
      const loadedPinnedGym = await loadSetting('pinnedGym', null)

      const sanitizedTeam = sanitizePokemonCollectionForRules(
        loadedTeam,
        generationRules.value,
      )
      const sanitizedDefeatedGyms = sanitizeDefeatedGymsForRules(
        loadedDefeatedGyms,
        generationRules.value,
      )
      const sanitizedBox = sanitizePokemonCollectionForRules(
        loadedBox,
        generationRules.value,
      )
      const sanitizedPinnedGym = sanitizePinnedGymForRules(
        loadedPinnedGym,
        generationRules.value,
      )

      team.value = sanitizedTeam
      defeatedGyms.value = sanitizedDefeatedGyms
      box.value = sanitizedBox
      pinnedGym.value = sanitizedPinnedGym
      loadError.value = false

      const persistOperations = []
      if (hasStateChanged(loadedTeam, sanitizedTeam)) {
        persistOperations.push(saveArrayToStore('team', sanitizedTeam))
      }
      if (hasStateChanged(loadedDefeatedGyms, sanitizedDefeatedGyms)) {
        persistOperations.push(
          saveSetting('defeatedGyms', sanitizedDefeatedGyms),
        )
      }
      if (hasStateChanged(loadedBox, sanitizedBox)) {
        persistOperations.push(saveArrayToStore('box', sanitizedBox))
      }
      if (loadedPinnedGym !== sanitizedPinnedGym) {
        persistOperations.push(saveSetting('pinnedGym', sanitizedPinnedGym))
      }
      await Promise.all(persistOperations)

      // Pre-cache sprites (fire-and-forget)
      prefetchAllSprites()
      prefetchBerrySprites()
      prefetchTypeIcons()

      // Request persistent storage to prevent iOS eviction (fire-and-forget)
      navigator.storage?.persist?.()
    } catch (e) {
      console.error('Failed to load data:', e)
      loadError.value = true
    }
  }

  async function persistTeam(newTeam) {
    team.value = newTeam
    await saveArrayToStore('team', newTeam)
  }

  async function persistDefeatedGyms(newGyms) {
    defeatedGyms.value = newGyms
    await saveSetting('defeatedGyms', newGyms)
  }

  async function persistBox(newBox) {
    box.value = newBox
    await saveArrayToStore('box', newBox)
  }

  async function persistPinnedGym(gymType) {
    pinnedGym.value = gymType
    await saveSetting('pinnedGym', gymType)
  }

  async function persistGenerationRules(newRules) {
    const nextRules =
      newRules === GENERATION_RULESETS.PRE_GEN_6
        ? GENERATION_RULESETS.PRE_GEN_6
        : DEFAULT_GENERATION_RULESET

    const sanitizedTeam = sanitizePokemonCollectionForRules(
      team.value,
      nextRules,
    )
    const sanitizedBox = sanitizePokemonCollectionForRules(box.value, nextRules)
    const sanitizedDefeatedGyms = sanitizeDefeatedGymsForRules(
      defeatedGyms.value,
      nextRules,
    )
    const sanitizedPinnedGym = sanitizePinnedGymForRules(
      pinnedGym.value,
      nextRules,
    )

    generationRules.value = nextRules
    team.value = sanitizedTeam
    box.value = sanitizedBox
    defeatedGyms.value = sanitizedDefeatedGyms
    pinnedGym.value = sanitizedPinnedGym

    await Promise.all([
      saveSetting('generationRules', nextRules),
      saveArrayToStore('team', sanitizedTeam),
      saveArrayToStore('box', sanitizedBox),
      saveSetting('defeatedGyms', sanitizedDefeatedGyms),
      saveSetting('pinnedGym', sanitizedPinnedGym),
    ])
  }

  return {
    team,
    defeatedGyms,
    box,
    pinnedGym,
    generationRules,
    loadError,
    loadData,
    persistTeam,
    persistDefeatedGyms,
    persistBox,
    persistPinnedGym,
    persistGenerationRules,
  }
}

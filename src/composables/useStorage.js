import { ref } from 'vue'
import { prefetchAllSprites } from '../utils/spriteCache.js'

const DB_NAME = 'pokemon-team-calculator'
const DB_VERSION = 2

function openDB() {
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

export function useStorage() {
  async function loadData() {
    try {
      team.value = await loadArrayFromStore('team')
      defeatedGyms.value = await loadSetting('defeatedGyms', [])
      box.value = await loadArrayFromStore('box')
      pinnedGym.value = await loadSetting('pinnedGym', null)

      // Pre-cache all small sprites (fire-and-forget, ~2.5MB)
      prefetchAllSprites()
    } catch (e) {
      console.error('Failed to load data:', e)
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

  return {
    team,
    defeatedGyms,
    box,
    pinnedGym,
    loadData,
    persistTeam,
    persistDefeatedGyms,
    persistBox,
    persistPinnedGym,
  }
}

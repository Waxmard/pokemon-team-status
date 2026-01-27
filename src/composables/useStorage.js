import { ref } from 'vue'

const DB_NAME = 'pokemon-team-calculator'
const DB_VERSION = 1

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
    }
  })
}

async function saveTeam(team) {
  const db = await openDB()
  const tx = db.transaction('team', 'readwrite')
  const store = tx.objectStore('team')

  // Clear existing and add all
  store.clear()
  // Convert to plain objects to strip Vue reactivity
  const plainTeam = JSON.parse(JSON.stringify(team))
  for (const member of plainTeam) {
    store.add(member)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadTeam() {
  const db = await openDB()
  const tx = db.transaction('team', 'readonly')
  const store = tx.objectStore('team')
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async function saveDefeatedGyms(gyms) {
  const db = await openDB()
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')
  // Convert to plain array to strip Vue reactivity
  const plainGyms = JSON.parse(JSON.stringify(gyms))
  store.put({ name: 'defeatedGyms', value: plainGyms })

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadDefeatedGyms() {
  const db = await openDB()
  const tx = db.transaction('settings', 'readonly')
  const store = tx.objectStore('settings')
  const request = store.get('defeatedGyms')

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.value || [])
    request.onerror = () => reject(request.error)
  })
}

// Singleton state - shared across all calls
const team = ref([])
const defeatedGyms = ref([])
const isLoading = ref(true)

export function useStorage() {
  async function loadData() {
    try {
      isLoading.value = true
      team.value = await loadTeam()
      defeatedGyms.value = await loadDefeatedGyms()
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function persistTeam(newTeam) {
    team.value = newTeam
    await saveTeam(newTeam)
  }

  async function persistDefeatedGyms(newGyms) {
    defeatedGyms.value = newGyms
    await saveDefeatedGyms(newGyms)
  }

  return {
    team,
    defeatedGyms,
    isLoading,
    loadData,
    persistTeam,
    persistDefeatedGyms
  }
}

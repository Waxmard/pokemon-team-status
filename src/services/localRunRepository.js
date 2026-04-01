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
    await new Promise((resolve) => setTimeout(resolve, 100))
    return openDBOnce()
  }
}

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value))
}

async function saveArrayToStore(storeName, items) {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)

  store.clear()
  const plainItems = toPlainData(items)
  for (const item of plainItems) {
    store.add(item)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

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

async function saveSetting(name, value) {
  const db = await openDB()
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')

  store.put({ name, value: toPlainData(value) })

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

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

export function createLocalSoloRunRepository() {
  return {
    async loadSoloRunSnapshot(defaultGenerationRules) {
      const [team, defeatedGyms, box, dead, pinnedGym, generationRules] =
        await Promise.all([
          loadArrayFromStore('team'),
          loadSetting('defeatedGyms', []),
          loadArrayFromStore('box'),
          loadSetting('soloDead', []),
          loadSetting('pinnedGym', null),
          loadSetting('generationRules', defaultGenerationRules),
        ])

      return {
        team,
        box,
        dead,
        defeatedGyms,
        pinnedGym,
        generationRules,
      }
    },

    persistSoloTeam(team) {
      return saveArrayToStore('team', team)
    },

    persistSoloBox(box) {
      return saveArrayToStore('box', box)
    },

    persistSoloDefeatedGyms(defeatedGyms) {
      return saveSetting('defeatedGyms', defeatedGyms)
    },

    persistSoloPinnedGym(pinnedGym) {
      return saveSetting('pinnedGym', pinnedGym)
    },

    persistSoloGenerationRules(generationRules) {
      return saveSetting('generationRules', generationRules)
    },

    persistSoloDead(dead) {
      return saveSetting('soloDead', dead)
    },

    loadSoloBackupSessionId() {
      return loadSetting('soloBackupSessionId', null)
    },

    persistSoloBackupSessionId(id) {
      return saveSetting('soloBackupSessionId', id)
    },

    loadSoloRunIndex() {
      return loadSetting('soloRunIndex', null)
    },

    persistSoloRunIndex(index) {
      return saveSetting('soloRunIndex', index)
    },

    loadSoloRun(runId) {
      return loadSetting(`soloRun:${runId}`, null)
    },

    persistSoloRun(runId, snapshot) {
      return saveSetting(`soloRun:${runId}`, snapshot)
    },

    async deleteSoloRun(runId) {
      const db = await openDB()
      const tx = db.transaction('settings', 'readwrite')
      const store = tx.objectStore('settings')
      store.delete(`soloRun:${runId}`)
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },

    persistSoulLinkSnapshot(snapshot) {
      return saveSetting('soulLinkSnapshot', snapshot)
    },

    loadSoulLinkSnapshot() {
      return loadSetting('soulLinkSnapshot', null)
    },

    clearSoulLinkSnapshot() {
      return saveSetting('soulLinkSnapshot', null)
    },

    loadSoulLinkRunIndex() {
      return loadSetting('soulLinkRunIndex', null)
    },

    persistSoulLinkRunIndex(index) {
      return saveSetting('soulLinkRunIndex', index)
    },

    loadSoulLinkRun(runId) {
      return loadSetting(`soulLinkRun:${runId}`, null)
    },

    persistSoulLinkRun(runId, snapshot) {
      return saveSetting(`soulLinkRun:${runId}`, snapshot)
    },

    async deleteSoulLinkRun(runId) {
      const db = await openDB()
      const tx = db.transaction('settings', 'readwrite')
      const store = tx.objectStore('settings')
      store.delete(`soulLinkRun:${runId}`)
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

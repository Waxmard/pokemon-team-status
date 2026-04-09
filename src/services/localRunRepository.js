const DB_NAME = 'pokemon-team-calculator'
const DB_VERSION = 3

function openDBOnce() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const tx = event.target.transaction

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'name' })
      }

      // v3 migration: move team and box from object stores → settings JSON blobs
      if (event.oldVersion >= 1) {
        const settingsStore = tx.objectStore('settings')

        if (db.objectStoreNames.contains('team')) {
          const req = tx.objectStore('team').getAll()
          req.onsuccess = () => {
            settingsStore.put({ name: 'soloTeam', value: req.result || [] })
            db.deleteObjectStore('team')
          }
        }

        if (db.objectStoreNames.contains('box')) {
          const req = tx.objectStore('box').getAll()
          req.onsuccess = () => {
            settingsStore.put({ name: 'soloBox', value: req.result || [] })
            db.deleteObjectStore('box')
          }
        }
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
          loadSetting('soloTeam', []),
          loadSetting('defeatedGyms', []),
          loadSetting('soloBox', []),
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
      return saveSetting('soloTeam', team)
    },

    persistSoloBox(box) {
      return saveSetting('soloBox', box)
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

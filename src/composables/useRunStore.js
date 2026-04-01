import { computed, ref } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import {
  assertSoloRunState,
  createDefaultRunState,
  createDefaultSoloRunState,
  mapPersistedSoloSnapshotToRunState,
  mapSoloRunStateToPersistedSnapshot,
  normalizeGenerationRules,
  sanitizePersistedSoloRunSnapshot,
} from '../utils/runSnapshot.js'
import {
  prefetchAllSprites,
  prefetchBerrySprites,
  prefetchTypeIcons,
} from '../utils/spriteCache.js'
import { useSoloBackup } from './useSoloBackup.js'
import { useSoloRunManager } from './useSoloRunManager.js'

const repository = createLocalSoloRunRepository()
const { scheduleBackup } = useSoloBackup()
const { persistActiveRunSnapshot } = useSoloRunManager()
let queuedPersist = Promise.resolve()

function hasStateChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function getSoloRunState(context) {
  return assertSoloRunState(runState.value, context)
}

function setRunState(snapshot) {
  runState.value = mapPersistedSoloSnapshotToRunState(snapshot)
}

function enqueueSoloPersist(operation) {
  const nextPersist = queuedPersist.catch(() => {}).then(operation)
  queuedPersist = nextPersist
  return nextPersist
}

async function enqueueSoloPersistWithSnapshot(operation, snapshot) {
  return enqueueSoloPersist(async () => {
    await operation()
    await persistActiveRunSnapshot(snapshot)
  })
}

function getSanitizedSnapshotPersistOperations(
  loadedSnapshot,
  sanitizedSnapshot,
) {
  const persistOperations = []

  if (hasStateChanged(loadedSnapshot.team, sanitizedSnapshot.team)) {
    persistOperations.push(repository.persistSoloTeam(sanitizedSnapshot.team))
  }
  if (
    hasStateChanged(loadedSnapshot.defeatedGyms, sanitizedSnapshot.defeatedGyms)
  ) {
    persistOperations.push(
      repository.persistSoloDefeatedGyms(sanitizedSnapshot.defeatedGyms),
    )
  }
  if (hasStateChanged(loadedSnapshot.box, sanitizedSnapshot.box)) {
    persistOperations.push(repository.persistSoloBox(sanitizedSnapshot.box))
  }
  if (hasStateChanged(loadedSnapshot.dead ?? [], sanitizedSnapshot.dead)) {
    persistOperations.push(repository.persistSoloDead(sanitizedSnapshot.dead))
  }
  if (loadedSnapshot.pinnedGym !== sanitizedSnapshot.pinnedGym) {
    persistOperations.push(
      repository.persistSoloPinnedGym(sanitizedSnapshot.pinnedGym),
    )
  }
  if (loadedSnapshot.generationRules !== sanitizedSnapshot.generationRules) {
    persistOperations.push(
      repository.persistSoloGenerationRules(sanitizedSnapshot.generationRules),
    )
  }

  return persistOperations
}

const runState = ref(createDefaultRunState())
const loadError = ref(false)

const team = computed(() => getSoloRunState('Accessing the team store').team)
const box = computed(() => getSoloRunState('Accessing the box store').box)
const defeatedGyms = computed(
  () => getSoloRunState('Accessing defeated gyms').progress.defeatedGyms,
)
const pinnedGym = computed(
  () => getSoloRunState('Accessing the pinned gym').progress.pinnedGym,
)
const dead = computed(() => getSoloRunState('Accessing dead').dead)
const generationRules = computed(
  () => getSoloRunState('Accessing generation rules').rules.generation,
)

async function persistDead(newDead) {
  const soloRunState = getSoloRunState('Persisting dead')
  const nextRunState = {
    ...soloRunState,
    dead: newDead,
  }
  const nextSnapshot = mapSoloRunStateToPersistedSnapshot(nextRunState)

  runState.value = nextRunState
  await enqueueSoloPersistWithSnapshot(
    () => repository.persistSoloDead(newDead),
    nextSnapshot,
  )
  scheduleBackup()
}

async function persistGenerationRules(newRules) {
  const soloRunState = getSoloRunState('Persisting generation rules')
  const nextRules = normalizeGenerationRules(newRules)
  const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot({
    ...mapSoloRunStateToPersistedSnapshot(soloRunState),
    generationRules: nextRules,
  })

  setRunState(sanitizedSnapshot)

  await enqueueSoloPersistWithSnapshot(
    () =>
      Promise.all([
        repository.persistSoloGenerationRules(nextRules),
        repository.persistSoloTeam(sanitizedSnapshot.team),
        repository.persistSoloBox(sanitizedSnapshot.box),
        repository.persistSoloDead(sanitizedSnapshot.dead),
        repository.persistSoloDefeatedGyms(sanitizedSnapshot.defeatedGyms),
        repository.persistSoloPinnedGym(sanitizedSnapshot.pinnedGym),
      ]),
    sanitizedSnapshot,
  )
  scheduleBackup()
}

export function useRunStore() {
  async function loadData() {
    try {
      const loadedSnapshot = await repository.loadSoloRunSnapshot(
        DEFAULT_GENERATION_RULESET,
      )
      const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot(loadedSnapshot)

      setRunState(sanitizedSnapshot)
      loadError.value = false

      const persistOperations = getSanitizedSnapshotPersistOperations(
        loadedSnapshot,
        sanitizedSnapshot,
      )
      if (persistOperations.length > 0) {
        await enqueueSoloPersistWithSnapshot(
          () => Promise.all(persistOperations),
          sanitizedSnapshot,
        )
      }

      prefetchAllSprites()
      prefetchBerrySprites()
      prefetchTypeIcons()
      navigator.storage?.persist?.()
    } catch (error) {
      console.error('Failed to load data:', error)
      loadError.value = true
    }
  }

  async function persistTeam(newTeam) {
    const soloRunState = getSoloRunState('Persisting the team')
    const nextRunState = {
      ...soloRunState,
      team: newTeam,
    }
    const nextSnapshot = mapSoloRunStateToPersistedSnapshot(nextRunState)

    runState.value = nextRunState
    await enqueueSoloPersistWithSnapshot(
      () => repository.persistSoloTeam(newTeam),
      nextSnapshot,
    )
    scheduleBackup()
  }

  async function persistBox(newBox) {
    const soloRunState = getSoloRunState('Persisting the box')
    const nextRunState = {
      ...soloRunState,
      box: newBox,
    }
    const nextSnapshot = mapSoloRunStateToPersistedSnapshot(nextRunState)

    runState.value = nextRunState
    await enqueueSoloPersistWithSnapshot(
      () => repository.persistSoloBox(newBox),
      nextSnapshot,
    )
    scheduleBackup()
  }

  async function persistDefeatedGyms(newGyms) {
    const soloRunState = getSoloRunState('Persisting defeated gyms')
    const nextRunState = {
      ...soloRunState,
      progress: {
        ...soloRunState.progress,
        defeatedGyms: newGyms,
      },
    }
    const nextSnapshot = mapSoloRunStateToPersistedSnapshot(nextRunState)

    runState.value = nextRunState
    await enqueueSoloPersistWithSnapshot(
      () => repository.persistSoloDefeatedGyms(newGyms),
      nextSnapshot,
    )
    scheduleBackup()
  }

  async function persistPinnedGym(gymType) {
    const soloRunState = getSoloRunState('Persisting the pinned gym')
    const nextRunState = {
      ...soloRunState,
      progress: {
        ...soloRunState.progress,
        pinnedGym: gymType,
      },
    }
    const nextSnapshot = mapSoloRunStateToPersistedSnapshot(nextRunState)

    runState.value = nextRunState
    await enqueueSoloPersistWithSnapshot(
      () => repository.persistSoloPinnedGym(gymType),
      nextSnapshot,
    )
    scheduleBackup()
  }

  async function resetTeamAndBox() {
    await Promise.all([persistTeam([]), persistBox([]), persistDead([])])
  }

  async function resetGyms() {
    await persistDefeatedGyms([])
  }

  async function startNewSoloRun(nextGenerationRules = generationRules.value) {
    const snapshot = mapSoloRunStateToPersistedSnapshot(
      createDefaultSoloRunState(nextGenerationRules),
    )

    setRunState(snapshot)

    await enqueueSoloPersist(() =>
      Promise.all([
        repository.persistSoloTeam(snapshot.team),
        repository.persistSoloBox(snapshot.box),
        repository.persistSoloDead(snapshot.dead),
        repository.persistSoloDefeatedGyms(snapshot.defeatedGyms),
        repository.persistSoloPinnedGym(snapshot.pinnedGym),
        repository.persistSoloGenerationRules(snapshot.generationRules),
      ]),
    )
  }

  async function deleteTeamPokemon(id) {
    await persistTeam(team.value.filter((pokemon) => pokemon.id !== id))
  }

  async function deleteBoxPokemon(id) {
    await persistBox(box.value.filter((pokemon) => pokemon.id !== id))
  }

  async function killTeamPokemon(id) {
    const pokemon = team.value.find((p) => p.id === id)
    if (!pokemon) return
    await Promise.all([
      persistTeam(team.value.filter((p) => p.id !== id)),
      persistDead([...dead.value, pokemon]),
    ])
  }

  async function killBoxPokemon(id) {
    const pokemon = box.value.find((p) => p.id === id)
    if (!pokemon) return
    await Promise.all([
      persistBox(box.value.filter((p) => p.id !== id)),
      persistDead([...dead.value, pokemon]),
    ])
  }

  async function revivePokemon(id) {
    const pokemon = dead.value.find((p) => p.id === id)
    if (!pokemon) return
    await Promise.all([
      persistDead(dead.value.filter((p) => p.id !== id)),
      persistBox([...box.value, pokemon]),
    ])
  }

  async function deleteDeadPokemon(id) {
    await persistDead(dead.value.filter((p) => p.id !== id))
  }

  async function defeatGym(type) {
    await persistDefeatedGyms([...defeatedGyms.value, type])
  }

  async function undefeatGym(type) {
    await persistDefeatedGyms(defeatedGyms.value.filter((gym) => gym !== type))
  }

  return {
    runState,
    team,
    box,
    dead,
    defeatedGyms,
    pinnedGym,
    generationRules,
    loadError,
    loadData,
    persistTeam,
    persistBox,
    persistDead,
    persistDefeatedGyms,
    persistPinnedGym,
    persistGenerationRules,
    startNewSoloRun,
    resetTeamAndBox,
    resetGyms,
    deleteTeamPokemon,
    deleteBoxPokemon,
    killTeamPokemon,
    killBoxPokemon,
    revivePokemon,
    deleteDeadPokemon,
    defeatGym,
    undefeatGym,
  }
}

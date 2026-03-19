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

const repository = createLocalSoloRunRepository()

function hasStateChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function getSoloRunState(context) {
  return assertSoloRunState(runState.value, context)
}

function setRunState(snapshot) {
  runState.value = mapPersistedSoloSnapshotToRunState(snapshot)
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
const generationRules = computed(
  () => getSoloRunState('Accessing generation rules').rules.generation,
)

export function useRunStore() {
  async function loadData() {
    try {
      const loadedSnapshot = await repository.loadSoloRunSnapshot(
        DEFAULT_GENERATION_RULESET,
      )
      const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot(loadedSnapshot)

      setRunState(sanitizedSnapshot)
      loadError.value = false

      const persistOperations = []
      if (hasStateChanged(loadedSnapshot.team, sanitizedSnapshot.team)) {
        persistOperations.push(
          repository.persistSoloTeam(sanitizedSnapshot.team),
        )
      }
      if (
        hasStateChanged(
          loadedSnapshot.defeatedGyms,
          sanitizedSnapshot.defeatedGyms,
        )
      ) {
        persistOperations.push(
          repository.persistSoloDefeatedGyms(sanitizedSnapshot.defeatedGyms),
        )
      }
      if (hasStateChanged(loadedSnapshot.box, sanitizedSnapshot.box)) {
        persistOperations.push(repository.persistSoloBox(sanitizedSnapshot.box))
      }
      if (loadedSnapshot.pinnedGym !== sanitizedSnapshot.pinnedGym) {
        persistOperations.push(
          repository.persistSoloPinnedGym(sanitizedSnapshot.pinnedGym),
        )
      }
      if (
        loadedSnapshot.generationRules !== sanitizedSnapshot.generationRules
      ) {
        persistOperations.push(
          repository.persistSoloGenerationRules(
            sanitizedSnapshot.generationRules,
          ),
        )
      }
      await Promise.all(persistOperations)

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

    runState.value = {
      ...soloRunState,
      team: newTeam,
    }
    await repository.persistSoloTeam(newTeam)
  }

  async function persistBox(newBox) {
    const soloRunState = getSoloRunState('Persisting the box')

    runState.value = {
      ...soloRunState,
      box: newBox,
    }
    await repository.persistSoloBox(newBox)
  }

  async function persistDefeatedGyms(newGyms) {
    const soloRunState = getSoloRunState('Persisting defeated gyms')

    runState.value = {
      ...soloRunState,
      progress: {
        ...soloRunState.progress,
        defeatedGyms: newGyms,
      },
    }
    await repository.persistSoloDefeatedGyms(newGyms)
  }

  async function persistPinnedGym(gymType) {
    const soloRunState = getSoloRunState('Persisting the pinned gym')

    runState.value = {
      ...soloRunState,
      progress: {
        ...soloRunState.progress,
        pinnedGym: gymType,
      },
    }
    await repository.persistSoloPinnedGym(gymType)
  }

  async function persistGenerationRules(newRules) {
    const soloRunState = getSoloRunState('Persisting generation rules')
    const nextRules = normalizeGenerationRules(newRules)
    const sanitizedSnapshot = sanitizePersistedSoloRunSnapshot({
      ...mapSoloRunStateToPersistedSnapshot(soloRunState),
      generationRules: nextRules,
    })

    setRunState(sanitizedSnapshot)

    await Promise.all([
      repository.persistSoloGenerationRules(nextRules),
      repository.persistSoloTeam(sanitizedSnapshot.team),
      repository.persistSoloBox(sanitizedSnapshot.box),
      repository.persistSoloDefeatedGyms(sanitizedSnapshot.defeatedGyms),
      repository.persistSoloPinnedGym(sanitizedSnapshot.pinnedGym),
    ])
  }

  async function resetTeamAndBox() {
    await Promise.all([persistTeam([]), persistBox([])])
  }

  async function resetGyms() {
    await persistDefeatedGyms([])
  }

  async function startNewSoloRun(nextGenerationRules = generationRules.value) {
    const snapshot = mapSoloRunStateToPersistedSnapshot(
      createDefaultSoloRunState(nextGenerationRules),
    )

    setRunState(snapshot)

    await Promise.all([
      repository.persistSoloTeam(snapshot.team),
      repository.persistSoloBox(snapshot.box),
      repository.persistSoloDefeatedGyms(snapshot.defeatedGyms),
      repository.persistSoloPinnedGym(snapshot.pinnedGym),
      repository.persistSoloGenerationRules(snapshot.generationRules),
    ])
  }

  async function deleteTeamPokemon(id) {
    await persistTeam(team.value.filter((pokemon) => pokemon.id !== id))
  }

  async function deleteBoxPokemon(id) {
    await persistBox(box.value.filter((pokemon) => pokemon.id !== id))
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
    defeatedGyms,
    pinnedGym,
    generationRules,
    loadError,
    loadData,
    persistTeam,
    persistBox,
    persistDefeatedGyms,
    persistPinnedGym,
    persistGenerationRules,
    startNewSoloRun,
    resetTeamAndBox,
    resetGyms,
    deleteTeamPokemon,
    deleteBoxPokemon,
    defeatGym,
    undefeatGym,
  }
}

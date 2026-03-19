import { computed, ref } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalRunRepository } from '../services/localRunRepository.js'
import {
  createDefaultRunState,
  mapPersistedSnapshotToRunState,
  mapRunStateToPersistedSnapshot,
  normalizeGenerationRules,
  sanitizePersistedRunSnapshot,
} from '../utils/runSnapshot.js'
import {
  prefetchAllSprites,
  prefetchBerrySprites,
  prefetchTypeIcons,
} from '../utils/spriteCache.js'

const repository = createLocalRunRepository()

function hasStateChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function setRunState(snapshot) {
  runState.value = mapPersistedSnapshotToRunState(snapshot)
}

const runState = ref(createDefaultRunState())
const loadError = ref(false)

const team = computed(() => runState.value.team)
const box = computed(() => runState.value.box)
const defeatedGyms = computed(() => runState.value.progress.defeatedGyms)
const pinnedGym = computed(() => runState.value.progress.pinnedGym)
const generationRules = computed(() => runState.value.rules.generation)

export function useRunStore() {
  async function loadData() {
    try {
      const loadedSnapshot = await repository.loadRunSnapshot(
        DEFAULT_GENERATION_RULESET,
      )
      const sanitizedSnapshot = sanitizePersistedRunSnapshot(loadedSnapshot)

      setRunState(sanitizedSnapshot)
      loadError.value = false

      const persistOperations = []
      if (hasStateChanged(loadedSnapshot.team, sanitizedSnapshot.team)) {
        persistOperations.push(repository.persistTeam(sanitizedSnapshot.team))
      }
      if (
        hasStateChanged(
          loadedSnapshot.defeatedGyms,
          sanitizedSnapshot.defeatedGyms,
        )
      ) {
        persistOperations.push(
          repository.persistDefeatedGyms(sanitizedSnapshot.defeatedGyms),
        )
      }
      if (hasStateChanged(loadedSnapshot.box, sanitizedSnapshot.box)) {
        persistOperations.push(repository.persistBox(sanitizedSnapshot.box))
      }
      if (loadedSnapshot.pinnedGym !== sanitizedSnapshot.pinnedGym) {
        persistOperations.push(
          repository.persistPinnedGym(sanitizedSnapshot.pinnedGym),
        )
      }
      if (
        loadedSnapshot.generationRules !== sanitizedSnapshot.generationRules
      ) {
        persistOperations.push(
          repository.persistGenerationRules(sanitizedSnapshot.generationRules),
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
    runState.value = {
      ...runState.value,
      team: newTeam,
    }
    await repository.persistTeam(newTeam)
  }

  async function persistBox(newBox) {
    runState.value = {
      ...runState.value,
      box: newBox,
    }
    await repository.persistBox(newBox)
  }

  async function persistDefeatedGyms(newGyms) {
    runState.value = {
      ...runState.value,
      progress: {
        ...runState.value.progress,
        defeatedGyms: newGyms,
      },
    }
    await repository.persistDefeatedGyms(newGyms)
  }

  async function persistPinnedGym(gymType) {
    runState.value = {
      ...runState.value,
      progress: {
        ...runState.value.progress,
        pinnedGym: gymType,
      },
    }
    await repository.persistPinnedGym(gymType)
  }

  async function persistGenerationRules(newRules) {
    const nextRules = normalizeGenerationRules(newRules)
    const sanitizedSnapshot = sanitizePersistedRunSnapshot({
      ...mapRunStateToPersistedSnapshot(runState.value),
      generationRules: nextRules,
    })

    setRunState(sanitizedSnapshot)

    await Promise.all([
      repository.persistGenerationRules(nextRules),
      repository.persistTeam(sanitizedSnapshot.team),
      repository.persistBox(sanitizedSnapshot.box),
      repository.persistDefeatedGyms(sanitizedSnapshot.defeatedGyms),
      repository.persistPinnedGym(sanitizedSnapshot.pinnedGym),
    ])
  }

  async function resetTeamAndBox() {
    await Promise.all([persistTeam([]), persistBox([])])
  }

  async function resetGyms() {
    await persistDefeatedGyms([])
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
    resetTeamAndBox,
    resetGyms,
    deleteTeamPokemon,
    deleteBoxPokemon,
    defeatGym,
    undefeatGym,
  }
}

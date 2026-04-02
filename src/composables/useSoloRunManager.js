import { computed, ref } from 'vue'
import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import {
  createDefaultSoloRunState,
  mapPersistedSoloSnapshotToRunState,
  mapSoloRunStateToPersistedSnapshot,
  sanitizePersistedSoloRunSnapshot,
} from '../utils/runSnapshot.js'
import { generateUUID } from '../utils/uuid.js'

const repository = createLocalSoloRunRepository()
const runIndex = ref(null)
let _switching = false

function cloneIndex() {
  return JSON.parse(JSON.stringify(runIndex.value))
}

function extractRunSummary(snapshot) {
  return {
    name: snapshot.name ?? null,
    generationRules: snapshot.generationRules,
    teamCount: snapshot.team?.length ?? 0,
    createdAt: snapshot.createdAt ?? null,
    updatedAt: new Date().toISOString(),
  }
}

function createDefaultSnapshot() {
  return mapSoloRunStateToPersistedSnapshot(
    createDefaultSoloRunState(DEFAULT_GENERATION_RULESET),
  )
}

function toPlainPersistedSnapshot(snapshot) {
  const normalizedSnapshot = mapSoloRunStateToPersistedSnapshot(
    mapPersistedSoloSnapshotToRunState(
      sanitizePersistedSoloRunSnapshot({
        team: snapshot?.team ?? [],
        box: snapshot?.box ?? [],
        dead: snapshot?.dead ?? [],
        defeatedGyms: snapshot?.defeatedGyms ?? [],
        pinnedGym: snapshot?.pinnedGym ?? null,
        generationRules:
          snapshot?.generationRules ?? DEFAULT_GENERATION_RULESET,
      }),
    ),
  )

  return JSON.parse(
    JSON.stringify({
      ...normalizedSnapshot,
      name: snapshot?.name ?? null,
      createdAt: snapshot?.createdAt ?? null,
    }),
  )
}

function hasPersistedSoloData(snapshot) {
  if (!snapshot) return false

  return (
    (snapshot.team?.length ?? 0) > 0 ||
    (snapshot.box?.length ?? 0) > 0 ||
    (snapshot.dead?.length ?? 0) > 0 ||
    (snapshot.defeatedGyms?.length ?? 0) > 0 ||
    snapshot.pinnedGym !== null ||
    snapshot.generationRules !== null
  )
}

export function useSoloRunManager() {
  const runList = computed(() => {
    if (!runIndex.value) return []
    return [...runIndex.value.runs].sort(
      (a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0),
    )
  })

  const activeRunId = computed(() => runIndex.value?.activeRunId ?? null)
  const activeRunSummary = computed(
    () =>
      runIndex.value?.runs.find((run) => run.id === activeRunId.value) ?? null,
  )

  function getRunSummary(runId) {
    return runIndex.value?.runs.find((run) => run.id === runId) ?? null
  }

  function mergeSnapshotWithRunMeta(snapshot, runSummary) {
    return toPlainPersistedSnapshot({
      ...snapshot,
      name: snapshot.name ?? runSummary?.name ?? null,
      createdAt:
        snapshot.createdAt ?? runSummary?.createdAt ?? new Date().toISOString(),
    })
  }

  async function persistRunSnapshot(runId, snapshot) {
    if (!runId || !runIndex.value) return

    const nextSnapshot = mergeSnapshotWithRunMeta(
      snapshot,
      getRunSummary(runId),
    )
    const summary = extractRunSummary(nextSnapshot)
    const runs = runIndex.value.runs.map((run) =>
      run.id === runId ? { ...run, ...summary } : run,
    )

    runIndex.value = {
      ...runIndex.value,
      runs,
    }

    await Promise.all([
      repository.persistSoloRun(runId, nextSnapshot),
      repository.persistSoloRunIndex(cloneIndex()),
    ])
  }

  async function initializeRun(snapshot) {
    const runId = generateUUID()
    const snapshotWithMeta = mergeSnapshotWithRunMeta(snapshot, null)
    const entry = { id: runId, ...extractRunSummary(snapshotWithMeta) }
    const newIndex = { activeRunId: runId, runs: [entry] }

    await Promise.all([
      repository.persistSoloTeam(snapshotWithMeta.team ?? []),
      repository.persistSoloBox(snapshotWithMeta.box ?? []),
      repository.persistSoloDead(snapshotWithMeta.dead ?? []),
      repository.persistSoloDefeatedGyms(snapshotWithMeta.defeatedGyms ?? []),
      repository.persistSoloPinnedGym(snapshotWithMeta.pinnedGym ?? null),
      repository.persistSoloGenerationRules(
        snapshotWithMeta.generationRules ?? DEFAULT_GENERATION_RULESET,
      ),
      repository.persistSoloRun(runId, snapshotWithMeta),
      repository.persistSoloRunIndex(newIndex),
    ])

    runIndex.value = newIndex
  }

  async function reinitializeFromLegacyOrDefault() {
    runIndex.value = null
    const existing = await repository.loadSoloRunSnapshot(null)
    if (hasPersistedSoloData(existing)) {
      await initializeRun(existing)
    } else {
      await initializeRun(createDefaultSnapshot())
    }
  }

  async function findFirstValidRunId(runs) {
    for (const run of runs) {
      const snapshot = await repository.loadSoloRun(run.id)
      if (snapshot) return run.id
    }
    return null
  }

  async function repairRunIndex() {
    if (!runIndex.value?.runs?.length) {
      await reinitializeFromLegacyOrDefault()
      return
    }

    // Ensure activeRunId points to an entry in runs
    const hasActiveEntry = runIndex.value.runs.some(
      (r) => r.id === runIndex.value.activeRunId,
    )
    if (!hasActiveEntry) {
      runIndex.value = {
        ...runIndex.value,
        activeRunId: runIndex.value.runs[0].id,
      }
    }

    // Check active run snapshot, then scan others if missing
    const validRunId = await findFirstValidRunId(
      // Check active run first by putting it at the front
      [...runIndex.value.runs].sort((a, b) =>
        a.id === runIndex.value.activeRunId
          ? -1
          : b.id === runIndex.value.activeRunId
            ? 1
            : 0,
      ),
    )

    if (!validRunId) {
      await reinitializeFromLegacyOrDefault()
      return
    }

    if (validRunId !== runIndex.value.activeRunId || !hasActiveEntry) {
      runIndex.value = { ...runIndex.value, activeRunId: validRunId }
      await repository.persistSoloRunIndex(cloneIndex())
    }
  }

  async function loadRunIndex() {
    const index = await repository.loadSoloRunIndex()
    if (index) {
      runIndex.value = index
      await repairRunIndex()
      return
    }

    // Migrate existing solo data to first run entry
    const existingSnapshot = await repository.loadSoloRunSnapshot(null)
    if (hasPersistedSoloData(existingSnapshot)) {
      await initializeRun(existingSnapshot)
      return
    }

    await initializeRun(createDefaultSnapshot())
  }

  async function saveCurrentRunToIndex(snapshot) {
    const currentId = runIndex.value?.activeRunId
    if (!currentId || !runIndex.value) return
    await persistRunSnapshot(currentId, snapshot)
  }

  async function switchToRun(targetRunId, currentSnapshot) {
    if (_switching) return null
    _switching = true

    try {
      if (currentSnapshot && runIndex.value?.activeRunId) {
        await saveCurrentRunToIndex(currentSnapshot)
      }

      const targetSnapshot = await repository.loadSoloRun(targetRunId)
      if (!targetSnapshot) {
        throw new Error(`Run not found: ${targetRunId}`)
      }

      // Write target snapshot to the main solo stores so loadData() picks it up
      await Promise.all([
        repository.persistSoloTeam(targetSnapshot.team ?? []),
        repository.persistSoloBox(targetSnapshot.box ?? []),
        repository.persistSoloDead(targetSnapshot.dead ?? []),
        repository.persistSoloDefeatedGyms(targetSnapshot.defeatedGyms ?? []),
        repository.persistSoloPinnedGym(targetSnapshot.pinnedGym ?? null),
        repository.persistSoloGenerationRules(
          targetSnapshot.generationRules ?? null,
        ),
      ])

      runIndex.value = {
        ...runIndex.value,
        activeRunId: targetRunId,
      }
      await repository.persistSoloRunIndex(cloneIndex())

      return targetSnapshot
    } finally {
      _switching = false
    }
  }

  async function registerNewRun(snapshot) {
    const runId = generateUUID()
    const snapshotWithMeta = mergeSnapshotWithRunMeta(snapshot, null)
    const entry = { id: runId, ...extractRunSummary(snapshotWithMeta) }

    const runs = [...(runIndex.value?.runs ?? []), entry]
    runIndex.value = { activeRunId: runId, runs }

    await Promise.all([
      repository.persistSoloRun(runId, snapshotWithMeta),
      repository.persistSoloRunIndex(cloneIndex()),
    ])

    return runId
  }

  async function deleteRun(runId) {
    if (!runIndex.value) return null

    const runs = runIndex.value.runs.filter((r) => r.id !== runId)
    const wasActive = runIndex.value.activeRunId === runId
    const nextActiveId = wasActive
      ? (runs[0]?.id ?? null)
      : runIndex.value.activeRunId

    runIndex.value = { activeRunId: nextActiveId, runs }

    await Promise.all([
      repository.deleteSoloRun(runId),
      repository.persistSoloRunIndex(cloneIndex()),
    ])

    return { wasActive, nextRunId: nextActiveId }
  }

  async function renameRun(runId, name) {
    if (!runIndex.value) return

    const runs = runIndex.value.runs.map((r) =>
      r.id === runId ? { ...r, name } : r,
    )
    runIndex.value = { ...runIndex.value, runs }
    await repository.persistSoloRunIndex(cloneIndex())

    // Also update the stored snapshot name
    const snapshot = await repository.loadSoloRun(runId)
    if (snapshot) {
      await repository.persistSoloRun(runId, { ...snapshot, name })
    }
  }

  async function persistActiveRunSnapshot(snapshot) {
    const currentId = runIndex.value?.activeRunId
    if (!currentId || !runIndex.value) return
    await persistRunSnapshot(currentId, snapshot)
  }

  return {
    runList,
    activeRunId,
    activeRunSummary,
    loadRunIndex,
    saveCurrentRunToIndex,
    persistActiveRunSnapshot,
    switchToRun,
    registerNewRun,
    deleteRun,
    renameRun,
  }
}

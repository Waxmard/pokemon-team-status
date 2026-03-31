import { computed, ref } from 'vue'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'

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

export function useSoloRunManager() {
  const runList = computed(() => {
    if (!runIndex.value) return []
    return [...runIndex.value.runs].sort(
      (a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0),
    )
  })

  const activeRunId = computed(() => runIndex.value?.activeRunId ?? null)

  async function loadRunIndex() {
    const index = await repository.loadSoloRunIndex()
    if (index) {
      runIndex.value = index
      return
    }

    // Migrate existing solo data to first run entry
    const existingSnapshot = await repository.loadSoloRunSnapshot(null)
    const hasData =
      existingSnapshot &&
      (existingSnapshot.team?.length > 0 ||
        existingSnapshot.box?.length > 0 ||
        existingSnapshot.dead?.length > 0)

    if (!hasData) return

    const runId = crypto.randomUUID()
    const snapshotWithMeta = {
      ...existingSnapshot,
      createdAt: new Date().toISOString(),
    }
    const entry = { id: runId, ...extractRunSummary(snapshotWithMeta) }
    const newIndex = { activeRunId: runId, runs: [entry] }

    await Promise.all([
      repository.persistSoloRun(runId, snapshotWithMeta),
      repository.persistSoloRunIndex(newIndex),
    ])

    runIndex.value = newIndex
  }

  async function saveCurrentRunToIndex(snapshot) {
    const currentId = runIndex.value?.activeRunId
    if (!currentId || !runIndex.value) return

    const summary = extractRunSummary(snapshot)
    const runs = runIndex.value.runs.map((r) =>
      r.id === currentId ? { ...r, ...summary } : r,
    )

    runIndex.value = { ...runIndex.value, runs }

    await Promise.all([
      repository.persistSoloRun(currentId, snapshot),
      repository.persistSoloRunIndex(cloneIndex()),
    ])
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
    const runId = crypto.randomUUID()
    const snapshotWithMeta = {
      ...snapshot,
      createdAt: snapshot.createdAt ?? new Date().toISOString(),
    }
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

  return {
    runList,
    activeRunId,
    loadRunIndex,
    saveCurrentRunToIndex,
    switchToRun,
    registerNewRun,
    deleteRun,
    renameRun,
  }
}

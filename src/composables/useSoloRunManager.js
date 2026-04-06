import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import {
  createDefaultSoloRunState,
  isEmptySoloRun,
  mapPersistedSoloSnapshotToRunState,
  mapSoloRunStateToPersistedSnapshot,
  sanitizePersistedSoloRunSnapshot,
} from '../utils/runSnapshot.js'
import { createRunIndexManager } from './createRunIndexManager.js'

const repository = createLocalSoloRunRepository()
let _switching = false

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

const {
  runIndex,
  cloneIndex,
  runList,
  activeRunId,
  activeRunSummary,
  registerNewRun,
  deleteRun,
} = createRunIndexManager({
  persistRun: (runId, snapshot) => repository.persistSoloRun(runId, snapshot),
  persistIndex: (index) => repository.persistSoloRunIndex(index),
  deletePersistedRun: (runId) => repository.deleteSoloRun(runId),
  extractSummary: extractRunSummary,
})

export function useSoloRunManager() {
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
    const snapshotWithMeta = mergeSnapshotWithRunMeta(snapshot, null)

    await Promise.all([
      repository.persistSoloTeam(snapshotWithMeta.team ?? []),
      repository.persistSoloBox(snapshotWithMeta.box ?? []),
      repository.persistSoloDead(snapshotWithMeta.dead ?? []),
      repository.persistSoloDefeatedGyms(snapshotWithMeta.defeatedGyms ?? []),
      repository.persistSoloPinnedGym(snapshotWithMeta.pinnedGym ?? null),
      repository.persistSoloGenerationRules(
        snapshotWithMeta.generationRules ?? DEFAULT_GENERATION_RULESET,
      ),
    ])

    await registerNewRun(snapshotWithMeta)
  }

  async function reinitializeFromLegacyOrDefault() {
    runIndex.value = null
    const existing = await repository.loadSoloRunSnapshot(null)
    if (isEmptySoloRun(existing)) {
      await initializeRun(createDefaultSnapshot())
    } else {
      await initializeRun(existing)
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
    if (!isEmptySoloRun(existingSnapshot)) {
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

  async function persistActiveRunSnapshot(snapshot, runId = null) {
    const targetId = runId ?? runIndex.value?.activeRunId
    if (!targetId || !runIndex.value) return
    await persistRunSnapshot(targetId, snapshot)
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

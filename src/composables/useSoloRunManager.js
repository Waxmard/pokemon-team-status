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

async function applySnapshotToStores(snapshot, generationRulesFallback = null) {
  await Promise.all([
    repository.persistSoloTeam(snapshot.team ?? []),
    repository.persistSoloBox(snapshot.box ?? []),
    repository.persistSoloDead(snapshot.dead ?? []),
    repository.persistSoloDefeatedGyms(snapshot.defeatedGyms ?? []),
    repository.persistSoloPinnedGym(snapshot.pinnedGym ?? null),
    repository.persistSoloGenerationRules(
      snapshot.generationRules ?? generationRulesFallback,
    ),
    repository.persistSoloGenerationRulesUpdatedAt(
      snapshot.generationRulesUpdatedAt ?? null,
    ),
    repository.persistSoloTeraEnabled(!!snapshot.teraEnabled),
    repository.persistSoloTeraEnabledUpdatedAt(
      snapshot.teraEnabledUpdatedAt ?? null,
    ),
  ])
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
        progressUpdatedAt: snapshot?.progressUpdatedAt ?? null,
        generationRules:
          snapshot?.generationRules ?? DEFAULT_GENERATION_RULESET,
        generationRulesUpdatedAt: snapshot?.generationRulesUpdatedAt ?? null,
        teraEnabled: snapshot?.teraEnabled ?? false,
        teraEnabledUpdatedAt: snapshot?.teraEnabledUpdatedAt ?? null,
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
  deduplicateIndex,
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

    await applySnapshotToStores(snapshotWithMeta, DEFAULT_GENERATION_RULESET)

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

    await deduplicateIndex()

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

  async function retirePreviousRun(previousRunId, currentSnapshot) {
    if (!currentSnapshot || !previousRunId) return
    if (isEmptySoloRun(currentSnapshot)) {
      await deleteRun(previousRunId)
    } else {
      await saveCurrentRunToIndex(currentSnapshot)
    }
  }

  async function switchToRun(targetRunId, currentSnapshot) {
    if (_switching) return null
    _switching = true

    try {
      await retirePreviousRun(runIndex.value?.activeRunId, currentSnapshot)

      const targetSnapshot = await repository.loadSoloRun(targetRunId)
      if (!targetSnapshot) {
        throw new Error(`Run not found: ${targetRunId}`)
      }

      await applySnapshotToStores(targetSnapshot)

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

  async function updateRunMeta(runId, meta) {
    if (!runIndex.value) return

    const runs = runIndex.value.runs.map((r) =>
      r.id === runId ? { ...r, ...meta } : r,
    )
    runIndex.value = { ...runIndex.value, runs }
    await repository.persistSoloRunIndex(cloneIndex())
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
    updateRunMeta,
  }
}

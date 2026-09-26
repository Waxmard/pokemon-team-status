import { DEFAULT_GENERATION_RULESET } from '../data/types.js'
import { localRunRepository as repository } from '../services/localRunRepository.js'
import {
  createDefaultSoloRunState,
  isEmptySoloRun,
  mapPersistedSoloSnapshotToRunState,
  mapSoloRunStateToPersistedSnapshot,
} from '../utils/runSnapshot.js'
import { createRunIndexManager } from './createRunIndexManager.js'

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

// mapPersistedSoloSnapshotToRunState sanitizes internally — pass fields
// through as-is (rather than re-listing each one) so new snapshot fields
// don't silently get dropped on their way into per-run storage.
function toPlainPersistedSnapshot(snapshot) {
  const normalizedSnapshot = mapSoloRunStateToPersistedSnapshot(
    mapPersistedSoloSnapshotToRunState({
      ...snapshot,
      team: snapshot?.team ?? [],
      box: snapshot?.box ?? [],
      dead: snapshot?.dead ?? [],
      defeatedGyms: snapshot?.defeatedGyms ?? [],
      pinnedGym: snapshot?.pinnedGym ?? null,
      generationRules: snapshot?.generationRules ?? DEFAULT_GENERATION_RULESET,
    }),
  )

  return JSON.parse(
    JSON.stringify({
      ...normalizedSnapshot,
      name: snapshot?.name ?? null,
      createdAt: snapshot?.createdAt ?? null,
    }),
  )
}

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

async function initializeRun(snapshot) {
  const snapshotWithMeta = mergeSnapshotWithRunMeta(snapshot, null)

  await applySnapshotToStores(snapshotWithMeta, DEFAULT_GENERATION_RULESET)

  await registerNewRun(snapshotWithMeta)
}

async function seedRunFromLegacyOrDefault() {
  const existing = await repository.loadSoloRunSnapshot(null)
  await initializeRun(
    isEmptySoloRun(existing) ? createDefaultSnapshot() : existing,
  )
}

async function reinitializeFromLegacyOrDefault() {
  runIndex.value = null
  await seedRunFromLegacyOrDefault()
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
    await persistIndexNow()
  }
}

async function retirePreviousRun(previousRunId, currentSnapshot) {
  if (!currentSnapshot || !previousRunId) return
  if (isEmptySoloRun(currentSnapshot)) {
    await deleteRun(previousRunId)
  } else {
    await saveCurrentRunToIndex(currentSnapshot)
  }
}

async function renameRun(runId, name) {
  if (!runIndex.value) return

  const runs = runIndex.value.runs.map((r) =>
    r.id === runId ? { ...r, name } : r,
  )
  runIndex.value = { ...runIndex.value, runs }
  await persistIndexNow()

  // Writes the snapshot name through the repository rather than
  // persistRunSnapshot: a rename must not refresh the summary, because that
  // would bump updatedAt and reorder the run list.
  const snapshot = await repository.loadSoloRun(runId)
  if (snapshot) {
    await repository.persistSoloRun(runId, { ...snapshot, name })
  }
}

async function updateRunMeta(runId, meta) {
  if (!runIndex.value) return

  const runs = runIndex.value.runs.map((r) =>
    r.id === runId ? { ...r, ...meta } : r,
  )
  runIndex.value = { ...runIndex.value, runs }
  await persistIndexNow()
}

async function persistActiveRunSnapshot(snapshot, runId = null) {
  await persistRunSnapshot(runId ?? activeRunId.value, snapshot)
}

const manager = createRunIndexManager({
  repository,
  runKind: 'solo',
  extractSummary: extractRunSummary,
  prepareSnapshot: (snapshot, runId) =>
    mergeSnapshotWithRunMeta(snapshot, getRunSummary(runId)),
  bootstrap: seedRunFromLegacyOrDefault,
  afterIndexLoad: repairRunIndex,
  applyTargetSnapshot: (snapshot) => applySnapshotToStores(snapshot),
  retireCurrentRun: retirePreviousRun,
})

const {
  runList,
  activeRunId,
  activeRunSummary,
  runIndex,
  loadRunIndex,
  saveCurrentRunToIndex,
  persistRunSnapshot,
  switchToRun,
  registerNewRun,
  deleteRun,
  persistIndexNow,
} = manager

export function useSoloRunManager() {
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

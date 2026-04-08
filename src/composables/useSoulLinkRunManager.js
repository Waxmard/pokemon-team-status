import { createLocalSoloRunRepository } from '../services/localRunRepository.js'
import { createRunIndexManager } from './createRunIndexManager.js'

const repository = createLocalSoloRunRepository()
let _switching = false

function extractRunSummary(snapshot) {
  const playerNames = (snapshot.players ?? []).map((p) => p.name)
  return {
    name: snapshot.metadata?.name ?? null,
    playerNames,
    sessionId: snapshot.metadata?.sessionId ?? null,
    inviteCode: snapshot.metadata?.inviteCode ?? null,
    createdAt: snapshot.metadata?.createdAt ?? null,
    updatedAt: new Date().toISOString(),
  }
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
  persistRun: (runId, snapshot) =>
    repository.persistSoulLinkRun(runId, snapshot),
  persistIndex: (index) => repository.persistSoulLinkRunIndex(index),
  deletePersistedRun: (runId) => repository.deleteSoulLinkRun(runId),
  extractSummary: extractRunSummary,
})

export function useSoulLinkRunManager() {
  async function loadRunIndex() {
    const index = await repository.loadSoulLinkRunIndex()
    if (index) {
      runIndex.value = index
      await deduplicateIndex()
      return
    }

    const existingSnapshot = await repository.loadSoulLinkSnapshot()
    if (!existingSnapshot) return

    await registerNewRun(existingSnapshot)
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
      repository.persistSoulLinkRun(currentId, snapshot),
      repository.persistSoulLinkRunIndex(cloneIndex()),
    ])
  }

  async function switchToRun(targetRunId, currentSnapshot) {
    if (_switching) return
    _switching = true

    try {
      if (currentSnapshot && runIndex.value?.activeRunId) {
        await saveCurrentRunToIndex(currentSnapshot)
      }

      const targetSnapshot = await repository.loadSoulLinkRun(targetRunId)
      if (!targetSnapshot) {
        throw new Error(`Run not found: ${targetRunId}`)
      }

      await repository.persistSoulLinkSnapshot(targetSnapshot)

      runIndex.value = {
        ...runIndex.value,
        activeRunId: targetRunId,
      }
      await repository.persistSoulLinkRunIndex(cloneIndex())
    } finally {
      _switching = false
    }
  }

  return {
    runList,
    activeRunId,
    activeRunSummary,
    loadRunIndex,
    saveCurrentRunToIndex,
    switchToRun,
    registerNewRun,
    deleteRun,
  }
}

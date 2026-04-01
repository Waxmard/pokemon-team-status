import { computed, ref } from 'vue'
import { createLocalSoloRunRepository } from '../services/localRunRepository.js'

const repository = createLocalSoloRunRepository()
const runIndex = ref(null)
let _switching = false

function cloneIndex() {
  return JSON.parse(JSON.stringify(runIndex.value))
}

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

export function useSoulLinkRunManager() {
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

  async function loadRunIndex() {
    const index = await repository.loadSoulLinkRunIndex()
    if (index) {
      runIndex.value = index
      return
    }

    const existingSnapshot = await repository.loadSoulLinkSnapshot()
    if (!existingSnapshot) return

    const runId = crypto.randomUUID()
    const entry = { id: runId, ...extractRunSummary(existingSnapshot) }
    const newIndex = { activeRunId: runId, runs: [entry] }

    await Promise.all([
      repository.persistSoulLinkRun(runId, existingSnapshot),
      repository.persistSoulLinkRunIndex(newIndex),
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

  async function registerNewRun(snapshot) {
    const runId = crypto.randomUUID()
    const entry = { id: runId, ...extractRunSummary(snapshot) }

    const runs = [...(runIndex.value?.runs ?? []), entry]
    runIndex.value = { activeRunId: runId, runs }

    await Promise.all([
      repository.persistSoulLinkRun(runId, snapshot),
      repository.persistSoulLinkRunIndex(cloneIndex()),
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
      repository.deleteSoulLinkRun(runId),
      repository.persistSoulLinkRunIndex(cloneIndex()),
    ])

    return { wasActive, nextRunId: nextActiveId }
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

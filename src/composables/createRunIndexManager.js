import { computed, ref } from 'vue'
import { generateUUID } from '../utils/uuid.js'

export function createRunIndexManager({
  persistRun,
  persistIndex,
  deletePersistedRun,
  extractSummary,
}) {
  const runIndex = ref(null)

  function cloneIndex() {
    return JSON.parse(JSON.stringify(runIndex.value))
  }

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

  async function registerNewRun(snapshot) {
    const runId = generateUUID()
    const entry = { id: runId, ...extractSummary(snapshot) }

    const runs = [...(runIndex.value?.runs ?? []), entry]
    runIndex.value = { activeRunId: runId, runs }

    await Promise.all([persistRun(runId, snapshot), persistIndex(cloneIndex())])

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

    await Promise.all([deletePersistedRun(runId), persistIndex(cloneIndex())])

    return { wasActive, nextRunId: nextActiveId }
  }

  return {
    runIndex,
    cloneIndex,
    runList,
    activeRunId,
    activeRunSummary,
    registerNewRun,
    deleteRun,
  }
}

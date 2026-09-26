import { computed, ref } from 'vue'
import { generateUUID } from '../utils/uuid.js'

const RUN_KINDS = {
  solo: {
    loadIndex: 'loadSoloRunIndex',
    persistIndex: 'persistSoloRunIndex',
    loadRun: 'loadSoloRun',
    persistRun: 'persistSoloRun',
    deleteRun: 'deleteSoloRun',
    reentryReturn: null,
    returnsSnapshot: true,
  },
  'soul-link': {
    loadIndex: 'loadSoulLinkRunIndex',
    persistIndex: 'persistSoulLinkRunIndex',
    loadRun: 'loadSoulLinkRun',
    persistRun: 'persistSoulLinkRun',
    deleteRun: 'deleteSoulLinkRun',
    reentryReturn: undefined,
    returnsSnapshot: false,
  },
}

export function createRunIndexManager({
  repository,
  runKind,
  extractSummary,
  prepareSnapshot = (snapshot) => snapshot,
  bootstrap,
  afterIndexLoad,
  applyTargetSnapshot,
  retireCurrentRun,
}) {
  const kind = RUN_KINDS[runKind]
  if (!kind) throw new Error(`Unknown run kind: ${runKind}`)

  const runIndex = ref(null)
  let switching = false

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

  async function persistIndexNow() {
    await repository[kind.persistIndex](cloneIndex())
  }

  function mergeRunSummary(runId, summary) {
    const runs = runIndex.value.runs.map((run) =>
      run.id === runId ? { ...run, ...summary } : run,
    )
    runIndex.value = { ...runIndex.value, runs }
  }

  async function persistRunSnapshot(runId, snapshot) {
    if (!runId || !runIndex.value) return

    const nextSnapshot = prepareSnapshot(snapshot, runId)
    mergeRunSummary(runId, extractSummary(nextSnapshot))

    await Promise.all([
      repository[kind.persistRun](runId, nextSnapshot),
      persistIndexNow(),
    ])
  }

  function saveCurrentRunToIndex(snapshot) {
    return persistRunSnapshot(runIndex.value?.activeRunId, snapshot)
  }

  async function deduplicateIndex() {
    if (!runIndex.value?.runs?.length) return
    const seen = new Set()
    const deduped = runIndex.value.runs.filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    if (deduped.length !== runIndex.value.runs.length) {
      runIndex.value = { ...runIndex.value, runs: deduped }
      await persistIndexNow()
    }
  }

  async function registerNewRun(snapshot) {
    const runId = generateUUID()
    const entry = { id: runId, ...extractSummary(snapshot) }

    const runs = [...(runIndex.value?.runs ?? []), entry]
    runIndex.value = { activeRunId: runId, runs }

    await Promise.all([
      repository[kind.persistRun](runId, snapshot),
      persistIndexNow(),
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

    await Promise.all([repository[kind.deleteRun](runId), persistIndexNow()])

    return { wasActive, nextRunId: nextActiveId }
  }

  async function loadRunIndex() {
    const index = await repository[kind.loadIndex]()
    if (index) {
      runIndex.value = index
      await deduplicateIndex()
      await afterIndexLoad?.()
      return
    }

    await bootstrap()
  }

  async function switchToRun(targetRunId, currentSnapshot) {
    if (switching) return kind.reentryReturn
    switching = true

    try {
      await retireCurrentRun?.(runIndex.value?.activeRunId, currentSnapshot)

      const targetSnapshot = await repository[kind.loadRun](targetRunId)
      if (!targetSnapshot) {
        throw new Error(`Run not found: ${targetRunId}`)
      }

      await applyTargetSnapshot?.(targetSnapshot)

      runIndex.value = {
        ...runIndex.value,
        activeRunId: targetRunId,
      }
      await persistIndexNow()

      return kind.returnsSnapshot ? targetSnapshot : undefined
    } finally {
      switching = false
    }
  }

  return {
    runIndex,
    runList,
    activeRunId,
    activeRunSummary,
    loadRunIndex,
    saveCurrentRunToIndex,
    persistRunSnapshot,
    switchToRun,
    registerNewRun,
    deleteRun,
    persistIndexNow,
  }
}

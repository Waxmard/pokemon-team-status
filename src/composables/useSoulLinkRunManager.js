import { localRunRepository as repository } from '../services/localRunRepository.js'
import { createRunIndexManager } from './createRunIndexManager.js'

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

async function seedRunFromLegacySnapshot() {
  const existingSnapshot = await repository.loadSoulLinkSnapshot()
  if (!existingSnapshot) return

  await registerNewRun(existingSnapshot)
}

async function retireCurrentSoulLinkRun(previousRunId, currentSnapshot) {
  if (!previousRunId || !currentSnapshot) return

  await saveCurrentRunToIndex(currentSnapshot)
}

const manager = createRunIndexManager({
  repository,
  runKind: 'soul-link',
  extractSummary: extractRunSummary,
  bootstrap: seedRunFromLegacySnapshot,
  applyTargetSnapshot: (snapshot) =>
    repository.persistSoulLinkSnapshot(snapshot),
  retireCurrentRun: retireCurrentSoulLinkRun,
})

const {
  runList,
  activeRunId,
  activeRunSummary,
  loadRunIndex,
  saveCurrentRunToIndex,
  switchToRun,
  registerNewRun,
  deleteRun,
} = manager

export function useSoulLinkRunManager() {
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

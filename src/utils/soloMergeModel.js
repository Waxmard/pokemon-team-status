import { mergeRosterMembers } from './soulLinkModel.js'

const DEFAULT_ROSTER = { team: [], box: [], dead: [], _tombstones: [] }
const DEFAULT_PROGRESS = { defeatedGyms: [], pinnedGym: null, updatedAt: null }

function ensureRosterShape(snapshot) {
  return {
    team: snapshot.team ?? [],
    box: snapshot.box ?? [],
    dead: snapshot.dead ?? [],
    _tombstones: snapshot._tombstones ?? [],
  }
}

function ensureProgressShape(snapshot) {
  return {
    defeatedGyms: snapshot.defeatedGyms ?? [],
    pinnedGym: snapshot.pinnedGym ?? null,
    updatedAt: snapshot.progressUpdatedAt ?? null,
  }
}

function stampMemberTimestamps(members) {
  const now = Date.now()
  return members.map((m) =>
    m.updatedAt == null ? { ...m, updatedAt: now } : m,
  )
}

export function migrateLegacySoloSnapshot(snapshot) {
  return {
    ...snapshot,
    team: stampMemberTimestamps(snapshot.team ?? []),
    box: stampMemberTimestamps(snapshot.box ?? []),
    dead: stampMemberTimestamps(snapshot.dead ?? []),
    _tombstones: snapshot._tombstones ?? [],
    progressUpdatedAt: snapshot.progressUpdatedAt ?? null,
  }
}

export function mergeSoloRoster(localRoster, remoteRoster) {
  return mergeRosterMembers(
    { ...DEFAULT_ROSTER, ...localRoster },
    { ...DEFAULT_ROSTER, ...remoteRoster },
  )
}

export function mergeSoloProgress(localProgress, remoteProgress) {
  const local = { ...DEFAULT_PROGRESS, ...localProgress }
  const remote = { ...DEFAULT_PROGRESS, ...remoteProgress }
  const localTs = local.updatedAt ?? 0
  const remoteTs = remote.updatedAt ?? 0
  return localTs >= remoteTs ? local : remote
}

export function mergeSoloRemoteState(localSnapshot, remoteSnapshot) {
  if (!remoteSnapshot) return localSnapshot
  const local = migrateLegacySoloSnapshot(localSnapshot)
  const remote = migrateLegacySoloSnapshot(remoteSnapshot)

  const mergedRoster = mergeSoloRoster(
    ensureRosterShape(local),
    ensureRosterShape(remote),
  )

  const mergedProgress = mergeSoloProgress(
    ensureProgressShape(local),
    ensureProgressShape(remote),
  )

  const localRulesTs = local.generationRulesUpdatedAt ?? 0
  const remoteRulesTs = remote.generationRulesUpdatedAt ?? 0
  const generationRules =
    localRulesTs >= remoteRulesTs
      ? local.generationRules
      : remote.generationRules
  const generationRulesUpdatedAt =
    localRulesTs >= remoteRulesTs ? localRulesTs : remoteRulesTs

  return {
    name: remote.name ?? local.name ?? null,
    team: mergedRoster.team,
    box: mergedRoster.box,
    dead: mergedRoster.dead,
    _tombstones: mergedRoster._tombstones,
    defeatedGyms: mergedProgress.defeatedGyms,
    pinnedGym: mergedProgress.pinnedGym,
    progressUpdatedAt: mergedProgress.updatedAt,
    generationRules: generationRules ?? local.generationRules,
    generationRulesUpdatedAt: generationRulesUpdatedAt || null,
  }
}

export function buildSoloRemotePayload(snapshot) {
  return {
    name: snapshot.name ?? null,
    team: snapshot.team ?? [],
    box: snapshot.box ?? [],
    dead: snapshot.dead ?? [],
    _tombstones: snapshot._tombstones ?? [],
    defeatedGyms: snapshot.defeatedGyms ?? [],
    pinnedGym: snapshot.pinnedGym ?? null,
    progressUpdatedAt: snapshot.progressUpdatedAt ?? null,
    generationRules: snapshot.generationRules,
    generationRulesUpdatedAt: snapshot.generationRulesUpdatedAt ?? null,
  }
}

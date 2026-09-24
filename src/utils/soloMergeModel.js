import { pickSoloSnapshotFields } from './runSnapshot.js'
import {
  emptyProgress,
  emptyRoster,
  isNewerOrEqual,
  mergeRosterMembers,
} from './soulLinkModel.js'

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
    { ...emptyRoster(), ...localRoster },
    { ...emptyRoster(), ...remoteRoster },
  )
}

export function mergeSoloProgress(localProgress, remoteProgress) {
  const local = { ...emptyProgress(), ...localProgress }
  const remote = { ...emptyProgress(), ...remoteProgress }
  return isNewerOrEqual(local.updatedAt, remote.updatedAt) ? local : remote
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
  const preferLocalRules = isNewerOrEqual(localRulesTs, remoteRulesTs)
  const generationRules = preferLocalRules
    ? local.generationRules
    : remote.generationRules
  const generationRulesUpdatedAt = preferLocalRules
    ? localRulesTs
    : remoteRulesTs

  const preferLocalTera = isNewerOrEqual(
    local.teraEnabledUpdatedAt,
    remote.teraEnabledUpdatedAt,
  )
  const teraEnabled = preferLocalTera ? local.teraEnabled : remote.teraEnabled
  const teraEnabledUpdatedAt = preferLocalTera
    ? (local.teraEnabledUpdatedAt ?? 0)
    : (remote.teraEnabledUpdatedAt ?? 0)

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
    teraEnabled: teraEnabled ?? local.teraEnabled ?? false,
    teraEnabledUpdatedAt: teraEnabledUpdatedAt || null,
  }
}

export function buildSoloRemotePayload(snapshot) {
  return {
    name: snapshot.name ?? null,
    ...pickSoloSnapshotFields(snapshot),
  }
}

function formatMember(m) {
  const ts = m.updatedAt ? new Date(m.updatedAt).toISOString() : '(none)'
  return [
    m.speciesName ?? '(empty)',
    `| id: ${m.id}`,
    `| catchLocation: ${m.catchLocation ?? '(none)'}`,
    `| pairId: ${m.pairId ?? '(none)'}`,
    `| updatedAt: ${ts}`,
  ].join(' ')
}

function logRosterKey(roster, key) {
  if (!roster[key]?.length) return
  console.group(`${key} (${roster[key].length})`)
  for (const m of roster[key]) {
    console.log(formatMember(m))
  }
  console.groupEnd()
}

function logTombstones(roster) {
  const tombstones = roster._tombstones ?? []
  if (!tombstones.length) return
  console.group(`tombstones (${tombstones.length})`)
  for (const t of tombstones) {
    console.log(
      `memberId: ${t.memberId}`,
      `| deletedAt: ${new Date(t.deletedAt).toISOString()}`,
    )
  }
  console.groupEnd()
}

function collectAllMemberIds(rostersValue) {
  const ids = new Set()
  for (const pid of Object.keys(rostersValue)) {
    for (const m of [
      ...(rostersValue[pid].team ?? []),
      ...(rostersValue[pid].box ?? []),
    ]) {
      ids.add(m.id)
    }
  }
  return ids
}

export function createDevTools({
  players,
  rosters,
  sessionMetadata,
  updateRosterMember,
  pullState,
  pushState,
}) {
  function inspect() {
    for (const player of players.value) {
      const roster = rosters.value[player.id]
      if (!roster) continue

      const label = `${player.name} (${player.id})${player.isLocal ? ' [local]' : ''}`
      console.group(label)
      logRosterKey(roster, 'team')
      logRosterKey(roster, 'box')
      logTombstones(roster)
      console.groupEnd()
    }
  }

  async function inspectRemote() {
    if (!sessionMetadata.value?.sessionId) {
      console.log('No remote session connected')
      return
    }

    try {
      await pullState()
      console.log('Pulled latest remote state. Running inspect:')
      inspect()
    } catch (error) {
      console.error('Failed to pull remote state:', error)
    }
  }

  function rosterEntries() {
    const entries = []
    for (const pid of Object.keys(rosters.value)) {
      const roster = rosters.value[pid]
      for (const key of ['team', 'box']) {
        for (const m of roster[key] ?? []) {
          entries.push({ pid, key, member: m })
        }
      }
    }
    return entries
  }

  function findStalePairEntries() {
    const allIds = collectAllMemberIds(rosters.value)
    return rosterEntries().filter(
      ({ member }) => member.pairId && !allIds.has(member.pairId),
    )
  }

  function clearStalePairIds() {
    const stale = findStalePairEntries()
    for (const { pid, key, member } of stale) {
      console.log(
        `Clearing stale pairId on ${member.speciesName} (${member.id}): was ${member.pairId}`,
      )
      updateRosterMember(pid, key, member.id, { pairId: null })
    }

    const msg = stale.length
      ? `Cleared ${stale.length} stale pairId(s)`
      : 'No stale pairIds found'
    console.log(msg)
  }

  function findMemberById(id) {
    for (const entry of rosterEntries()) {
      if (entry.member.id === id) return entry
    }
    return null
  }

  async function fixAsymmetricPairings({ force = false } = {}) {
    let fixed = 0
    let conflicts = 0

    for (const { member: a } of rosterEntries()) {
      if (!a.pairId) continue
      const bEntry = findMemberById(a.pairId)
      if (!bEntry) continue

      const b = bEntry.member
      if (b.pairId === a.id) continue

      if (b.pairId && b.pairId !== a.id && !force) {
        console.warn(
          `Conflict: ${a.speciesName} (${a.id}) → ${b.speciesName} (${b.id}), but ${b.speciesName} → ${b.pairId}. Use { force: true } to override.`,
        )
        conflicts++
        continue
      }

      const action = b.pairId ? 'Overriding' : 'Fixing'
      console.log(
        `${action}: ${b.speciesName} (${b.id}) pairId → ${a.id} (${a.speciesName})`,
      )
      updateRosterMember(bEntry.pid, bEntry.key, b.id, { pairId: a.id })
      fixed++
    }

    console.log(`Fixed ${fixed} pairing(s), ${conflicts} conflict(s)`)

    if (fixed > 0) {
      clearStalePairIds()
      if (sessionMetadata.value?.sessionId) {
        await pushState()
        console.log('Pushed fixes to remote')
      }
    }
  }

  return { inspect, inspectRemote, clearStalePairIds, fixAsymmetricPairings }
}

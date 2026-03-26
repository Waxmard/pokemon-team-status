export function normalizeCatchLocation(location) {
  return location?.toLowerCase()?.trim() ?? null
}

function getAllMembers(roster) {
  return [...roster.team, ...roster.box, ...(roster.dead ?? [])]
}

export function preserveSoulLinkPairingFields(member, sourceMember) {
  if (!member) return member

  const hasMemberCatchLocation = Object.hasOwn(member, 'catchLocation')
  const hasMemberPairId = Object.hasOwn(member, 'pairId')

  return {
    ...member,
    catchLocation: hasMemberCatchLocation
      ? member.catchLocation
      : (sourceMember?.catchLocation ?? null),
    pairId: hasMemberPairId ? member.pairId : (sourceMember?.pairId ?? null),
  }
}

function findRosterKey(roster, memberId) {
  if (roster.team.some((m) => m.id === memberId)) return 'team'
  if (roster.box.some((m) => m.id === memberId)) return 'box'
  return 'dead'
}

export function findLinkedDeleteTarget(
  playerId,
  memberId,
  rosterKey,
  { getPlayerRoster, partnerId },
) {
  const roster = getPlayerRoster(playerId)
  const member = roster[rosterKey].find((m) => m.id === memberId)
  if (!member?.pairId) return null
  if (!partnerId) return null

  const partnerRoster = getPlayerRoster(partnerId)
  const partnerMember = getAllMembers(partnerRoster).find(
    (m) => m.id === member.pairId,
  )
  if (!partnerMember) return null

  return {
    memberId,
    rosterKey,
    partnerPlayerId: partnerId,
    partnerMemberId: partnerMember.id,
    partnerRosterKey: findRosterKey(partnerRoster, partnerMember.id),
  }
}

function clearPartnerPairing(
  partnerId,
  partnerRoster,
  existingPartner,
  updateRosterMember,
) {
  updateRosterMember(
    partnerId,
    findRosterKey(partnerRoster, existingPartner.id),
    existingPartner.id,
    { pairId: null },
  )
}

function displaceOldPairOfPartner(playerId, memberId, matchingPartner, ctx) {
  if (!matchingPartner.pairId || matchingPartner.pairId === memberId) return

  const myRoster = ctx.getPlayerRoster(playerId)
  const oldPairOfPartner = getAllMembers(myRoster).find(
    (m) => m.id === matchingPartner.pairId,
  )
  if (oldPairOfPartner) {
    ctx.updateRosterMember(
      playerId,
      findRosterKey(myRoster, oldPairOfPartner.id),
      oldPairOfPartner.id,
      { pairId: null },
    )
  }
}

export function reconcileSoulLinkPairing(
  playerId,
  memberId,
  rosterKey,
  { getPlayerRoster, updateRosterMember, partnerId },
) {
  const roster = getPlayerRoster(playerId)
  const member = roster[rosterKey].find((m) => m.id === memberId)
  if (!member || !partnerId) return

  const partnerRoster = getPlayerRoster(partnerId)
  const allPartnerMembers = getAllMembers(partnerRoster)

  const normalizedCatchLocation = normalizeCatchLocation(member.catchLocation)
  const existingPartner = member.pairId
    ? allPartnerMembers.find((m) => m.id === member.pairId)
    : null

  if (!normalizedCatchLocation) {
    if (existingPartner) {
      clearPartnerPairing(
        partnerId,
        partnerRoster,
        existingPartner,
        updateRosterMember,
      )
    }
    updateRosterMember(playerId, rosterKey, memberId, { pairId: null })
    return
  }

  if (
    normalizeCatchLocation(existingPartner?.catchLocation) ===
    normalizedCatchLocation
  ) {
    if (existingPartner.pairId !== memberId) {
      updateRosterMember(
        partnerId,
        findRosterKey(partnerRoster, existingPartner.id),
        existingPartner.id,
        { pairId: memberId },
      )
    }
    return
  }

  if (existingPartner) {
    clearPartnerPairing(
      partnerId,
      partnerRoster,
      existingPartner,
      updateRosterMember,
    )
  }

  const matchingPartner = allPartnerMembers.find(
    (m) =>
      normalizeCatchLocation(m.catchLocation) === normalizedCatchLocation &&
      m.id !== member.pairId,
  )

  if (matchingPartner) {
    displaceOldPairOfPartner(playerId, memberId, matchingPartner, {
      getPlayerRoster,
      updateRosterMember,
    })
    updateRosterMember(playerId, rosterKey, memberId, {
      pairId: matchingPartner.id,
    })
    updateRosterMember(
      partnerId,
      findRosterKey(partnerRoster, matchingPartner.id),
      matchingPartner.id,
      { pairId: memberId },
    )
  } else {
    updateRosterMember(playerId, rosterKey, memberId, { pairId: null })
  }
}

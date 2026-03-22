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
  return roster.team.some((m) => m.id === memberId) ? 'team' : 'box'
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
  const partnerMember = [...partnerRoster.team, ...partnerRoster.box].find(
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

export function reconcileSoulLinkPairing(
  playerId,
  memberId,
  rosterKey,
  { getPlayerRoster, updateRosterMember, partnerId },
) {
  const roster = getPlayerRoster(playerId)
  const member = roster[rosterKey].find((m) => m.id === memberId)
  if (!member) return
  if (!partnerId) return

  const partnerRoster = getPlayerRoster(partnerId)
  const allPartnerMembers = [...partnerRoster.team, ...partnerRoster.box]

  const normalizedCatchLocation = member.catchLocation?.toLowerCase() ?? null
  const existingPartner = member.pairId
    ? allPartnerMembers.find((m) => m.id === member.pairId)
    : null

  if (!normalizedCatchLocation) {
    if (existingPartner) {
      updateRosterMember(
        partnerId,
        findRosterKey(partnerRoster, existingPartner.id),
        existingPartner.id,
        { pairId: null },
      )
    }
    updateRosterMember(playerId, rosterKey, memberId, { pairId: null })
    return
  }

  if (
    existingPartner?.catchLocation?.toLowerCase() === normalizedCatchLocation
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
    updateRosterMember(
      partnerId,
      findRosterKey(partnerRoster, existingPartner.id),
      existingPartner.id,
      { pairId: null },
    )
  }

  const matchingPartner = allPartnerMembers.find(
    (m) =>
      m.catchLocation &&
      m.catchLocation.toLowerCase() === normalizedCatchLocation &&
      m.id !== member.pairId,
  )

  if (matchingPartner) {
    if (matchingPartner.pairId && matchingPartner.pairId !== memberId) {
      const myRoster = getPlayerRoster(playerId)
      const allMyMembers = [...myRoster.team, ...myRoster.box]
      const oldPairOfPartner = allMyMembers.find(
        (m) => m.id === matchingPartner.pairId,
      )
      if (oldPairOfPartner) {
        updateRosterMember(
          playerId,
          findRosterKey(myRoster, oldPairOfPartner.id),
          oldPairOfPartner.id,
          { pairId: null },
        )
      }
    }

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

export function updateReciprocalSoulLinkPairId(
  previousMemberId,
  nextMemberId,
  { getPlayerRoster, updateRosterMember, partnerId },
) {
  if (!previousMemberId || !nextMemberId || previousMemberId === nextMemberId) {
    return
  }
  if (!partnerId) return

  const partnerRoster = getPlayerRoster(partnerId)
  const partnerMember = [...partnerRoster.team, ...partnerRoster.box].find(
    (member) => member.pairId === previousMemberId,
  )
  if (!partnerMember) return

  updateRosterMember(
    partnerId,
    findRosterKey(partnerRoster, partnerMember.id),
    partnerMember.id,
    { pairId: nextMemberId },
  )
}

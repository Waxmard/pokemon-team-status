import { ref } from 'vue'
import { getPokemonDataForRules } from '../data/pokemon.js'
import { buildPokemonMember, pickMemberFields } from '../utils/pokemon.js'
import {
  findLinkedDeleteTarget as findLinkedDeleteTargetUtil,
  preserveSoulLinkPairingFields,
  reconcileSoulLinkPairing as reconcileSoulLinkPairingUtil,
} from '../utils/soulLinkPairing.js'
import {
  adaptSoulLinkMemberToUiMember,
  adaptUiMemberToSoulLinkMember,
  buildSoulLinkMemberFromDraft,
} from '../utils/soulLinkUi.js'
import { useDraftAction } from './useDraftAction.js'
import { useSoulLinkStore } from './useSoulLinkStore.js'

export function useSoulLinkHandlers(
  viewedSoulLinkPlayerId,
  soulLinkGenerationRules,
  soulLinkPlayers,
) {
  const {
    getPlayerRoster,
    getFullPlayerRoster,
    getPlayerGymProgress,
    setPlayerRoster,
    addRosterMember,
    updateRosterMember,
    removeRosterMember: removeSoulLinkRosterMember,
    killRosterMember,
    reviveRosterMember,
    getPlayerDead,
    updatePlayerGymProgress,
    sessionMetadata: soulLinkSessionMetadata,
    pushState: pushSoulLinkState,
  } = useSoulLinkStore()

  const {
    draftAction,
    cancel,
    enterSwapMode,
    exitSwapMode,
    updateInHandPokemon,
  } = useDraftAction()

  const linkedDeleteTarget = ref(null)
  const soulLinkSwapOriginalRoster = ref(null)

  function triggerSync() {
    if (!soulLinkSessionMetadata.value?.sessionId) return
    pushSoulLinkState().catch((err) => console.error('Push failed:', err))
  }

  // --- Soul Link helpers ---

  function getSoulLinkRoster() {
    return getPlayerRoster(viewedSoulLinkPlayerId.value)
  }

  function getSoulLinkGenRulesPokemonData(name) {
    return getPokemonDataForRules(name, soulLinkGenerationRules.value)
  }

  function findPartnerPlayerId() {
    return soulLinkPlayers.value.find(
      (p) => p.id !== viewedSoulLinkPlayerId.value,
    )?.id
  }

  function getPairingContext() {
    return {
      getPlayerRoster: getFullPlayerRoster,
      updateRosterMember,
      partnerId: findPartnerPlayerId(),
    }
  }

  function reconcileSoulLinkPairing(playerId, memberId, rosterKey) {
    reconcileSoulLinkPairingUtil(
      playerId,
      memberId,
      rosterKey,
      getPairingContext(),
    )
  }

  function refreshSoulLinkDraftMetadata(member) {
    if (!draftAction.value) return
    draftAction.value.catchLocation = member?.catchLocation ?? null
    draftAction.value.pairId = member?.pairId ?? null
    draftAction.value.nickname = member?.nickname ?? null
  }

  // --- Soul Link gym handlers ---

  function handleSoulLinkDefeatGym(type) {
    const pid = viewedSoulLinkPlayerId.value
    const progress = getPlayerGymProgress(pid)
    updatePlayerGymProgress(pid, {
      defeatedGyms: [...progress.defeatedGyms, type],
    })
  }

  function handleSoulLinkUndefeatGym(type) {
    const pid = viewedSoulLinkPlayerId.value
    const progress = getPlayerGymProgress(pid)
    updatePlayerGymProgress(pid, {
      defeatedGyms: progress.defeatedGyms.filter((g) => g !== type),
    })
  }

  function handleSoulLinkPersistPinnedGym(type) {
    updatePlayerGymProgress(viewedSoulLinkPlayerId.value, { pinnedGym: type })
  }

  // --- Soul Link delete handlers ---

  function findLinkedDeleteTarget(playerId, memberId, rosterKey) {
    return findLinkedDeleteTargetUtil(
      playerId,
      memberId,
      rosterKey,
      getPairingContext(),
    )
  }

  function tryLinkedDelete(pid, memberId, rosterKey) {
    const target = findLinkedDeleteTarget(pid, memberId, rosterKey)
    if (target) {
      linkedDeleteTarget.value = target
      return true
    }
    removeSoulLinkRosterMember(pid, rosterKey, memberId)
    return false
  }

  function confirmLinkedDelete() {
    if (!linkedDeleteTarget.value) return
    const pid = viewedSoulLinkPlayerId.value
    const t = linkedDeleteTarget.value

    removeSoulLinkRosterMember(pid, t.rosterKey, t.memberId)
    removeSoulLinkRosterMember(
      t.partnerPlayerId,
      t.partnerRosterKey,
      t.partnerMemberId,
    )

    linkedDeleteTarget.value = null
    cancel()
    triggerSync()
  }

  function handleSoulLinkDeleteTeamPokemon(id) {
    if (!tryLinkedDelete(viewedSoulLinkPlayerId.value, id, 'team'))
      triggerSync()
  }

  function handleSoulLinkDeleteBoxPokemon(id) {
    if (!tryLinkedDelete(viewedSoulLinkPlayerId.value, id, 'box')) triggerSync()
  }

  function handleSoulLinkDeleteFromDraft() {
    if (!draftAction.value) return
    const pid = viewedSoulLinkPlayerId.value

    if (draftAction.value.isBoxPokemon) {
      if (tryLinkedDelete(pid, draftAction.value.boxPokemonId, 'box')) return
    } else if (draftAction.value.editId) {
      if (tryLinkedDelete(pid, draftAction.value.editId, 'team')) return
    }
    triggerSync()
    cancel()
  }

  // --- Soul Link confirm draft handlers ---

  function confirmSoulLinkBoxPokemonReplace(pid, newMember) {
    const roster = getSoulLinkRoster()
    const boxPokemonId = draftAction.value.boxPokemonId

    if (draftAction.value.replaceTarget.startsWith('empty-')) {
      if (roster.team.length >= 6) return
      const boxedMember = roster.box.find((m) => m.id === boxPokemonId)
      const movedMember = preserveSoulLinkPairingFields(
        { ...newMember, id: boxPokemonId },
        boxedMember,
      )
      addRosterMember(pid, 'team', movedMember)
      removeSoulLinkRosterMember(pid, 'box', boxPokemonId)
      reconcileSoulLinkPairing(pid, movedMember.id, 'team')
      return
    }

    const boxedMember = roster.box.find((m) => m.id === boxPokemonId)
    const replacedTeamMember = roster.team.find(
      (m) => m.id === draftAction.value.replaceTarget,
    )
    if (!boxedMember || !replacedTeamMember) return

    const nextTeamMember = preserveSoulLinkPairingFields(
      { ...newMember, id: boxPokemonId },
      boxedMember,
    )

    const now = Date.now()
    setPlayerRoster(pid, {
      team: roster.team.map((m) =>
        m.id === draftAction.value.replaceTarget
          ? { ...nextTeamMember, updatedAt: now }
          : m,
      ),
      box: roster.box.map((m) =>
        m.id === boxPokemonId ? { ...replacedTeamMember, updatedAt: now } : m,
      ),
    })

    reconcileSoulLinkPairing(pid, nextTeamMember.id, 'team')
    reconcileSoulLinkPairing(pid, replacedTeamMember.id, 'box')
  }

  function confirmSoulLinkMemberUpdate(pid, rosterKey, memberId) {
    const uiMember = buildPokemonMember(draftAction.value, { id: memberId })
    const slMember = adaptUiMemberToSoulLinkMember(
      { ...uiMember, catchLocation: draftAction.value.catchLocation ?? null },
      pid,
    )
    const { id, ownerPlayerId, ...updates } = slMember
    updateRosterMember(pid, rosterKey, memberId, updates)
    reconcileSoulLinkPairing(pid, memberId, rosterKey)
  }

  function enterSoulLinkAddReplaceMode(pid) {
    soulLinkSwapOriginalRoster.value = getSoulLinkRoster()

    const tempMember = buildSoulLinkMemberFromDraft(
      draftAction.value,
      pid,
      'temp',
    )
    addRosterMember(pid, 'box', tempMember)

    draftAction.value = {
      ...draftAction.value,
      type: 'edit',
      isBoxPokemon: true,
      isAddReplace: true,
      boxPokemonId: tempMember.id,
    }

    enterSwapMode()
  }

  function handleSoulLinkConfirmEdit(pid, newMember) {
    if (draftAction.value.isBoxPokemon) {
      if (draftAction.value.replaceTarget) {
        confirmSoulLinkBoxPokemonReplace(pid, newMember)
      } else {
        confirmSoulLinkMemberUpdate(pid, 'box', draftAction.value.boxPokemonId)
      }
    } else {
      confirmSoulLinkMemberUpdate(pid, 'team', draftAction.value.editId)
    }
  }

  function handleSoulLinkAddDraft(pid, newMember) {
    const roster = getSoulLinkRoster()
    if (roster.team.length >= 6) {
      enterSoulLinkAddReplaceMode(pid)
      return false
    }

    addRosterMember(pid, 'team', newMember)
    reconcileSoulLinkPairing(pid, newMember.id, 'team')
    return true
  }

  function handleSoulLinkAddToRoster(pid, rosterKey) {
    const newMember = buildSoulLinkMemberFromDraft(
      draftAction.value,
      pid,
      rosterKey,
    )

    addRosterMember(pid, rosterKey, newMember)
    reconcileSoulLinkPairing(pid, newMember.id, rosterKey)
  }

  function handleSoulLinkEditDraft(pid, newMember) {
    if (draftAction.value.isDeadPokemon) {
      confirmSoulLinkMemberUpdate(pid, 'dead', draftAction.value.deadPokemonId)
      return
    }

    handleSoulLinkConfirmEdit(pid, newMember)
  }

  function confirmSoulLinkDraftByType(pid, newMember) {
    switch (draftAction.value.type) {
      case 'add':
        return handleSoulLinkAddDraft(pid, newMember)
      case 'addToBox':
        handleSoulLinkAddToRoster(pid, 'box')
        return true
      case 'addToDead':
        handleSoulLinkAddToRoster(pid, 'dead')
        return true
      case 'edit':
        handleSoulLinkEditDraft(pid, newMember)
        return true
      default:
        return true
    }
  }

  function handleSoulLinkConfirmDraft() {
    if (!draftAction.value) return
    const pid = viewedSoulLinkPlayerId.value

    if (!draftAction.value.pokemon) {
      handleSoulLinkDeleteFromDraft()
      return
    }

    const newMember = buildSoulLinkMemberFromDraft(
      draftAction.value,
      pid,
      'team',
    )

    if (!confirmSoulLinkDraftByType(pid, newMember)) return

    cancel()
    triggerSync()
  }

  // --- Soul Link swap handlers ---

  function handleSoulLinkCancelSwap() {
    if (soulLinkSwapOriginalRoster.value) {
      setPlayerRoster(
        viewedSoulLinkPlayerId.value,
        soulLinkSwapOriginalRoster.value,
      )
    }
    exitSwapMode()
    soulLinkSwapOriginalRoster.value = null
  }

  function handleSoulLinkBoxToTeamSwap(targetId, pid, roster) {
    const boxPokemonId = draftAction.value.boxPokemonId
    const boxedMember = roster.box.find((member) => member.id === boxPokemonId)
    const inHandMember = preserveSoulLinkPairingFields(
      {
        ...buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
        id: boxPokemonId,
      },
      boxedMember,
    )

    if (targetId === null) {
      if (roster.team.length >= 6) return
      addRosterMember(pid, 'team', inHandMember)
      removeSoulLinkRosterMember(pid, 'box', boxPokemonId)
      reconcileSoulLinkPairing(pid, inHandMember.id, 'team')
      exitSwapMode()
      return
    }

    const targetMember = roster.team.find((m) => m.id === targetId)
    if (!targetMember) return

    const now = Date.now()
    setPlayerRoster(pid, {
      team: roster.team.map((m) =>
        m.id === targetId ? { ...inHandMember, updatedAt: now } : m,
      ),
      box: roster.box.map((m) =>
        m.id === boxPokemonId ? { ...targetMember, updatedAt: now } : m,
      ),
    })

    updateInHandPokemon({
      pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
      ...adaptSoulLinkMemberToUiMember(targetMember),
    })
    refreshSoulLinkDraftMetadata(targetMember)
    draftAction.value.boxPokemonId = targetId
  }

  function handleSoulLinkTeamToBoxSwap(targetId, pid, roster) {
    const teamPokemonId = draftAction.value.editId
    const teamMember = roster.team.find((member) => member.id === teamPokemonId)
    const inHandMember = preserveSoulLinkPairingFields(
      {
        ...buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
        id: teamPokemonId,
      },
      teamMember,
    )

    if (targetId === null) {
      const boxMember = { ...inHandMember, id: teamPokemonId }
      addRosterMember(pid, 'box', boxMember)
      removeSoulLinkRosterMember(pid, 'team', teamPokemonId)
      reconcileSoulLinkPairing(pid, boxMember.id, 'box')
      exitSwapMode()
      return
    }

    const targetMember = roster.box.find((m) => m.id === targetId)
    if (!targetMember) return

    const now = Date.now()
    setPlayerRoster(pid, {
      team: roster.team.map((m) =>
        m.id === teamPokemonId ? { ...targetMember, updatedAt: now } : m,
      ),
      box: roster.box.map((m) =>
        m.id === targetId ? { ...inHandMember, updatedAt: now } : m,
      ),
    })

    updateInHandPokemon({
      pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
      ...adaptSoulLinkMemberToUiMember(targetMember),
    })
    refreshSoulLinkDraftMetadata(targetMember)
    draftAction.value.editId = targetId
  }

  function handleSoulLinkImmediateSwap(targetId) {
    if (!draftAction.value?.pokemon) return

    const pid = viewedSoulLinkPlayerId.value
    const roster = getSoulLinkRoster()

    if (draftAction.value.isBoxPokemon) {
      handleSoulLinkBoxToTeamSwap(targetId, pid, roster)
    } else if (draftAction.value.isTeamPokemon) {
      handleSoulLinkTeamToBoxSwap(targetId, pid, roster)
    }
  }

  function handleSoulLinkSwapSuggestion({
    currentId,
    candidateId,
    isTeamMember,
  }) {
    const pid = viewedSoulLinkPlayerId.value
    const roster = getSoulLinkRoster()
    soulLinkSwapOriginalRoster.value = roster

    if (isTeamMember) {
      const teamMember = roster.team.find((m) => m.id === currentId)
      const boxMember = roster.box.find((m) => m.id === candidateId)
      if (!teamMember || !boxMember) return

      const now = Date.now()
      setPlayerRoster(pid, {
        team: roster.team.map((m) =>
          m.id === currentId ? { ...boxMember, updatedAt: now } : m,
        ),
        box: roster.box.map((m) =>
          m.id === candidateId ? { ...teamMember, updatedAt: now } : m,
        ),
      })

      const pokemonData = getSoulLinkGenRulesPokemonData(teamMember.speciesName)
      draftAction.value = {
        type: 'edit',
        isBoxPokemon: true,
        isTeamPokemon: false,
        boxPokemonId: currentId,
        pokemon: pokemonData,
        ...pickMemberFields(teamMember),
        moves: [...(teamMember.moves || [])],
      }
    } else {
      handleSoulLinkImmediateSwap(candidateId)
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
    enterSwapMode()
  }

  // --- Soul Link death handlers ---

  function handleSoulLinkKillPokemon({ id, rosterKey }) {
    const pid = viewedSoulLinkPlayerId.value
    const target = findLinkedDeleteTarget(pid, id, rosterKey)

    // Kill the member
    killRosterMember(pid, rosterKey, id)

    // Kill the paired partner too
    if (target) {
      killRosterMember(
        target.partnerPlayerId,
        target.partnerRosterKey,
        target.partnerMemberId,
      )
    }

    cancel()
    triggerSync()
  }

  function handleSoulLinkRevivePokemon(memberId) {
    const pid = viewedSoulLinkPlayerId.value
    const deadRoster = getPlayerDead(pid)
    const member = deadRoster.find((m) => m.id === memberId)
    if (!member) return

    // Revive the member
    reviveRosterMember(pid, memberId)

    // Revive the paired partner if they're also dead
    const partnerPid = findPartnerPlayerId()
    if (member.pairId && partnerPid) {
      const partnerDead = getPlayerDead(partnerPid)
      if (partnerDead.some((m) => m.id === member.pairId)) {
        reviveRosterMember(partnerPid, member.pairId)
      }
    }

    triggerSync()
  }

  function handleSoulLinkDeleteDeadPokemon({ id }) {
    const pid = viewedSoulLinkPlayerId.value
    removeSoulLinkRosterMember(pid, 'dead', id)
    triggerSync()
  }

  return {
    linkedDeleteTarget,
    soulLinkSwapOriginalRoster,
    triggerSync,
    handleSoulLinkConfirmDraft,
    handleSoulLinkImmediateSwap,
    handleSoulLinkCancelSwap,
    handleSoulLinkSwapSuggestion,
    handleSoulLinkDeleteTeamPokemon,
    handleSoulLinkDeleteBoxPokemon,
    handleSoulLinkDeleteFromDraft,
    handleSoulLinkDefeatGym,
    handleSoulLinkUndefeatGym,
    handleSoulLinkPersistPinnedGym,
    confirmLinkedDelete,
    handleSoulLinkKillPokemon,
    handleSoulLinkRevivePokemon,
    handleSoulLinkDeleteDeadPokemon,
  }
}

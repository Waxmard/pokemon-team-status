import { ref } from 'vue'
import { getPokemonDataForRules } from '../data/pokemon.js'
import {
  buildPokemonMember,
  generatePokemonId,
  pickMemberFields,
} from '../utils/pokemon.js'
import {
  findLinkedDeleteTarget as findLinkedDeleteTargetUtil,
  preserveSoulLinkPairingFields,
  reconcileSoulLinkPairing as reconcileSoulLinkPairingUtil,
  updateReciprocalSoulLinkPairId as updateReciprocalSoulLinkPairIdUtil,
} from '../utils/soulLinkPairing.js'
import {
  adaptSoulLinkMemberToUiMember,
  adaptUiMemberToSoulLinkMember,
  buildSoulLinkMemberFromDraft,
  cloneSoulLinkMember,
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
    getPlayerGymProgress,
    setPlayerRoster,
    addRosterMember,
    updateRosterMember,
    removeRosterMember: removeSoulLinkRosterMember,
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
      getPlayerRoster,
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

  function updateReciprocalSoulLinkPairId(previousMemberId, nextMemberId) {
    updateReciprocalSoulLinkPairIdUtil(
      previousMemberId,
      nextMemberId,
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
    const target = findLinkedDeleteTarget(
      viewedSoulLinkPlayerId.value,
      id,
      'team',
    )
    if (target) {
      linkedDeleteTarget.value = target
      return
    }
    removeSoulLinkRosterMember(viewedSoulLinkPlayerId.value, 'team', id)
    triggerSync()
  }

  function handleSoulLinkDeleteBoxPokemon(id) {
    const target = findLinkedDeleteTarget(
      viewedSoulLinkPlayerId.value,
      id,
      'box',
    )
    if (target) {
      linkedDeleteTarget.value = target
      return
    }
    removeSoulLinkRosterMember(viewedSoulLinkPlayerId.value, 'box', id)
    triggerSync()
  }

  function handleSoulLinkDeleteFromDraft() {
    if (!draftAction.value) return
    const pid = viewedSoulLinkPlayerId.value

    if (draftAction.value.isBoxPokemon) {
      const target = findLinkedDeleteTarget(
        pid,
        draftAction.value.boxPokemonId,
        'box',
      )
      if (target) {
        linkedDeleteTarget.value = target
        return
      }
      removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
    } else if (draftAction.value.editId) {
      const target = findLinkedDeleteTarget(
        pid,
        draftAction.value.editId,
        'team',
      )
      if (target) {
        linkedDeleteTarget.value = target
        return
      }
      removeSoulLinkRosterMember(pid, 'team', draftAction.value.editId)
    }
    triggerSync()
    cancel()
  }

  // --- Soul Link confirm draft handlers ---

  function confirmSoulLinkBoxPokemonReplace(pid, newMember) {
    const roster = getSoulLinkRoster()

    if (draftAction.value.replaceTarget.startsWith('empty-')) {
      if (roster.team.length >= 6) return
      const boxedMember = roster.box.find(
        (m) => m.id === draftAction.value.boxPokemonId,
      )
      const movedMember = preserveSoulLinkPairingFields(newMember, boxedMember)
      addRosterMember(pid, 'team', movedMember)
      removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
      updateReciprocalSoulLinkPairId(
        draftAction.value.boxPokemonId,
        movedMember.id,
      )
      reconcileSoulLinkPairing(pid, movedMember.id, 'team')
      return
    }

    const boxedMember = roster.box.find(
      (m) => m.id === draftAction.value.boxPokemonId,
    )
    const replacedTeamMember = roster.team.find(
      (m) => m.id === draftAction.value.replaceTarget,
    )
    if (!boxedMember || !replacedTeamMember) return

    const nextTeamMember = preserveSoulLinkPairingFields(newMember, boxedMember)
    const uiReplaced = {
      id: generatePokemonId('box'),
      name: replacedTeamMember.speciesName,
      types: replacedTeamMember.types,
      ability: replacedTeamMember.ability,
      berry: replacedTeamMember.berry,
      moves: replacedTeamMember.moves,
      specialMove: replacedTeamMember.specialMove,
      megaForm: replacedTeamMember.megaForm,
      megaTypes: replacedTeamMember.megaTypes,
      megaSpriteId: replacedTeamMember.megaSpriteId,
      spriteVariant: replacedTeamMember.spriteVariant,
      catchLocation: replacedTeamMember.catchLocation,
      pairId: replacedTeamMember.pairId,
    }
    const boxMember = preserveSoulLinkPairingFields(
      adaptUiMemberToSoulLinkMember(uiReplaced, pid),
      replacedTeamMember,
    )

    setPlayerRoster(pid, {
      team: roster.team.map((m) =>
        m.id === draftAction.value.replaceTarget ? nextTeamMember : m,
      ),
      box: roster.box.map((m) =>
        m.id === draftAction.value.boxPokemonId ? boxMember : m,
      ),
    })

    updateReciprocalSoulLinkPairId(
      draftAction.value.boxPokemonId,
      nextTeamMember.id,
    )
    updateReciprocalSoulLinkPairId(
      draftAction.value.replaceTarget,
      boxMember.id,
    )
    reconcileSoulLinkPairing(pid, nextTeamMember.id, 'team')
    reconcileSoulLinkPairing(pid, boxMember.id, 'box')
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

  function handleSoulLinkDraftDeletion(pid) {
    if (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon) {
      removeSoulLinkRosterMember(pid, 'team', draftAction.value.editId)
    } else if (
      draftAction.value.type === 'edit' &&
      draftAction.value.isBoxPokemon
    ) {
      removeSoulLinkRosterMember(pid, 'box', draftAction.value.boxPokemonId)
    }
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

  function handleSoulLinkConfirmDraft() {
    if (!draftAction.value) return
    const pid = viewedSoulLinkPlayerId.value

    if (!draftAction.value.pokemon) {
      handleSoulLinkDraftDeletion(pid)
      triggerSync()
      cancel()
      return
    }

    const newMember = buildSoulLinkMemberFromDraft(
      draftAction.value,
      pid,
      'team',
    )

    if (draftAction.value.type === 'add') {
      const roster = getSoulLinkRoster()
      if (roster.team.length < 6) {
        addRosterMember(pid, 'team', newMember)
        reconcileSoulLinkPairing(pid, newMember.id, 'team')
      } else {
        enterSoulLinkAddReplaceMode(pid)
        return
      }
    } else if (draftAction.value.type === 'addToBox') {
      const boxMember = buildSoulLinkMemberFromDraft(
        draftAction.value,
        pid,
        'box',
      )
      addRosterMember(pid, 'box', boxMember)
      reconcileSoulLinkPairing(pid, boxMember.id, 'box')
    } else if (draftAction.value.type === 'edit') {
      handleSoulLinkConfirmEdit(pid, newMember)
    }

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
      buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
      boxedMember,
    )

    if (targetId === null) {
      if (roster.team.length >= 6) return
      addRosterMember(pid, 'team', inHandMember)
      removeSoulLinkRosterMember(pid, 'box', boxPokemonId)
      updateReciprocalSoulLinkPairId(boxPokemonId, inHandMember.id)
      reconcileSoulLinkPairing(pid, inHandMember.id, 'team')
      exitSwapMode()
      return
    }

    const targetMember = roster.team.find((m) => m.id === targetId)
    if (!targetMember) return

    const nextTeamMember = { ...inHandMember, id: generatePokemonId('team') }
    const newBoxMember = cloneSoulLinkMember(
      targetMember,
      generatePokemonId('box'),
    )

    setPlayerRoster(pid, {
      team: roster.team.map((m) => (m.id === targetId ? nextTeamMember : m)),
      box: roster.box.map((m) => (m.id === boxPokemonId ? newBoxMember : m)),
    })

    updateReciprocalSoulLinkPairId(boxPokemonId, nextTeamMember.id)
    updateReciprocalSoulLinkPairId(targetId, newBoxMember.id)

    updateInHandPokemon({
      pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
      ...adaptSoulLinkMemberToUiMember(targetMember),
    })
    refreshSoulLinkDraftMetadata(targetMember)
    draftAction.value.boxPokemonId = newBoxMember.id
  }

  function handleSoulLinkTeamToBoxSwap(targetId, pid, roster) {
    const teamPokemonId = draftAction.value.editId
    const teamMember = roster.team.find((member) => member.id === teamPokemonId)
    const inHandMember = preserveSoulLinkPairingFields(
      buildSoulLinkMemberFromDraft(draftAction.value, pid, 'team'),
      teamMember,
    )

    if (targetId === null) {
      const boxMember = preserveSoulLinkPairingFields(
        buildSoulLinkMemberFromDraft(draftAction.value, pid, 'box'),
        teamMember,
      )
      addRosterMember(pid, 'box', boxMember)
      removeSoulLinkRosterMember(pid, 'team', teamPokemonId)
      updateReciprocalSoulLinkPairId(teamPokemonId, boxMember.id)
      reconcileSoulLinkPairing(pid, boxMember.id, 'box')
      exitSwapMode()
      return
    }

    const targetMember = roster.box.find((m) => m.id === targetId)
    if (!targetMember) return

    const newTeamMember = cloneSoulLinkMember(
      targetMember,
      generatePokemonId('team'),
    )
    const nextBoxMember = { ...inHandMember, id: generatePokemonId('box') }

    setPlayerRoster(pid, {
      team: roster.team.map((m) =>
        m.id === teamPokemonId ? newTeamMember : m,
      ),
      box: roster.box.map((m) => (m.id === targetId ? nextBoxMember : m)),
    })

    updateReciprocalSoulLinkPairId(targetId, newTeamMember.id)
    updateReciprocalSoulLinkPairId(teamPokemonId, nextBoxMember.id)

    updateInHandPokemon({
      pokemonData: getSoulLinkGenRulesPokemonData(targetMember.speciesName),
      ...adaptSoulLinkMemberToUiMember(targetMember),
    })
    refreshSoulLinkDraftMetadata(targetMember)
    draftAction.value.editId = newTeamMember.id
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

      const newTeamMember = cloneSoulLinkMember(
        boxMember,
        generatePokemonId('team'),
      )
      const newBoxMember = cloneSoulLinkMember(
        teamMember,
        generatePokemonId('box'),
      )

      setPlayerRoster(pid, {
        team: roster.team.map((m) => (m.id === currentId ? newTeamMember : m)),
        box: roster.box.map((m) => (m.id === candidateId ? newBoxMember : m)),
      })

      updateReciprocalSoulLinkPairId(candidateId, newTeamMember.id)
      updateReciprocalSoulLinkPairId(currentId, newBoxMember.id)

      const pokemonData = getSoulLinkGenRulesPokemonData(teamMember.speciesName)
      draftAction.value = {
        type: 'edit',
        isBoxPokemon: true,
        isTeamPokemon: false,
        boxPokemonId: newBoxMember.id,
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
  }
}

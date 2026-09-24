import { computed, ref } from 'vue'
import { getPokemonDataForRules } from '../data/pokemon.js'
import { getAllTypesForRules } from '../data/types.js'
import { sanitizePokemonCollectionForRules } from '../utils/generationRules.js'
import { buildPokemonMember, pickMemberFields } from '../utils/pokemon.js'
import { sanitizeTeraTypeForCollection } from '../utils/runSnapshot.js'
import { calculateBerryTiebreaker, calculateScore } from '../utils/typeCalc.js'
import { useDraftAction } from './useDraftAction.js'
import { useRunStore } from './useRunStore.js'

export function useSoloDraftHandlers() {
  const {
    team,
    box,
    dead,
    defeatedGyms,
    generationRules,
    persistTeam,
    persistBox,
    persistDead,
    deleteTeamPokemon,
    deleteBoxPokemon,
    killTeamPokemon,
    killBoxPokemon,
    revivePokemon,
    deleteDeadPokemon,
  } = useRunStore()

  const {
    draftAction,
    enterSwapMode,
    exitSwapMode,
    startEditBox,
    updateInHandPokemon,
    updateBoxPokemonId,
    updateEditId,
    convertToBoxEdit,
    sanitizeDraft,
    cancel,
  } = useDraftAction()

  const activeTypes = computed(() => getAllTypesForRules(generationRules.value))

  function getRulesetPokemonData(name) {
    return getPokemonDataForRules(name, generationRules.value)
  }

  const swapOriginalState = ref(null)

  function captureSwapOriginal() {
    // Only capture if not already captured (e.g., by enterAddReplaceMode)
    if (!swapOriginalState.value) {
      swapOriginalState.value = {
        team: JSON.parse(JSON.stringify(team.value)),
        box: JSON.parse(JSON.stringify(box.value)),
      }
    }
  }

  function resetSwapOriginal() {
    swapOriginalState.value = null
  }

  function clearSoloTeraTypes(clearedAt) {
    sanitizeDraft((draft) => ({
      ...draft,
      teraType: sanitizeTeraTypeForCollection([draft], false, clearedAt)[0]
        .teraType,
    }))

    if (swapOriginalState.value) {
      swapOriginalState.value = {
        ...swapOriginalState.value,
        team: sanitizeTeraTypeForCollection(
          swapOriginalState.value.team,
          false,
          clearedAt,
        ),
        box: sanitizeTeraTypeForCollection(
          swapOriginalState.value.box,
          false,
          clearedAt,
        ),
      }
    }
  }

  async function handleCancelSwap() {
    if (swapOriginalState.value) {
      await Promise.all([
        persistTeam(
          sanitizePokemonCollectionForRules(
            swapOriginalState.value.team,
            generationRules.value,
          ),
        ),
        persistBox(
          sanitizePokemonCollectionForRules(
            swapOriginalState.value.box,
            generationRules.value,
          ),
        ),
      ])
    }
    exitSwapMode()
  }

  function getDraftTeam() {
    if (!draftAction.value?.pokemon) return team.value

    const draft = buildPokemonMember(draftAction.value)

    if (draftAction.value.type === 'add') {
      return [...team.value, draft]
    } else if (
      draftAction.value.type === 'edit' &&
      !draftAction.value.isBoxPokemon
    ) {
      return team.value.map((p) =>
        p.id === draftAction.value.editId ? draft : p,
      )
    }
    return team.value
  }

  const hasDraft = computed(() => {
    return (
      draftAction.value?.pokemon &&
      (draftAction.value.type === 'add' ||
        (draftAction.value.type === 'edit' && !draftAction.value.isBoxPokemon))
    )
  })

  // Cache all gym scores in a single computed to avoid duplicate calculations
  const allGymScores = computed(() => {
    const effectiveTeam = hasDraft.value ? getDraftTeam() : team.value

    return activeTypes.value.map((type) => ({
      type,
      score: calculateScore(type, effectiveTeam, generationRules.value),
      berryCount: calculateBerryTiebreaker(
        type,
        effectiveTeam,
        generationRules.value,
      ),
    }))
  })

  const remainingGyms = computed(() => {
    return allGymScores.value
      .filter((gym) => !defeatedGyms.value.includes(gym.type))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return a.berryCount - b.berryCount
      })
  })

  const defeatedGymsList = computed(() => {
    return allGymScores.value
      .filter((gym) => defeatedGyms.value.includes(gym.type))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return a.berryCount - b.berryCount
      })
  })

  function swapInHandToTarget(targetPokemon) {
    updateInHandPokemon({
      pokemonData: getRulesetPokemonData(targetPokemon.name),
      ...pickMemberFields(targetPokemon),
    })
  }

  async function handleBoxToTeamSwap(targetId, inHandPokemon) {
    const boxPokemonId = draftAction.value.boxPokemonId

    if (targetId === null) {
      if (team.value.length >= 6) return
      const newTeamMember = buildPokemonMember(draftAction.value, {
        source: 'team',
        id: boxPokemonId,
      })
      await Promise.all([
        persistTeam([...team.value, newTeamMember]),
        persistBox(box.value.filter((p) => p.id !== boxPokemonId)),
      ])
      exitSwapMode()
      return
    }

    const targetPokemon = team.value.find((p) => p.id === targetId)
    if (!targetPokemon) return

    const newTeam = team.value.map((p) =>
      p.id === targetId ? { ...inHandPokemon, id: boxPokemonId } : p,
    )

    const newBoxMember = buildPokemonMember(targetPokemon, {
      source: 'box',
      id: targetId,
    })
    await Promise.all([
      persistTeam(newTeam),
      persistBox([
        newBoxMember,
        ...box.value.filter((p) => p.id !== boxPokemonId),
      ]),
    ])

    swapInHandToTarget(targetPokemon)
    updateBoxPokemonId(newBoxMember.id)
  }

  async function handleTeamToBoxSwap(targetId, inHandPokemon) {
    const teamPokemonId = draftAction.value.editId

    if (targetId === null) {
      const newBoxMember = buildPokemonMember(draftAction.value, {
        source: 'box',
        id: teamPokemonId,
      })
      await Promise.all([
        persistBox([...box.value, newBoxMember]),
        persistTeam(team.value.filter((p) => p.id !== teamPokemonId)),
      ])
      exitSwapMode()
      return
    }

    const targetPokemon = box.value.find((p) => p.id === targetId)
    if (!targetPokemon) return

    const newBox = box.value.map((p) =>
      p.id === targetId ? { ...inHandPokemon, id: teamPokemonId } : p,
    )

    const newTeamMember = buildPokemonMember(targetPokemon, {
      source: 'team',
      id: targetId,
    })
    await Promise.all([
      persistBox(newBox),
      persistTeam(
        team.value.map((p) => (p.id === teamPokemonId ? newTeamMember : p)),
      ),
    ])

    swapInHandToTarget(targetPokemon)
    updateEditId(newTeamMember.id)
  }

  async function handleImmediateSwap(targetId) {
    if (!draftAction.value?.pokemon) return

    const inHandPokemon = buildPokemonMember(draftAction.value)

    if (draftAction.value.isBoxPokemon) {
      await handleBoxToTeamSwap(targetId, inHandPokemon)
    } else if (draftAction.value.isTeamPokemon) {
      await handleTeamToBoxSwap(targetId, inHandPokemon)
    }
  }

  async function handleSwapSuggestion({
    currentId,
    candidateId,
    isTeamMember,
  }) {
    swapOriginalState.value = {
      team: JSON.parse(JSON.stringify(team.value)),
      box: JSON.parse(JSON.stringify(box.value)),
    }

    if (isTeamMember) {
      // Editing team Pokemon A (currentId), candidate is box Pokemon B (candidateId)
      const teamPokemon = team.value.find((p) => p.id === currentId)
      const boxPokemon = box.value.find((p) => p.id === candidateId)
      if (!teamPokemon || !boxPokemon) return

      // B goes to team where A was
      const newTeamMember = buildPokemonMember(boxPokemon, {
        source: 'team',
        id: candidateId,
      })
      // A goes to box where B was
      const newBoxMember = buildPokemonMember(teamPokemon, {
        source: 'box',
        id: currentId,
      })

      await Promise.all([
        persistTeam(
          team.value.map((p) => (p.id === currentId ? newTeamMember : p)),
        ),
        persistBox(
          box.value.map((p) => (p.id === candidateId ? newBoxMember : p)),
        ),
      ])

      // Set A as "in hand" box Pokemon for chain swapping
      startEditBox({
        id: newBoxMember.id,
        pokemonData: getRulesetPokemonData(teamPokemon.name),
        ...pickMemberFields(teamPokemon),
        moves: [...(teamPokemon.moves || [])],
      })
    } else {
      // Box editing: handleImmediateSwap already sets correct perspective
      await handleImmediateSwap(candidateId)
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
    enterSwapMode()
  }

  async function confirmBoxPokemonEdit() {
    const boxIndex = box.value.findIndex(
      (p) => p.id === draftAction.value.boxPokemonId,
    )
    const updatedPokemon = buildPokemonMember(draftAction.value, {
      id: draftAction.value.boxPokemonId,
    })

    const newBox = [...box.value]
    newBox[boxIndex] = updatedPokemon
    await persistBox(newBox)
  }

  function enterAddReplaceMode() {
    swapOriginalState.value = {
      team: JSON.parse(JSON.stringify(team.value)),
      box: JSON.parse(JSON.stringify(box.value)),
    }

    const tempBoxMember = buildPokemonMember(draftAction.value, {
      source: 'temp',
    })
    persistBox([...box.value, tempBoxMember])

    convertToBoxEdit(tempBoxMember.id)
    enterSwapMode()
  }

  function convertDraftToSoloEdit(rosterKey, memberId) {
    if (!draftAction.value) return

    draftAction.value = {
      ...draftAction.value,
      type: 'edit',
      isTeamPokemon: rosterKey === 'team',
      isBoxPokemon: rosterKey === 'box',
      isDeadPokemon: rosterKey === 'dead',
      editId: rosterKey === 'team' ? memberId : null,
      boxPokemonId: rosterKey === 'box' ? memberId : null,
      deadPokemonId: rosterKey === 'dead' ? memberId : null,
    }
  }

  async function autosaveDraft() {
    if (!draftAction.value?.pokemon) return

    const action = draftAction.value

    if (action.type === 'add') {
      const newMember = buildPokemonMember(action, { source: 'team' })
      if (team.value.length < 6) {
        await persistTeam([...team.value, newMember])
        convertDraftToSoloEdit('team', newMember.id)
      } else {
        enterAddReplaceMode()
      }
      return
    }

    if (action.type === 'addToBox') {
      const newMember = buildPokemonMember(action, { source: 'box' })
      await persistBox([newMember, ...box.value])
      convertDraftToSoloEdit('box', newMember.id)
      return
    }

    if (action.type === 'addToDead') {
      const newMember = buildPokemonMember(action, { source: 'dead' })
      await persistDead([newMember, ...dead.value])
      convertDraftToSoloEdit('dead', newMember.id)
      return
    }

    if (action.isDeadPokemon) {
      const updatedMember = buildPokemonMember(action, {
        id: action.deadPokemonId,
        source: 'dead',
      })
      await persistDead(
        dead.value.map((member) =>
          member.id === action.deadPokemonId ? updatedMember : member,
        ),
      )
      return
    }

    if (action.isBoxPokemon) {
      await confirmBoxPokemonEdit()
      return
    }

    await persistTeam(
      team.value.map((member) =>
        member.id === action.editId
          ? buildPokemonMember(action, { id: action.editId })
          : member,
      ),
    )
  }

  function handleDeleteFromDraft() {
    if (!draftAction.value) return

    if (draftAction.value.isBoxPokemon) {
      deleteBoxPokemon(draftAction.value.boxPokemonId)
    } else if (draftAction.value.editId) {
      deleteTeamPokemon(draftAction.value.editId)
    }
    cancel()
  }

  function handleSoloKillPokemon({ id, rosterKey }) {
    if (rosterKey === 'team') killTeamPokemon(id)
    else killBoxPokemon(id)
    cancel()
  }

  function handleSoloRevivePokemon(memberId) {
    revivePokemon(memberId)
  }

  function handleSoloDeleteDeadPokemon({ id }) {
    deleteDeadPokemon(id)
    cancel()
  }

  return {
    hasDraft,
    remainingGyms,
    defeatedGymsList,
    autosaveDraft,
    handleImmediateSwap,
    handleDeleteFromDraft,
    handleSwapSuggestion,
    handleCancelSwap,
    handleSoloKillPokemon,
    handleSoloRevivePokemon,
    handleSoloDeleteDeadPokemon,
    captureSwapOriginal,
    resetSwapOriginal,
    clearSoloTeraTypes,
    swapOriginalState,
  }
}

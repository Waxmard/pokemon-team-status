import { ref } from 'vue'
import { pickMemberFields } from '../utils/pokemon.js'

const draftAction = ref(null)
const swapMode = ref(false)

export function useDraftAction() {
  // Actions
  function startAdd() {
    if (draftAction.value?.type === 'add') {
      return cancel()
    }
    draftAction.value = {
      type: 'add',
      pokemon: null,
      ...pickMemberFields({}),
    }
  }

  function startEdit(id, member) {
    if (
      draftAction.value?.type === 'edit' &&
      draftAction.value?.editId === id
    ) {
      return cancel()
    }
    draftAction.value = {
      type: 'edit',
      editId: id,
      isBoxPokemon: false,
      isTeamPokemon: true,
      pokemon: member.pokemonData,
      ...pickMemberFields(member),
      moves: [...(member.moves || [])],
    }
  }

  function startEditBox(boxMember) {
    if (
      draftAction.value?.type === 'edit' &&
      draftAction.value?.boxPokemonId === boxMember.id
    ) {
      return cancel()
    }
    draftAction.value = {
      type: 'edit',
      isBoxPokemon: true,
      boxPokemonId: boxMember.id,
      pokemon: boxMember.pokemonData,
      ...pickMemberFields(boxMember),
      moves: [...(boxMember.moves || [])],
    }
  }

  function startAddToBox() {
    if (draftAction.value?.type === 'addToBox') {
      return cancel()
    }
    draftAction.value = {
      type: 'addToBox',
      pokemon: null,
      ...pickMemberFields({}),
    }
  }

  function startEditDead(deadMember) {
    if (
      draftAction.value?.type === 'edit' &&
      draftAction.value?.deadPokemonId === deadMember.id
    ) {
      return cancel()
    }
    draftAction.value = {
      type: 'edit',
      isDeadPokemon: true,
      deadPokemonId: deadMember.id,
      pokemon: deadMember.pokemonData,
      ...pickMemberFields(deadMember),
      moves: [...(deadMember.moves || [])],
    }
  }

  function startAddToDead() {
    if (draftAction.value?.type === 'addToDead') {
      return cancel()
    }
    draftAction.value = {
      type: 'addToDead',
      pokemon: null,
      ...pickMemberFields({}),
    }
  }

  function updateField(field, value) {
    if (draftAction.value) {
      draftAction.value[field] = value
    }
  }

  const updatePokemon = (val) => updateField('pokemon', val)
  const updateAbility = (val) => updateField('ability', val)
  const updateBerry = (val) => updateField('berry', val)
  const updateMoves = (val) => updateField('moves', val)
  const updateSpecialMove = (val) => updateField('specialMove', val)
  const updateCatchLocation = (val) => updateField('catchLocation', val)
  const updateNickname = (val) => updateField('nickname', val)

  function updateMegaForm(form, types, spriteId) {
    if (draftAction.value) {
      draftAction.value.megaForm = form
      draftAction.value.megaTypes = types
      draftAction.value.megaSpriteId = spriteId
    }
  }

  const updateTeraType = (val) => updateField('teraType', val)

  function enterSwapMode() {
    swapMode.value = true
  }

  function exitSwapMode() {
    swapMode.value = false
    draftAction.value = null
  }

  const updateSpriteVariant = (val) => updateField('spriteVariant', val)

  function sanitizeDraft(sanitizeFn) {
    if (draftAction.value) {
      draftAction.value = sanitizeFn(draftAction.value)
    }
  }

  function updateBoxPokemonId(id) {
    if (draftAction.value) {
      draftAction.value.boxPokemonId = id
    }
  }

  function updateEditId(id) {
    if (draftAction.value) {
      draftAction.value.editId = id
    }
  }

  function convertToEdit(rosterKey, memberId) {
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

  function convertToBoxEdit(boxPokemonId) {
    if (draftAction.value) {
      draftAction.value = {
        ...draftAction.value,
        type: 'edit',
        isBoxPokemon: true,
        boxPokemonId,
      }
    }
  }

  function updateInHandPokemon(source) {
    if (draftAction.value) {
      draftAction.value = {
        ...draftAction.value,
        pokemon: source.pokemonData,
        ...pickMemberFields(source),
        moves: [...(source.moves || [])],
      }
    }
  }

  function cancel() {
    swapMode.value = false
    draftAction.value = null
  }

  return {
    draftAction,
    swapMode,
    startAdd,
    startEdit,
    startEditBox,
    startAddToBox,
    startEditDead,
    startAddToDead,
    updatePokemon,
    updateAbility,
    updateBerry,
    updateMoves,
    updateSpecialMove,
    updateCatchLocation,
    updateNickname,
    updateMegaForm,
    updateTeraType,
    updateSpriteVariant,
    sanitizeDraft,
    updateBoxPokemonId,
    updateEditId,
    convertToBoxEdit,
    convertToEdit,
    updateInHandPokemon,
    enterSwapMode,
    exitSwapMode,
    cancel,
  }
}

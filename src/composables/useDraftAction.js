import { computed, ref } from 'vue'

const draftAction = ref(null)
const swapMode = ref(false)

export function useDraftAction() {
  // State
  const isActive = computed(() => !!draftAction.value)

  // Actions
  function startAdd(pokemon = null) {
    if (draftAction.value?.type === 'add') {
      return cancel()
    }
    draftAction.value = {
      type: 'add',
      pokemon,
      ability: null,
      berry: null,
      moves: [],
      specialMove: null,
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
      spriteVariant: 'default',
      catchLocation: null,
      nickname: null,
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
      ability: member.ability,
      berry: member.berry,
      moves: [...(member.moves || [])],
      specialMove: member.specialMove || null,
      pairId: member.pairId || null,
      megaForm: member.megaForm || null,
      megaTypes: member.megaTypes || null,
      megaSpriteId: member.megaSpriteId || null,
      spriteVariant: member.spriteVariant || 'default',
      catchLocation: member.catchLocation || null,
      nickname: member.nickname || null,
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
      ability: boxMember.ability,
      berry: boxMember.berry,
      moves: [...(boxMember.moves || [])],
      specialMove: boxMember.specialMove || null,
      pairId: boxMember.pairId || null,
      replaceTarget: null,
      megaForm: boxMember.megaForm || null,
      megaTypes: boxMember.megaTypes || null,
      megaSpriteId: boxMember.megaSpriteId || null,
      spriteVariant: boxMember.spriteVariant || 'default',
      catchLocation: boxMember.catchLocation || null,
      nickname: boxMember.nickname || null,
    }
  }

  function startAddToBox(pokemon = null) {
    if (draftAction.value?.type === 'addToBox') {
      return cancel()
    }
    draftAction.value = {
      type: 'addToBox',
      pokemon,
      ability: null,
      berry: null,
      moves: [],
      specialMove: null,
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
      spriteVariant: 'default',
      catchLocation: null,
      nickname: null,
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

  function updateReplaceTarget(target) {
    if (draftAction.value) {
      draftAction.value = { ...draftAction.value, replaceTarget: target }
    }
  }

  function enterSwapMode() {
    swapMode.value = true
  }

  function exitSwapMode() {
    swapMode.value = false
    draftAction.value = null
  }

  const updateSpriteVariant = (val) => updateField('spriteVariant', val)

  function updateInHandPokemon({
    pokemonData,
    ability,
    berry,
    moves,
    specialMove,
    megaForm,
    megaTypes,
    megaSpriteId,
    spriteVariant,
    nickname,
  }) {
    if (draftAction.value) {
      draftAction.value = {
        ...draftAction.value,
        pokemon: pokemonData,
        ability,
        berry,
        moves: [...(moves || [])],
        specialMove,
        megaForm,
        megaTypes,
        megaSpriteId,
        spriteVariant: spriteVariant || 'default',
        nickname: nickname ?? null,
      }
    }
  }

  function cancel() {
    swapMode.value = false
    draftAction.value = null
  }

  return {
    draftAction,
    isActive,
    swapMode,
    startAdd,
    startEdit,
    startEditBox,
    startAddToBox,
    updatePokemon,
    updateAbility,
    updateBerry,
    updateMoves,
    updateSpecialMove,
    updateCatchLocation,
    updateNickname,
    updateMegaForm,
    updateReplaceTarget,
    updateSpriteVariant,
    updateInHandPokemon,
    enterSwapMode,
    exitSwapMode,
    cancel,
  }
}

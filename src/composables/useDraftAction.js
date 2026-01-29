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
      pokemon: member.pokemonData,
      ability: member.ability,
      berry: member.berry,
      moves: [...(member.moves || [])],
      specialMove: member.specialMove || null,
      megaForm: member.megaForm || null,
      megaTypes: member.megaTypes || null,
      megaSpriteId: member.megaSpriteId || null,
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
      replaceTarget: null,
      megaForm: boxMember.megaForm || null,
      megaTypes: boxMember.megaTypes || null,
      megaSpriteId: boxMember.megaSpriteId || null,
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
    }
  }

  function updatePokemon(pokemon) {
    if (draftAction.value) {
      draftAction.value.pokemon = pokemon
    }
  }

  function updateAbility(ability) {
    if (draftAction.value) {
      draftAction.value.ability = ability
    }
  }

  function updateBerry(berry) {
    if (draftAction.value) {
      draftAction.value.berry = berry
    }
  }

  function updateMoves(moves) {
    if (draftAction.value) {
      draftAction.value.moves = moves
    }
  }

  function updateSpecialMove(specialMove) {
    if (draftAction.value) {
      draftAction.value.specialMove = specialMove
    }
  }

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

  function updateInHandPokemon(
    pokemonData,
    ability,
    berry,
    moves,
    specialMove,
    megaForm,
    megaTypes,
    megaSpriteId,
  ) {
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
    updateMegaForm,
    updateReplaceTarget,
    updateInHandPokemon,
    enterSwapMode,
    exitSwapMode,
    cancel,
  }
}

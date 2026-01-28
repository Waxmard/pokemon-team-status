import { ref, computed } from 'vue'

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
      moves: [null, null, null, null]
    }
  }

  function startEdit(id, member) {
    if (draftAction.value?.type === 'edit' && draftAction.value?.editId === id) {
      return cancel()
    }
    draftAction.value = {
      type: 'edit',
      editId: id,
      isBoxPokemon: false,
      pokemon: member.pokemonData,
      ability: member.ability,
      berry: member.berry,
      moves: [...member.moves, null, null, null, null].slice(0, 4)
    }
  }

  function startEditBox(boxMember) {
    if (draftAction.value?.type === 'edit' && draftAction.value?.boxPokemonId === boxMember.id) {
      return cancel()
    }
    draftAction.value = {
      type: 'edit',
      isBoxPokemon: true,
      boxPokemonId: boxMember.id,
      pokemon: boxMember.pokemonData,
      ability: boxMember.ability,
      berry: boxMember.berry,
      moves: [...boxMember.moves, null, null, null, null].slice(0, 4),
      replaceTarget: null
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
      moves: [null, null, null, null]
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

  function updateMove({ index, value }) {
    if (draftAction.value) {
      draftAction.value.moves[index] = value
    }
  }

  function updateReplaceTarget(target) {
    if (draftAction.value) {
      draftAction.value.replaceTarget = target
    }
  }

  function enterSwapMode() {
    swapMode.value = true
  }

  function exitSwapMode() {
    swapMode.value = false
    updateReplaceTarget(null)
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
    updateMove,
    updateReplaceTarget,
    enterSwapMode,
    exitSwapMode,
    cancel
  }
}

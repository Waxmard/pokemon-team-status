import { beforeEach, describe, expect, it } from 'vitest'
import { useDraftAction } from '../useDraftAction.js'

describe('useDraftAction', () => {
  let draft

  beforeEach(() => {
    draft = useDraftAction()
    draft.cancel()
  })

  it('starts inactive', () => {
    expect(draft.isActive.value).toBe(false)
    expect(draft.draftAction.value).toBeNull()
    expect(draft.swapMode.value).toBe(false)
  })

  describe('startAdd', () => {
    it('creates an add draft action', () => {
      const pokemon = { name: 'Pikachu', types: ['electric'] }
      draft.startAdd(pokemon)

      expect(draft.isActive.value).toBe(true)
      expect(draft.draftAction.value.type).toBe('add')
      expect(draft.draftAction.value.pokemon).toEqual(pokemon)
    })

    it('initializes with default member fields', () => {
      draft.startAdd()

      expect(draft.draftAction.value.ability).toBeNull()
      expect(draft.draftAction.value.berry).toBeNull()
      expect(draft.draftAction.value.moves).toEqual([])
      expect(draft.draftAction.value.specialMove).toBeNull()
    })

    it('toggles off when called again in add mode', () => {
      draft.startAdd()
      expect(draft.isActive.value).toBe(true)

      draft.startAdd()
      expect(draft.isActive.value).toBe(false)
    })

    it('does not toggle off when switching from a different mode', () => {
      draft.startAddToBox()
      draft.startAdd()
      expect(draft.draftAction.value.type).toBe('add')
    })
  })

  describe('startEdit', () => {
    const member = {
      pokemonData: { name: 'Charizard', types: ['fire', 'flying'] },
      ability: 'Blaze',
      berry: null,
      moves: ['fire', 'flying'],
      specialMove: null,
    }

    it('creates an edit draft action with member fields', () => {
      draft.startEdit('id-1', member)

      expect(draft.draftAction.value.type).toBe('edit')
      expect(draft.draftAction.value.editId).toBe('id-1')
      expect(draft.draftAction.value.isTeamPokemon).toBe(true)
      expect(draft.draftAction.value.isBoxPokemon).toBe(false)
      expect(draft.draftAction.value.pokemon).toEqual(member.pokemonData)
      expect(draft.draftAction.value.ability).toBe('Blaze')
    })

    it('clones moves array from member', () => {
      draft.startEdit('id-1', member)

      expect(draft.draftAction.value.moves).toEqual(['fire', 'flying'])
      expect(draft.draftAction.value.moves).not.toBe(member.moves)
    })

    it('toggles off when editing same ID', () => {
      draft.startEdit('id-1', member)
      expect(draft.isActive.value).toBe(true)

      draft.startEdit('id-1', member)
      expect(draft.isActive.value).toBe(false)
    })

    it('switches to new member when editing different ID', () => {
      draft.startEdit('id-1', member)
      const member2 = { ...member, ability: 'Solar Power' }
      draft.startEdit('id-2', member2)

      expect(draft.draftAction.value.editId).toBe('id-2')
      expect(draft.draftAction.value.ability).toBe('Solar Power')
    })
  })

  describe('startEditBox', () => {
    const boxMember = {
      id: 'box-1',
      pokemonData: { name: 'Squirtle', types: ['water'] },
      ability: null,
      moves: [],
    }

    it('creates a box edit draft action', () => {
      draft.startEditBox(boxMember)

      expect(draft.draftAction.value.type).toBe('edit')
      expect(draft.draftAction.value.isBoxPokemon).toBe(true)
      expect(draft.draftAction.value.boxPokemonId).toBe('box-1')
      expect(draft.draftAction.value.replaceTarget).toBeNull()
    })

    it('toggles off when editing same box pokemon', () => {
      draft.startEditBox(boxMember)
      draft.startEditBox(boxMember)
      expect(draft.isActive.value).toBe(false)
    })
  })

  describe('startAddToBox', () => {
    it('creates an addToBox draft action', () => {
      draft.startAddToBox()
      expect(draft.draftAction.value.type).toBe('addToBox')
    })

    it('toggles off when called again', () => {
      draft.startAddToBox()
      draft.startAddToBox()
      expect(draft.isActive.value).toBe(false)
    })
  })

  describe('startEditDead', () => {
    const deadMember = {
      id: 'dead-1',
      pokemonData: { name: 'Geodude', types: ['rock', 'ground'] },
      ability: null,
      moves: [],
    }

    it('creates a dead edit draft action', () => {
      draft.startEditDead(deadMember)

      expect(draft.draftAction.value.type).toBe('edit')
      expect(draft.draftAction.value.isDeadPokemon).toBe(true)
      expect(draft.draftAction.value.deadPokemonId).toBe('dead-1')
    })

    it('toggles off when editing same dead pokemon', () => {
      draft.startEditDead(deadMember)
      draft.startEditDead(deadMember)
      expect(draft.isActive.value).toBe(false)
    })
  })

  describe('startAddToDead', () => {
    it('creates an addToDead draft action', () => {
      draft.startAddToDead()
      expect(draft.draftAction.value.type).toBe('addToDead')
    })

    it('toggles off when called again', () => {
      draft.startAddToDead()
      draft.startAddToDead()
      expect(draft.isActive.value).toBe(false)
    })
  })

  describe('field updates', () => {
    beforeEach(() => {
      draft.startAdd()
    })

    it('updatePokemon sets the pokemon field', () => {
      const pokemon = { name: 'Eevee', types: ['normal'] }
      draft.updatePokemon(pokemon)
      expect(draft.draftAction.value.pokemon).toEqual(pokemon)
    })

    it('updateAbility sets the ability field', () => {
      draft.updateAbility('Intimidate')
      expect(draft.draftAction.value.ability).toBe('Intimidate')
    })

    it('updateBerry sets the berry field', () => {
      draft.updateBerry('Occa Berry')
      expect(draft.draftAction.value.berry).toBe('Occa Berry')
    })

    it('updateMoves sets the moves field', () => {
      draft.updateMoves(['fire', 'water'])
      expect(draft.draftAction.value.moves).toEqual(['fire', 'water'])
    })

    it('updateSpecialMove sets the specialMove field', () => {
      draft.updateSpecialMove('Freeze-Dry')
      expect(draft.draftAction.value.specialMove).toBe('Freeze-Dry')
    })

    it('updateCatchLocation sets the catchLocation field', () => {
      draft.updateCatchLocation('Route 1')
      expect(draft.draftAction.value.catchLocation).toBe('Route 1')
    })

    it('updateNickname sets the nickname field', () => {
      draft.updateNickname('Sparky')
      expect(draft.draftAction.value.nickname).toBe('Sparky')
    })

    it('updateSpriteVariant sets the spriteVariant field', () => {
      draft.updateSpriteVariant('shiny')
      expect(draft.draftAction.value.spriteVariant).toBe('shiny')
    })

    it('does nothing when draft is inactive', () => {
      draft.cancel()
      draft.updateAbility('Intimidate')
      expect(draft.draftAction.value).toBeNull()
    })
  })

  describe('updateMegaForm', () => {
    it('sets megaForm, megaTypes, and megaSpriteId together', () => {
      draft.startAdd()
      draft.updateMegaForm('Mega Charizard X', ['fire', 'dragon'], 10033)

      expect(draft.draftAction.value.megaForm).toBe('Mega Charizard X')
      expect(draft.draftAction.value.megaTypes).toEqual(['fire', 'dragon'])
      expect(draft.draftAction.value.megaSpriteId).toBe(10033)
    })

    it('does nothing when draft is inactive', () => {
      draft.updateMegaForm('Mega', ['fire'], 10033)
      expect(draft.draftAction.value).toBeNull()
    })
  })

  describe('updateReplaceTarget', () => {
    it('sets the replaceTarget on the draft', () => {
      draft.startAdd()
      draft.updateReplaceTarget('target-id')
      expect(draft.draftAction.value.replaceTarget).toBe('target-id')
    })
  })

  describe('updateInHandPokemon', () => {
    it('replaces pokemon and member fields from source', () => {
      draft.startAdd()
      draft.updateAbility('OldAbility')

      const source = {
        pokemonData: { name: 'Jolteon', types: ['electric'] },
        ability: 'Volt Absorb',
        berry: null,
        moves: ['electric'],
      }
      draft.updateInHandPokemon(source)

      expect(draft.draftAction.value.pokemon).toEqual(source.pokemonData)
      expect(draft.draftAction.value.ability).toBe('Volt Absorb')
      expect(draft.draftAction.value.moves).toEqual(['electric'])
      expect(draft.draftAction.value.type).toBe('add')
    })
  })

  describe('swap mode', () => {
    it('enterSwapMode sets swapMode to true', () => {
      draft.enterSwapMode()
      expect(draft.swapMode.value).toBe(true)
    })

    it('exitSwapMode clears swapMode and draft', () => {
      draft.startAdd()
      draft.enterSwapMode()
      draft.exitSwapMode()

      expect(draft.swapMode.value).toBe(false)
      expect(draft.draftAction.value).toBeNull()
    })
  })

  describe('cancel', () => {
    it('clears both draftAction and swapMode', () => {
      draft.startAdd()
      draft.enterSwapMode()
      draft.cancel()

      expect(draft.draftAction.value).toBeNull()
      expect(draft.swapMode.value).toBe(false)
    })
  })
})

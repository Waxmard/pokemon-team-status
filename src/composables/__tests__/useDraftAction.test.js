import { beforeEach, describe, expect, it } from 'vitest'
import { useDraftAction } from '../useDraftAction.js'

describe('useDraftAction', () => {
  let draft

  beforeEach(() => {
    draft = useDraftAction()
    draft.cancel()
  })

  it('starts inactive', () => {
    expect(draft.draftAction.value).toBeNull()
    expect(draft.swapMode.value).toBe(false)
  })

  describe('startAdd', () => {
    it('creates an add draft action', () => {
      draft.startAdd()

      expect(draft.draftAction.value).not.toBeNull()
      expect(draft.draftAction.value.type).toBe('add')
      expect(draft.draftAction.value.pokemon).toBeNull()
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
      expect(draft.draftAction.value).not.toBeNull()

      draft.startAdd()
      expect(draft.draftAction.value).toBeNull()
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
      expect(draft.draftAction.value).not.toBeNull()

      draft.startEdit('id-1', member)
      expect(draft.draftAction.value).toBeNull()
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
    })

    it('toggles off when editing same box pokemon', () => {
      draft.startEditBox(boxMember)
      draft.startEditBox(boxMember)
      expect(draft.draftAction.value).toBeNull()
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
      expect(draft.draftAction.value).toBeNull()
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
      expect(draft.draftAction.value).toBeNull()
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
      expect(draft.draftAction.value).toBeNull()
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
    function selectGarchomp() {
      draft.startAdd()
      draft.updatePokemon({ name: 'Garchomp', types: ['dragon', 'ground'] })
    }

    it('sets and clears supported abilities across Garchomp Mega forms', () => {
      selectGarchomp()

      draft.updateMegaForm('mega-z', ['dragon'], 10309)
      expect(draft.draftAction.value).toMatchObject({
        megaForm: 'mega-z',
        megaTypes: ['dragon'],
        megaSpriteId: 10309,
        ability: 'Levitate',
      })

      draft.updateMegaForm('mega', ['dragon', 'ground'], 10058)
      expect(draft.draftAction.value).toMatchObject({
        megaForm: 'mega',
        megaTypes: ['dragon', 'ground'],
        megaSpriteId: 10058,
        ability: null,
      })

      draft.updateMegaForm('mega-z', ['dragon'], 10309)
      draft.updateMegaForm(null, null, null)
      expect(draft.draftAction.value).toMatchObject({
        megaForm: null,
        megaTypes: null,
        megaSpriteId: null,
        ability: null,
      })
    })

    it('preserves a manually selected ability when leaving an ability Mega', () => {
      selectGarchomp()
      draft.updateMegaForm('mega-z', ['dragon'], 10309)
      draft.updateAbility('Water Absorb')

      draft.updateMegaForm('mega', ['dragon', 'ground'], 10058)
      expect(draft.draftAction.value.ability).toBe('Water Absorb')

      draft.updateMegaForm('mega-z', ['dragon'], 10309)
      draft.updateAbility('Water Absorb')
      draft.updateMegaForm(null, null, null)
      expect(draft.draftAction.value.ability).toBe('Water Absorb')
    })

    it.each([
      ['Delphox', 'mega', 'Levitate'],
      ['Chimecho', 'mega', 'Levitate'],
      ['Greninja', 'mega', 'Protean'],
    ])('selects %s Mega ability', (name, form, ability) => {
      draft.startAdd()
      draft.updatePokemon({ name, types: [] })
      draft.updateMegaForm(form, [], 1)
      expect(draft.draftAction.value.ability).toBe(ability)
    })

    it('does nothing when draft is inactive', () => {
      draft.updateMegaForm('mega', ['fire'], 10033)
      expect(draft.draftAction.value).toBeNull()
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

  describe('convertToEdit', () => {
    it.each([
      ['team', { isTeamPokemon: true }, 'editId'],
      ['box', { isBoxPokemon: true }, 'boxPokemonId'],
      ['dead', { isDeadPokemon: true }, 'deadPokemonId'],
    ])('turns the draft into a %s edit', (rosterKey, flag, idField) => {
      draft.startAdd()
      draft.convertToEdit(rosterKey, 'member-1')

      expect(draft.draftAction.value.type).toBe('edit')
      expect(draft.draftAction.value).toMatchObject(flag)
      expect(draft.draftAction.value[idField]).toBe('member-1')

      // The other two id slots must be cleared so stale ids can't be reused.
      const cleared = ['editId', 'boxPokemonId', 'deadPokemonId'].filter(
        (field) => field !== idField,
      )
      for (const field of cleared) {
        expect(draft.draftAction.value[field]).toBeNull()
      }
    })

    it('is a no-op when there is no draft open', () => {
      draft.convertToEdit('team', 'member-1')

      expect(draft.draftAction.value).toBeNull()
    })
  })
})

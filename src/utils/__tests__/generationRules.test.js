import { describe, expect, it } from 'vitest'
import { GENERATION_RULESETS } from '../../data/types.js'
import {
  getMemberTypesForRules,
  sanitizeDraftActionForRules,
  sanitizePokemonCollectionForRules,
} from '../generationRules.js'

describe('generationRules helpers', () => {
  it('sanitizes active draft state for pre-Gen 6 rules', () => {
    const draftAction = {
      type: 'edit',
      pokemon: { name: 'Xerneas', types: ['fairy'] },
      ability: null,
      berry: 'Roseli Berry',
      moves: ['fairy', 'grass'],
      specialMove: null,
      megaForm: 'mega',
      megaTypes: ['fairy'],
      megaSpriteId: 123,
    }

    expect(
      sanitizeDraftActionForRules(draftAction, GENERATION_RULESETS.PRE_GEN_6),
    ).toMatchObject({
      berry: null,
      moves: ['grass'],
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
      pokemon: { name: 'Xerneas', types: ['normal'] },
    })
  })
  it('clears only a matching supported Mega ability under pre-Gen 6 rules', () => {
    const garchompMegaZ = {
      name: 'Garchomp',
      types: ['dragon', 'ground'],
      ability: 'Levitate',
      megaForm: 'mega-z',
      megaTypes: ['dragon'],
      megaSpriteId: 10309,
    }
    const [sanitized, manual] = sanitizePokemonCollectionForRules(
      [garchompMegaZ, { ...garchompMegaZ, ability: 'Water Absorb' }],
      GENERATION_RULESETS.PRE_GEN_6,
    )

    expect(sanitized).toMatchObject({
      ability: null,
      megaForm: null,
      megaTypes: null,
      megaSpriteId: null,
    })

    expect(manual.ability).toBe('Water Absorb')
  })

  it('sanitizes swap snapshots before restoring them', () => {
    const collection = [
      {
        id: '1',
        name: 'Tapu Fini',
        types: ['water', 'fairy'],
        moves: ['water', 'fairy'],
        berry: 'Roseli Berry',
        megaForm: null,
        megaTypes: null,
        megaSpriteId: null,
      },
    ]

    expect(
      sanitizePokemonCollectionForRules(
        collection,
        GENERATION_RULESETS.PRE_GEN_6,
      ),
    ).toEqual([
      expect.objectContaining({
        name: 'Tapu Fini',
        types: ['water'],
        moves: ['water'],
        berry: null,
      }),
    ])
  })

  it('falls back fairy-based species to coherent non-fairy types pre-Gen 6', () => {
    expect(
      getMemberTypesForRules(
        { name: 'Xerneas', types: ['fairy'] },
        GENERATION_RULESETS.PRE_GEN_6,
      ),
    ).toEqual(['normal'])

    expect(
      getMemberTypesForRules(
        { name: 'Tapu Fini', types: ['water', 'fairy'] },
        GENERATION_RULESETS.PRE_GEN_6,
      ),
    ).toEqual(['water'])
  })
})

import { describe, expect, it } from 'vitest'
import { GENERATION_RULESETS } from '../../data/types.js'
import {
  adaptSoulLinkMemberToUiMember,
  adaptUiMemberToSoulLinkMember,
  buildSoulLinkMemberFromDraft,
  buildSoulLinkPlayerBoard,
} from '../soulLinkUi.js'

function slMember(overrides = {}) {
  return {
    id: overrides.id ?? 'sl-1',
    speciesName: 'Bulbasaur',
    ownerPlayerId: 'player-1',
    types: ['grass', 'poison'],
    ability: null,
    berry: null,
    moves: [],
    specialMove: null,
    megaForm: null,
    megaTypes: null,
    megaSpriteId: null,
    spriteVariant: 'default',
    nickname: null,
    catchLocation: null,
    pairId: null,
    ...overrides,
  }
}

function uiMember(overrides = {}) {
  return {
    id: overrides.id ?? 'ui-1',
    name: 'Bulbasaur',
    types: ['grass', 'poison'],
    ability: null,
    berry: null,
    moves: [],
    specialMove: null,
    megaForm: null,
    megaTypes: null,
    megaSpriteId: null,
    spriteVariant: 'default',
    catchLocation: null,
    pairId: null,
    ...overrides,
  }
}

describe('adaptUiMemberToSoulLinkMember', () => {
  it('returns null for null/undefined input', () => {
    expect(adaptUiMemberToSoulLinkMember(null, 'p1')).toBe(null)
    expect(adaptUiMemberToSoulLinkMember(undefined, 'p1')).toBe(null)
  })

  it('returns null for member without name', () => {
    expect(adaptUiMemberToSoulLinkMember({ id: '1' }, 'p1')).toBe(null)
  })

  it('maps UI member to soul link format', () => {
    const result = adaptUiMemberToSoulLinkMember(uiMember(), 'player-1')
    expect(result.speciesName).toBe('Bulbasaur')
    expect(result.ownerPlayerId).toBe('player-1')
    expect(result.nickname).toBe(null)
    expect(result).not.toHaveProperty('name')
  })
})

describe('adaptSoulLinkMemberToUiMember', () => {
  it('returns null for null/undefined input', () => {
    expect(adaptSoulLinkMemberToUiMember(null)).toBe(null)
    expect(adaptSoulLinkMemberToUiMember(undefined)).toBe(null)
  })

  it('returns null for member without speciesName', () => {
    expect(adaptSoulLinkMemberToUiMember({ id: '1' })).toBe(null)
  })

  it('maps soul link member to UI format', () => {
    const result = adaptSoulLinkMemberToUiMember(slMember())
    expect(result.name).toBe('Bulbasaur')
    expect(result).not.toHaveProperty('speciesName')
    expect(result).not.toHaveProperty('ownerPlayerId')
    expect(result).not.toHaveProperty('nickname')
  })
})

describe('round-trip conversion', () => {
  it('preserves fields through UI → SL → UI', () => {
    const original = uiMember({
      ability: 'Overgrow',
      berry: 'Occa Berry',
      moves: ['grass', 'poison'],
      catchLocation: 'Route 1',
      pairId: 'partner-1',
    })
    const sl = adaptUiMemberToSoulLinkMember(original, 'player-1')
    const roundTripped = adaptSoulLinkMemberToUiMember(sl)

    expect(roundTripped.name).toBe(original.name)
    expect(roundTripped.types).toEqual(original.types)
    expect(roundTripped.ability).toBe(original.ability)
    expect(roundTripped.berry).toBe(original.berry)
    expect(roundTripped.moves).toEqual(original.moves)
    expect(roundTripped.catchLocation).toBe(original.catchLocation)
    expect(roundTripped.pairId).toBe(original.pairId)
  })
})

describe('buildSoulLinkMemberFromDraft', () => {
  it('returns null when draft has no pokemon', () => {
    expect(buildSoulLinkMemberFromDraft({}, 'p1')).toBe(null)
    expect(buildSoulLinkMemberFromDraft(null, 'p1')).toBe(null)
  })

  it('builds member from draft action', () => {
    const draft = {
      pokemon: { name: 'Charmander', types: ['fire'] },
      ability: 'Blaze',
      berry: null,
      moves: ['fire', null, 'normal'],
      specialMove: null,
      catchLocation: 'Route 2',
    }
    const result = buildSoulLinkMemberFromDraft(draft, 'player-1', 'team')
    expect(result.speciesName).toBe('Charmander')
    expect(result.ownerPlayerId).toBe('player-1')
    expect(result.ability).toBe('Blaze')
    expect(result.moves).toEqual(['fire', 'normal'])
    expect(result.catchLocation).toBe('Route 2')
    expect(result.id).toBeDefined()
  })
})

describe('buildSoulLinkPlayerBoard', () => {
  const rules = GENERATION_RULESETS.POST_GEN_6

  it('returns empty board for missing player', () => {
    const board = buildSoulLinkPlayerBoard('missing', {}, {}, rules)
    expect(board.team).toEqual([])
    expect(board.box).toEqual([])
    expect(board.pinnedGym).toBe(null)
    expect(board.remainingGyms.length).toBeGreaterThan(0)
    expect(board.defeatedGymsList).toEqual([])
  })

  it('converts roster members to UI format', () => {
    const rosters = {
      'player-1': {
        team: [slMember({ id: 't1' })],
        box: [slMember({ id: 'b1', speciesName: 'Squirtle' })],
      },
    }
    const board = buildSoulLinkPlayerBoard('player-1', rosters, {}, rules)
    expect(board.team).toHaveLength(1)
    expect(board.team[0].name).toBe('Bulbasaur')
    expect(board.box).toHaveLength(1)
    expect(board.box[0].name).toBe('Squirtle')
  })

  it('separates remaining and defeated gyms', () => {
    const progress = {
      'player-1': { defeatedGyms: ['fire', 'water'], pinnedGym: 'grass' },
    }
    const board = buildSoulLinkPlayerBoard('player-1', {}, progress, rules)
    expect(board.defeatedGymsList).toHaveLength(2)
    expect(board.defeatedGymsList.map((g) => g.type)).toContain('fire')
    expect(board.defeatedGymsList.map((g) => g.type)).toContain('water')
    expect(board.remainingGyms.every((g) => g.type !== 'fire')).toBe(true)
    expect(board.pinnedGym).toBe('grass')
  })

  it('resolves paired partners from partner roster', () => {
    const rosters = {
      'player-1': {
        team: [slMember({ id: 't1', pairId: 'partner-1' })],
        box: [],
      },
    }
    const partnerRoster = [
      uiMember({ id: 'partner-1', name: 'Pikachu', spriteVariant: 'shiny' }),
    ]
    const board = buildSoulLinkPlayerBoard(
      'player-1',
      rosters,
      {},
      rules,
      partnerRoster,
    )
    expect(board.team[0].pairedPartner).toEqual({
      name: 'Pikachu',
      spriteVariant: 'shiny',
      megaSpriteId: null,
    })
  })

  it('sets pairedPartner to null when no partner roster', () => {
    const rosters = {
      'player-1': {
        team: [slMember({ id: 't1', pairId: 'partner-1' })],
        box: [],
      },
    }
    const board = buildSoulLinkPlayerBoard('player-1', rosters, {}, rules)
    expect(board.team[0].pairedPartner).toBe(null)
  })

  it('sorts gyms by score ascending', () => {
    const rosters = {
      'player-1': {
        team: [
          slMember({
            id: 't1',
            speciesName: 'Bulbasaur',
            types: ['grass', 'poison'],
          }),
        ],
        box: [],
      },
    }
    const board = buildSoulLinkPlayerBoard('player-1', rosters, {}, rules)
    for (let i = 1; i < board.remainingGyms.length; i++) {
      expect(board.remainingGyms[i].score).toBeGreaterThanOrEqual(
        board.remainingGyms[i - 1].score,
      )
    }
  })
})

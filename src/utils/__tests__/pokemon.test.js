import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMegaEvolution, getMegaOptions } from '../../data/megaEvolutions.js'
import { GENERATION_RULESETS } from '../../data/types.js'
import {
  buildPokemonMember,
  generatePokemonId,
  getBerrySprite,
  getMegaSpriteUrl,
  getSpriteUrl,
  pickMemberFields,
  resolveSpriteUrl,
} from '../pokemon.js'

const BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

describe('getSpriteUrl', () => {
  it('returns official-artwork URL for a known pokemon', () => {
    const url = getSpriteUrl('Bulbasaur')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/1.png`)
  })

  it('returns correct index-based ID (Charmander is 4th)', () => {
    const url = getSpriteUrl('Charmander')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/4.png`)
  })

  it('returns null for unknown pokemon', () => {
    expect(getSpriteUrl('FakeMon')).toBeNull()
  })

  it('uses spriteId when present instead of array index', () => {
    // Rotom-Heat has spriteId: 10008
    const url = getSpriteUrl('Rotom-Heat')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/10008.png`)
  })

  it('returns female variant URL', () => {
    const url = getSpriteUrl('Bulbasaur', 'female')
    expect(url).toBe(`${BASE_URL}/female/1.png`)
  })

  it('returns shiny variant URL', () => {
    const url = getSpriteUrl('Bulbasaur', 'shiny')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/shiny/1.png`)
  })

  it('returns shiny-female variant URL', () => {
    const url = getSpriteUrl('Bulbasaur', 'shiny-female')
    expect(url).toBe(`${BASE_URL}/shiny/female/1.png`)
  })
})

describe('resolveSpriteUrl small sprites', () => {
  it('returns small sprite URL for default variant', () => {
    expect(resolveSpriteUrl('Bulbasaur', { small: true })).toBe(
      '/sprites/1.png',
    )
  })

  it('handles shiny variant', () => {
    const url = resolveSpriteUrl('Bulbasaur', { small: true, variant: 'shiny' })
    expect(url).toBe(`${BASE_URL}/shiny/1.png`)
  })

  it('handles female variant', () => {
    const url = resolveSpriteUrl('Bulbasaur', {
      small: true,
      variant: 'female',
    })
    expect(url).toBe(`${BASE_URL}/female/1.png`)
  })

  it('handles shiny-female variant', () => {
    const url = resolveSpriteUrl('Bulbasaur', {
      small: true,
      variant: 'shiny-female',
    })
    expect(url).toBe(`${BASE_URL}/shiny/female/1.png`)
  })

  it('returns null for unknown pokemon', () => {
    expect(resolveSpriteUrl('FakeMon', { small: true })).toBeNull()
  })

  it('uses spriteId when present', () => {
    expect(resolveSpriteUrl('Rotom-Heat', { small: true })).toBe(
      '/sprites/10008.png',
    )
  })
})

describe('getBerrySprite', () => {
  it('returns null for falsy input', () => {
    expect(getBerrySprite(null)).toBeNull()
    expect(getBerrySprite(undefined)).toBeNull()
    expect(getBerrySprite('')).toBeNull()
  })

  it('slugifies berry name to URL', () => {
    const url = getBerrySprite('Occa Berry')
    expect(url).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/occa-berry.png',
    )
  })

  it('handles Nevermelt Ice special case', () => {
    const url = getBerrySprite('Nevermelt Ice')
    expect(url).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/never-melt-ice.png',
    )
  })
})

describe('getMegaSpriteUrl', () => {
  it('builds URL from spriteId', () => {
    const url = getMegaSpriteUrl(10033)
    expect(url).toBe(`${BASE_URL}/other/official-artwork/10033.png`)
  })

  it('handles shiny variant', () => {
    const url = getMegaSpriteUrl(10033, 'shiny')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/shiny/10033.png`)
  })
  it('routes shiny Mega exception IDs through the shared HOME route', () => {
    expect(getMegaSpriteUrl(10309, 'shiny')).toContain(
      '/other/home/shiny/10309.png',
    )
    expect(getMegaSpriteUrl(10318, 'shiny-female')).toContain(
      '/other/home/shiny/10318.png',
    )
    expect(getMegaSpriteUrl(10322, 'shiny')).toContain(
      '/other/home/shiny/10322.png',
    )
    expect(getMegaSpriteUrl(10323, 'shiny-female')).toContain(
      '/other/home/shiny/10323.png',
    )
    expect(getMegaSpriteUrl(10307, 'shiny')).toBe(
      `${BASE_URL}/other/official-artwork/shiny/10307.png`,
    )
    expect(getMegaSpriteUrl(10309)).toBe(
      `${BASE_URL}/other/official-artwork/10309.png`,
    )
  })
})
describe('new Mega catalog entries', () => {
  it('keeps split forms distinct and restricts new eligibility to exact base variants', () => {
    expect(
      getMegaOptions('Raichu').map(({ form, spriteId }) => [form, spriteId]),
    ).toEqual([
      ['mega-x', 10304],
      ['mega-y', 10305],
    ])
    expect(getMegaEvolution('Garchomp', 'mega').spriteId).toBe(10058)
    expect(getMegaEvolution('Garchomp', 'mega-z')).toMatchObject({
      types: ['dragon'],
      spriteId: 10309,
    })
    expect(
      getMegaOptions('Floette-Eternal').map((mega) => mega.spriteId),
    ).toEqual([10296])
    expect(getMegaOptions('Floette')).toEqual([])
    expect(
      getMegaOptions('Zygarde-Complete').map((mega) => mega.spriteId),
    ).toEqual([10301])
    expect(getMegaOptions('Zygarde')).toEqual([])
    expect(getMegaOptions('Zygarde-10%')).toEqual([])
    expect(getMegaOptions('Alolan Raichu')).toEqual([])
    expect(getMegaOptions('Tatsugiri').map((mega) => mega.spriteId)).toEqual([
      10322,
    ])
    expect(
      getMegaOptions('Tatsugiri-Droopy').map((mega) => mega.spriteId),
    ).toEqual([10323])
    expect(
      getMegaOptions('Tatsugiri-Stretchy').map((mega) => mega.spriteId),
    ).toEqual([10324])
  })

  it('does not expose new Mega options before generation 6', () => {
    expect(getMegaOptions('Garchomp', GENERATION_RULESETS.PRE_GEN_6)).toEqual(
      [],
    )
    expect(
      getMegaOptions('Tatsugiri-Droopy', GENERATION_RULESETS.PRE_GEN_6),
    ).toEqual([])
  })
})

describe('resolveSpriteUrl', () => {
  it('returns mega sprite URL when megaSpriteId is provided', () => {
    const url = resolveSpriteUrl('Charizard', { megaSpriteId: 10033 })
    expect(url).toBe(`${BASE_URL}/other/official-artwork/10033.png`)
  })

  it('returns small sprite URL when small is true', () => {
    const url = resolveSpriteUrl('Bulbasaur', { small: true })
    expect(url).toBe('/sprites/1.png')
  })

  it('returns full sprite URL by default', () => {
    const url = resolveSpriteUrl('Bulbasaur')
    expect(url).toBe(`${BASE_URL}/other/official-artwork/1.png`)
  })

  it('passes variant through', () => {
    const url = resolveSpriteUrl('Bulbasaur', { variant: 'shiny' })
    expect(url).toBe(`${BASE_URL}/other/official-artwork/shiny/1.png`)
  })

  it('prioritizes megaSpriteId over small', () => {
    const url = resolveSpriteUrl('Bulbasaur', {
      megaSpriteId: 10033,
      small: true,
    })
    expect(url).toBe(`${BASE_URL}/other/official-artwork/10033.png`)
  })
})

describe('generatePokemonId', () => {
  it('returns a timestamp string for team source', () => {
    const before = Date.now()
    const id = generatePokemonId('team')
    const after = Date.now()

    const num = Number(id)
    expect(num).toBeGreaterThanOrEqual(before)
    expect(num).toBeLessThanOrEqual(after)
    expect(id).not.toContain('-')
  })

  it('defaults to team source', () => {
    const id = generatePokemonId()
    expect(id).not.toContain('-')
  })

  it('appends suffix for box source', () => {
    const id = generatePokemonId('box')
    expect(id).toMatch(/^\d+-box$/)
  })

  it('appends suffix for temp source', () => {
    const id = generatePokemonId('temp')
    expect(id).toMatch(/^\d+-temp$/)
  })
})

describe('pickMemberFields', () => {
  it('picks known fields from source', () => {
    const source = {
      ability: 'Levitate',
      berry: 'Occa Berry',
      moves: ['fire', 'water'],
      specialMove: 'Freeze-Dry',
      extraField: 'ignored',
    }
    const result = pickMemberFields(source)

    expect(result.ability).toBe('Levitate')
    expect(result.berry).toBe('Occa Berry')
    expect(result.moves).toEqual(['fire', 'water'])
    expect(result.specialMove).toBe('Freeze-Dry')
    expect(result).not.toHaveProperty('extraField')
  })

  it('uses defaults for missing fields', () => {
    const result = pickMemberFields({})

    expect(result.ability).toBeNull()
    expect(result.berry).toBeNull()
    expect(result.moves).toEqual([])
    expect(result.specialMove).toBeNull()
    expect(result.megaForm).toBeNull()
    expect(result.megaTypes).toBeNull()
    expect(result.megaSpriteId).toBeNull()
    expect(result.spriteVariant).toBe('default')
    expect(result.nickname).toBeNull()
    expect(result.catchLocation).toBeNull()
    expect(result.pairId).toBeNull()
  })
})

describe('buildPokemonMember', () => {
  it('builds from draft source (has .pokemon property)', () => {
    const draft = {
      pokemon: { name: 'Pikachu', types: ['electric'] },
      ability: 'Static',
      moves: ['electric', null, 'normal'],
      berry: null,
    }
    const result = buildPokemonMember(draft, { id: 'test-id' })

    expect(result.id).toBe('test-id')
    expect(result.name).toBe('Pikachu')
    expect(result.types).toEqual(['electric'])
    expect(result.ability).toBe('Static')
    expect(result.moves).toEqual(['electric', 'normal'])
  })

  it('builds from existing member (no .pokemon property)', () => {
    const member = {
      name: 'Pikachu',
      types: ['electric'],
      ability: 'Static',
      moves: ['electric'],
    }
    const result = buildPokemonMember(member, { id: 'test-id' })

    expect(result.name).toBe('Pikachu')
    expect(result.types).toEqual(['electric'])
    expect(result.moves).toEqual(['electric'])
  })

  it('generates an ID when none provided', () => {
    const member = { name: 'Pikachu', types: ['electric'] }
    const result = buildPokemonMember(member)
    expect(result.id).toBeTruthy()
  })

  it('uses source option for ID generation suffix', () => {
    const member = { name: 'Pikachu', types: ['electric'] }
    const result = buildPokemonMember(member, { source: 'box' })
    expect(result.id).toMatch(/^\d+-box$/)
  })
})

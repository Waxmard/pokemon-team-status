import { describe, expect, it } from 'vitest'
import { getSuggestionIndicator } from '../suggestion.js'

describe('getSuggestionIndicator', () => {
  it('returns up arrow for positive improvement', () => {
    expect(getSuggestionIndicator(5)).toEqual({
      symbol: '▲',
      cls: 'improvement-up',
    })
  })

  it('returns down arrow for negative improvement', () => {
    expect(getSuggestionIndicator(-3)).toEqual({
      symbol: '▼',
      cls: 'improvement-down',
    })
  })

  it('returns dash for zero improvement', () => {
    expect(getSuggestionIndicator(0)).toEqual({
      symbol: '—',
      cls: 'improvement-neutral',
    })
  })
})

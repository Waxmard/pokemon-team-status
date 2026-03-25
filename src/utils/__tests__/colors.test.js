import { describe, expect, it } from 'vitest'
import { getTypeBackground, hexToRgba } from '../colors.js'

describe('hexToRgba', () => {
  it('converts hex color to rgba string', () => {
    expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('handles hex without hash', () => {
    expect(hexToRgba('00ff00', 1)).toBe('rgba(0, 255, 0, 1)')
  })
})

describe('getTypeBackground', () => {
  it('returns a background gradient object for a type', () => {
    const result = getTypeBackground('fire')
    expect(result).toHaveProperty('background')
    expect(result.background).toMatch(/^linear-gradient\(135deg,/)
    expect(result.background).toMatch(/rgba\(/)
  })

  it('uses custom opacity', () => {
    const result = getTypeBackground('water', 0.3)
    expect(result.background).toMatch(/rgba\(/)
  })
})

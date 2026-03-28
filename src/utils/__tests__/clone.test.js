import { describe, expect, it } from 'vitest'
import { cloneValue, deepFreeze } from '../clone.js'

describe('deepFreeze', () => {
  it('freezes a plain object', () => {
    const obj = { a: 1 }
    deepFreeze(obj)
    expect(Object.isFrozen(obj)).toBe(true)
  })

  it('freezes nested objects recursively', () => {
    const obj = { a: { b: { c: 3 } } }
    deepFreeze(obj)
    expect(Object.isFrozen(obj)).toBe(true)
    expect(Object.isFrozen(obj.a)).toBe(true)
    expect(Object.isFrozen(obj.a.b)).toBe(true)
  })

  it('freezes arrays and their contents', () => {
    const arr = [{ x: 1 }, { y: 2 }]
    deepFreeze(arr)
    expect(Object.isFrozen(arr)).toBe(true)
    expect(Object.isFrozen(arr[0])).toBe(true)
  })

  it('returns the value unchanged for primitives', () => {
    expect(deepFreeze(42)).toBe(42)
    expect(deepFreeze('hello')).toBe('hello')
    expect(deepFreeze(true)).toBe(true)
  })

  it('handles null and undefined gracefully', () => {
    expect(deepFreeze(null)).toBe(null)
    expect(deepFreeze(undefined)).toBe(undefined)
  })

  it('returns the same reference', () => {
    const obj = { a: 1 }
    const result = deepFreeze(obj)
    expect(result).toBe(obj)
  })
})

describe('cloneValue', () => {
  it('produces a deep clone that does not share references', () => {
    const original = { a: { b: 1 }, c: [2, 3] }
    const cloned = cloneValue(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.a).not.toBe(original.a)
    expect(cloned.c).not.toBe(original.c)
  })

  it('returns a frozen result', () => {
    const cloned = cloneValue({ x: { y: 1 } })
    expect(Object.isFrozen(cloned)).toBe(true)
    expect(Object.isFrozen(cloned.x)).toBe(true)
  })

  it('clones arrays correctly', () => {
    const original = [1, [2, 3], { a: 4 }]
    const cloned = cloneValue(original)

    expect(cloned).toEqual(original)
    expect(cloned[1]).not.toBe(original[1])
    expect(cloned[2]).not.toBe(original[2])
  })

  it('handles empty objects and arrays', () => {
    expect(cloneValue({})).toEqual({})
    expect(cloneValue([])).toEqual([])
  })

  it('strips undefined values (JSON round-trip behavior)', () => {
    const original = { a: 1, b: undefined }
    const cloned = cloneValue(original)
    expect(cloned).toEqual({ a: 1 })
    expect('b' in cloned).toBe(false)
  })
})

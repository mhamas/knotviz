import { describe, it, expect } from 'vitest'
import { createTypeState, updateTypeState, resolveType, isValidPropertyValue } from '../lib/typeDetection'

describe('createTypeState', () => {
  it('initializes with all flags true and zero count', () => {
    const state = createTypeState()
    expect(state.nonNullCount).toBe(0)
    expect(state.isAllBoolean).toBe(true)
    expect(state.isAllNumber).toBe(true)
    expect(state.isAllDate).toBe(true)
    expect(state.isAllStringArray).toBe(true)
  })
})

describe('updateTypeState', () => {
  it('increments nonNullCount', () => {
    const state = createTypeState()
    updateTypeState(state, 42)
    expect(state.nonNullCount).toBe(1)
    updateTypeState(state, 'hello')
    expect(state.nonNullCount).toBe(2)
  })

  it('flips isAllBoolean on non-boolean', () => {
    const state = createTypeState()
    updateTypeState(state, true)
    expect(state.isAllBoolean).toBe(true)
    updateTypeState(state, 'not boolean')
    expect(state.isAllBoolean).toBe(false)
  })

  it('flips isAllNumber on non-number', () => {
    const state = createTypeState()
    updateTypeState(state, 42)
    expect(state.isAllNumber).toBe(true)
    updateTypeState(state, 'not number')
    expect(state.isAllNumber).toBe(false)
  })

  it('flips isAllDate on non-date string', () => {
    const state = createTypeState()
    updateTypeState(state, '2024-01-15')
    expect(state.isAllDate).toBe(true)
    updateTypeState(state, 'not-a-date')
    expect(state.isAllDate).toBe(false)
  })

  it('flips isAllStringArray on non-array', () => {
    const state = createTypeState()
    updateTypeState(state, ['a', 'b'])
    expect(state.isAllStringArray).toBe(true)
    updateTypeState(state, 'plain string')
    expect(state.isAllStringArray).toBe(false)
  })
})

describe('resolveType', () => {
  it('defaults to number when no values seen', () => {
    expect(resolveType(createTypeState())).toBe('number')
  })

  it('resolves boolean', () => {
    const state = createTypeState()
    updateTypeState(state, true)
    updateTypeState(state, false)
    expect(resolveType(state)).toBe('boolean')
  })

  it('resolves number', () => {
    const state = createTypeState()
    updateTypeState(state, 1)
    updateTypeState(state, 2)
    expect(resolveType(state)).toBe('number')
  })

  it('resolves date', () => {
    const state = createTypeState()
    updateTypeState(state, '2024-01-15')
    updateTypeState(state, '2023-06-01T10:00:00Z')
    expect(resolveType(state)).toBe('date')
  })

  it('resolves string[]', () => {
    const state = createTypeState()
    updateTypeState(state, ['a', 'b'])
    updateTypeState(state, ['c'])
    expect(resolveType(state)).toBe('string[]')
  })

  it('resolves string as fallback for mixed types', () => {
    const state = createTypeState()
    updateTypeState(state, 42)
    updateTypeState(state, 'hello')
    expect(resolveType(state)).toBe('string')
  })
})

describe('isValidPropertyValue', () => {
  it('accepts number', () => {
    expect(isValidPropertyValue(42)).toBe(true)
  })

  it('accepts string', () => {
    expect(isValidPropertyValue('hello')).toBe(true)
  })

  it('accepts boolean', () => {
    expect(isValidPropertyValue(true)).toBe(true)
  })

  it('accepts string[]', () => {
    expect(isValidPropertyValue(['a', 'b'])).toBe(true)
  })

  it('accepts empty array as string[]', () => {
    expect(isValidPropertyValue([])).toBe(true)
  })

  it('rejects object', () => {
    expect(isValidPropertyValue({ key: 'value' })).toBe(false)
  })

  it('rejects null', () => {
    expect(isValidPropertyValue(null)).toBe(false)
  })

  it('rejects mixed array', () => {
    expect(isValidPropertyValue(['a', 42])).toBe(false)
  })
})

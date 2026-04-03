import { describe, it, expect } from 'vitest'
import { passesFilter, hexToRgbNorm, interpolateStops } from '../lib/appearanceUtils'
import type { SerializableFilter } from '../lib/appearanceUtils'

describe('passesFilter', () => {
  it('number filter passes when value is in range', () => {
    const f: SerializableFilter = { type: 'number', isEnabled: true, min: 10, max: 50 }
    expect(passesFilter(25, f)).toBe(true)
    expect(passesFilter(10, f)).toBe(true)
    expect(passesFilter(50, f)).toBe(true)
  })

  it('number filter fails when value is out of range', () => {
    const f: SerializableFilter = { type: 'number', isEnabled: true, min: 10, max: 50 }
    expect(passesFilter(9, f)).toBe(false)
    expect(passesFilter(51, f)).toBe(false)
  })

  it('number filter fails for non-number value', () => {
    const f: SerializableFilter = { type: 'number', isEnabled: true, min: 0, max: 100 }
    expect(passesFilter('hello', f)).toBe(false)
    expect(passesFilter(undefined, f)).toBe(false)
  })

  it('boolean filter matches selected value', () => {
    const fTrue: SerializableFilter = { type: 'boolean', isEnabled: true, selected: true }
    const fFalse: SerializableFilter = { type: 'boolean', isEnabled: true, selected: false }
    expect(passesFilter(true, fTrue)).toBe(true)
    expect(passesFilter(false, fTrue)).toBe(false)
    expect(passesFilter(false, fFalse)).toBe(true)
  })

  it('string filter with empty set passes all', () => {
    const f: SerializableFilter = { type: 'string', isEnabled: true, selectedSet: new Set() }
    expect(passesFilter('anything', f)).toBe(true)
  })

  it('string filter with values only passes matching', () => {
    const f: SerializableFilter = { type: 'string', isEnabled: true, selectedSet: new Set(['a', 'b']) }
    expect(passesFilter('a', f)).toBe(true)
    expect(passesFilter('c', f)).toBe(false)
  })

  it('string filter fails for non-string value', () => {
    const f: SerializableFilter = { type: 'string', isEnabled: true, selectedSet: new Set(['a']) }
    expect(passesFilter(123, f)).toBe(false)
  })

  it('string[] filter with empty set passes all', () => {
    const f: SerializableFilter = { type: 'string[]', isEnabled: true, selectedSet: new Set() }
    expect(passesFilter(['a', 'b'], f)).toBe(true)
  })

  it('string[] filter passes if any array element matches', () => {
    const f: SerializableFilter = { type: 'string[]', isEnabled: true, selectedSet: new Set(['b', 'c']) }
    expect(passesFilter(['a', 'b'], f)).toBe(true)
    expect(passesFilter(['c', 'd'], f)).toBe(true)
    expect(passesFilter(['x', 'y'], f)).toBe(false)
  })

  it('string[] filter fails for non-array value', () => {
    const f: SerializableFilter = { type: 'string[]', isEnabled: true, selectedSet: new Set(['a']) }
    expect(passesFilter('a', f)).toBe(false)
    expect(passesFilter(123, f)).toBe(false)
  })

  it('string[] filter fails for empty array', () => {
    const f: SerializableFilter = { type: 'string[]', isEnabled: true, selectedSet: new Set(['a']) }
    expect(passesFilter([], f)).toBe(false)
  })

  it('date filter passes when in range', () => {
    const f: SerializableFilter = { type: 'date', isEnabled: true, after: '2020-01-01', before: '2024-12-31' }
    expect(passesFilter('2022-06-15', f)).toBe(true)
    expect(passesFilter('2020-01-01', f)).toBe(true)
    expect(passesFilter('2024-12-31', f)).toBe(true)
  })

  it('date filter fails when out of range', () => {
    const f: SerializableFilter = { type: 'date', isEnabled: true, after: '2020-01-01', before: '2024-12-31' }
    expect(passesFilter('2019-12-31', f)).toBe(false)
    expect(passesFilter('2025-01-01', f)).toBe(false)
  })
})

describe('hexToRgbNorm', () => {
  it('parses black', () => {
    expect(hexToRgbNorm('#000000')).toEqual([0, 0, 0])
  })

  it('parses white', () => {
    expect(hexToRgbNorm('#ffffff')).toEqual([1, 1, 1])
  })

  it('parses red', () => {
    expect(hexToRgbNorm('#ff0000')).toEqual([1, 0, 0])
  })

  it('works without # prefix', () => {
    expect(hexToRgbNorm('00ff00')).toEqual([0, 1, 0])
  })
})

describe('interpolateStops', () => {
  const stops: [number, number, number][] = [[0, 0, 0], [1, 1, 1]]

  it('returns first stop at t=0', () => {
    expect(interpolateStops(stops, 0)).toEqual([0, 0, 0])
  })

  it('returns last stop at t=1', () => {
    expect(interpolateStops(stops, 1)).toEqual([1, 1, 1])
  })

  it('interpolates midpoint', () => {
    const result = interpolateStops(stops, 0.5)
    expect(result[0]).toBeCloseTo(0.5)
    expect(result[1]).toBeCloseTo(0.5)
    expect(result[2]).toBeCloseTo(0.5)
  })

  it('clamps below 0', () => {
    expect(interpolateStops(stops, -1)).toEqual([0, 0, 0])
  })

  it('clamps above 1', () => {
    expect(interpolateStops(stops, 2)).toEqual([1, 1, 1])
  })

  it('works with 3 stops', () => {
    const threeStops: [number, number, number][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    // t=0.5 should be the middle stop
    expect(interpolateStops(threeStops, 0.5)).toEqual([0, 1, 0])
  })
})

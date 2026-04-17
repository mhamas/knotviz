import { describe, it, expect } from 'vitest'
import { collectSamples } from '../lib/collectSamples'

describe('collectSamples', () => {
  it('returns {id, label} for the first N set bits of the bitmask', () => {
    const bitmask = new Uint8Array([1, 0, 1, 1, 0])
    const labels = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']
    const ids = ['1', '2', '3', '4', '5']
    expect(collectSamples(bitmask, labels, ids, 5, 10)).toEqual([
      { id: '1', label: 'Alice' },
      { id: '3', label: 'Carol' },
      { id: '4', label: 'Dave' },
    ])
  })

  it('stops at maxCount', () => {
    const bitmask = new Uint8Array([1, 1, 1, 1, 1])
    const labels = ['a', 'b', 'c', 'd', 'e']
    const ids = ['1', '2', '3', '4', '5']
    const out = collectSamples(bitmask, labels, ids, 5, 2)
    expect(out.length).toBe(2)
    expect(out[0]).toEqual({ id: '1', label: 'a' })
    expect(out[1]).toEqual({ id: '2', label: 'b' })
  })

  it('falls back to empty string when label is undefined', () => {
    const bitmask = new Uint8Array([1, 1])
    const labels: (string | undefined)[] = [undefined, 'Bob']
    const ids = ['node-1', '2']
    expect(collectSamples(bitmask, labels, ids, 2, 10)).toEqual([
      { id: 'node-1', label: '' },
      { id: '2', label: 'Bob' },
    ])
  })

  it('returns [] when the bitmask has no set bits', () => {
    const bitmask = new Uint8Array([0, 0, 0])
    expect(collectSamples(bitmask, ['a', 'b', 'c'], ['1', '2', '3'], 3, 10)).toEqual([])
  })

  it('respects nodeCount (does not read past bounds)', () => {
    // bitmask indexes 0..5 all set, but we only allow nodeCount=3
    const bitmask = new Uint8Array([1, 1, 1, 1, 1, 1])
    const labels = ['a', 'b', 'c', 'd', 'e', 'f']
    const ids = ['1', '2', '3', '4', '5', '6']
    expect(collectSamples(bitmask, labels, ids, 3, 10)).toEqual([
      { id: '1', label: 'a' },
      { id: '2', label: 'b' },
      { id: '3', label: 'c' },
    ])
  })

  it('returns [] when maxCount is 0', () => {
    const bitmask = new Uint8Array([1, 1, 1])
    expect(collectSamples(bitmask, ['a', 'b', 'c'], ['1', '2', '3'], 3, 0)).toEqual([])
  })
})

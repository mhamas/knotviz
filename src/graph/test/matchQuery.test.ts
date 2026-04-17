import { describe, it, expect } from 'vitest'
import { matchQuery } from '../lib/matchQuery'

describe('matchQuery', () => {
  it('matches substring (pre-lowered inputs) and returns match count', () => {
    const out = new Uint8Array(3)
    const count = matchQuery('foo', ['foobar abc', 'baz def', 'food xyz'], 3, out)
    expect(Array.from(out)).toEqual([1, 0, 1])
    expect(count).toBe(2)
  })

  it('returns 0 and all-zero bitmask when nothing matches', () => {
    const out = new Uint8Array(2)
    const count = matchQuery('zzz', ['aaa', 'bbb'], 2, out)
    expect(count).toBe(0)
    expect(Array.from(out)).toEqual([0, 0])
  })

  it('handles empty haystack entries (no match)', () => {
    const out = new Uint8Array(3)
    const count = matchQuery('foo', ['', 'foo bar', ''], 3, out)
    expect(Array.from(out)).toEqual([0, 1, 0])
    expect(count).toBe(1)
  })

  it('leaves non-match slots untouched (caller must supply a zero buffer)', () => {
    // Mimic the worker's contract: fresh Uint8Array is zero-initialized.
    const out = new Uint8Array(3)
    const count = matchQuery('foo', ['xxx', 'foo', 'xxx'], 3, out)
    expect(Array.from(out)).toEqual([0, 1, 0])
    expect(count).toBe(1)
  })

  it('matches when query is an exact substring at start, middle, and end', () => {
    const out = new Uint8Array(3)
    const count = matchQuery('ab', ['abcd', 'xabx', 'xxab'], 3, out)
    expect(Array.from(out)).toEqual([1, 1, 1])
    expect(count).toBe(3)
  })

  it('matches nothing when nodeCount is 0', () => {
    const out = new Uint8Array(0)
    const count = matchQuery('foo', [], 0, out)
    expect(count).toBe(0)
  })

  it('respects nodeCount (does not read past bounds)', () => {
    const out = new Uint8Array(2)
    const count = matchQuery('foo', ['foo', 'foo', 'foo'], 2, out)
    expect(Array.from(out)).toEqual([1, 1])
    expect(count).toBe(2)
  })
})

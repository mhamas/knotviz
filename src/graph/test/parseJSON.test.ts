import { describe, it, expect } from 'vitest'
import { parseJSON } from '../lib/parseJSON'

describe('parseJSON', () => {
  it('parses valid JSON', () => {
    const result = parseJSON('{"a":1}') as Record<string, unknown>
    expect(result.a).toBe(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseJSON('{invalid')).toThrow()
  })

  it('throws on empty string', () => {
    expect(() => parseJSON('')).toThrow()
  })

  it('parses arrays', () => {
    const result = parseJSON('[1,2,3]')
    expect(result).toEqual([1, 2, 3])
  })
})

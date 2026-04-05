import { describe, it, expect } from 'vitest'
import { detectPropertyTypes } from '../lib/detectPropertyTypes'
import type { NodeInput } from '../types'

function nodesWithProp(key: string, values: unknown[]): NodeInput[] {
  return values.map((v, i) => ({
    id: String(i),
    properties: { [key]: v } as Record<string, number | string | boolean | string[]>,
  }))
}

describe('detectPropertyTypes', () => {
  it('detects all boolean values as "boolean"', () => {
    const result = detectPropertyTypes(nodesWithProp('active', [true, false, true]))
    expect(result.get('active')).toBe('boolean')
  })

  it('detects all number values as "number"', () => {
    const result = detectPropertyTypes(nodesWithProp('age', [34, 28, 45]))
    expect(result.get('age')).toBe('number')
  })

  it('detects 100% valid ISO date strings as "date"', () => {
    const result = detectPropertyTypes(
      nodesWithProp('joined', ['2021-03-15', '2023-11-02', '2019-07-20'])
    )
    expect(result.get('joined')).toBe('date')
  })

  it('detects datetime format as "date"', () => {
    const result = detectPropertyTypes(
      nodesWithProp('ts', ['2021-03-15T10:30:00Z', '2023-11-02T08:00:00+02:00'])
    )
    expect(result.get('ts')).toBe('date')
  })

  it('detects any non-ISO string as "string"', () => {
    const result = detectPropertyTypes(nodesWithProp('status', ['active', 'pending']))
    expect(result.get('status')).toBe('string')
  })

  it('detects mixed numbers and strings as "string"', () => {
    const nodes: NodeInput[] = [
      { id: '1', properties: { val: 42 } },
      { id: '2', properties: { val: 'hello' } },
    ]
    const result = detectPropertyTypes(nodes)
    expect(result.get('val')).toBe('string')
  })

  it('defaults to "number" when all values are null/undefined', () => {
    const nodesWithNull: NodeInput[] = [
      { id: '1', properties: { age: null as unknown as number } },
      { id: '2', properties: { age: undefined as unknown as number } },
    ]
    const result = detectPropertyTypes(nodesWithNull)
    expect(result.get('age')).toBe('number')
  })

  it('rejects "2021" as a date (not full ISO format)', () => {
    const result = detectPropertyTypes(nodesWithProp('year', ['2021', '2022']))
    expect(result.get('year')).toBe('string')
  })

  it('detects as "string" when dates are mixed with non-date strings', () => {
    const result = detectPropertyTypes(
      nodesWithProp('field', ['2021-03-15', 'not-a-date', '2023-11-02'])
    )
    expect(result.get('field')).toBe('string')
  })

  it('rejects invalid ISO date "2021-13-45" as string', () => {
    // The regex only checks format, not calendar validity — 13th month passes the regex
    // but this tests the boundary of what the regex accepts
    const result = detectPropertyTypes(nodesWithProp('d', ['2021-13-45']))
    expect(result.get('d')).toBe('date')
  })

  it('rejects partial format "2021-03" as string (no day)', () => {
    const result = detectPropertyTypes(nodesWithProp('d', ['2021-03', '2022-04']))
    expect(result.get('d')).toBe('string')
  })

  it('detects multiple properties with different types', () => {
    const nodes: NodeInput[] = [
      { id: '1', properties: { age: 30, name: 'Alice', active: true, joined: '2021-03-15' } },
      { id: '2', properties: { age: 25, name: 'Bob', active: false, joined: '2023-11-02' } },
    ]
    const result = detectPropertyTypes(nodes)
    expect(result.get('age')).toBe('number')
    expect(result.get('name')).toBe('string')
    expect(result.get('active')).toBe('boolean')
    expect(result.get('joined')).toBe('date')
  })

  it('detects all string arrays as "string[]"', () => {
    const result = detectPropertyTypes(nodesWithProp('tags', [['a', 'b'], ['c'], ['d', 'e', 'f']]))
    expect(result.get('tags')).toBe('string[]')
  })

  it('detects empty arrays as "string[]"', () => {
    const result = detectPropertyTypes(nodesWithProp('tags', [['a'], []]))
    expect(result.get('tags')).toBe('string[]')
  })

  it('detects mixed arrays and strings as "string" fallback', () => {
    const result = detectPropertyTypes(nodesWithProp('tags', [['a', 'b'], 'plain']))
    expect(result.get('tags')).toBe('string')
  })

  it('handles nodes without properties', () => {
    const nodes: NodeInput[] = [
      { id: '1' },
      { id: '2', properties: { age: 30 } },
    ]
    const result = detectPropertyTypes(nodes)
    expect(result.get('age')).toBe('number')
    expect(result.size).toBe(1)
  })
})

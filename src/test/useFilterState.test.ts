import { describe, expect, it } from 'vitest'
import type {
  BooleanFilterState,
  DateFilterState,
  NumberFilterState,
  PropertyMeta,
  StringFilterState,
} from '../types'
import { initializeFilters } from '../hooks/useFilterState'
import type { PropertyColumns } from '../hooks/useFilterState'

const columns: PropertyColumns = {
  age: [34, 28, 45, 31, 27],
  active: [true, false, true, false, true],
  status: ['active', 'pending', 'active', 'inactive', 'pending'],
  joined: ['2021-03-15', '2023-11-02', '2019-07-20', '2022-01-10', '2024-05-30'],
}

const metas: PropertyMeta[] = [
  { key: 'age', type: 'number' },
  { key: 'active', type: 'boolean' },
  { key: 'status', type: 'string' },
  { key: 'joined', type: 'date' },
]

describe('initializeFilters', () => {
  it('creates a filter for each property meta', () => {
    const filters = initializeFilters(metas, columns)
    expect(filters.size).toBe(4)
    expect(filters.has('age')).toBe(true)
    expect(filters.has('active')).toBe(true)
    expect(filters.has('status')).toBe(true)
    expect(filters.has('joined')).toBe(true)
  })

  it('number filter gets correct domain min/max', () => {
    const filters = initializeFilters(metas, columns)
    const age = filters.get('age') as NumberFilterState
    expect(age.type).toBe('number')
    expect(age.domainMin).toBe(27)
    expect(age.domainMax).toBe(45)
    expect(age.min).toBe(27)
    expect(age.max).toBe(45)
    expect(age.isEnabled).toBe(false)
  })

  it('boolean filter initializes with selected=true', () => {
    const filters = initializeFilters(metas, columns)
    const active = filters.get('active') as BooleanFilterState
    expect(active.type).toBe('boolean')
    expect(active.selected).toBe(true)
    expect(active.isEnabled).toBe(false)
  })

  it('string filter gets sorted distinct values', () => {
    const filters = initializeFilters(metas, columns)
    const status = filters.get('status') as StringFilterState
    expect(status.type).toBe('string')
    expect(status.allValues).toEqual(['active', 'inactive', 'pending'])
    expect(status.selectedValues.size).toBe(0)
    expect(status.isEnabled).toBe(false)
  })

  it('date filter gets correct domain min/max', () => {
    const filters = initializeFilters(metas, columns)
    const joined = filters.get('joined') as DateFilterState
    expect(joined.type).toBe('date')
    expect(joined.domainMin).toBe('2019-07-20')
    expect(joined.domainMax).toBe('2024-05-30')
    expect(joined.after).toBe('2019-07-20')
    expect(joined.before).toBe('2024-05-30')
    expect(joined.isEnabled).toBe(false)
  })

  it('handles empty columns', () => {
    const filters = initializeFilters(metas, {})
    const age = filters.get('age') as NumberFilterState
    expect(age.domainMin).toBe(0)
    expect(age.domainMax).toBe(0)
  })

  it('handles single-value number column', () => {
    const filters = initializeFilters(
      [{ key: 'x', type: 'number' }],
      { x: [42] },
    )
    const x = filters.get('x') as NumberFilterState
    expect(x.domainMin).toBe(42)
    expect(x.domainMax).toBe(42)
  })
})

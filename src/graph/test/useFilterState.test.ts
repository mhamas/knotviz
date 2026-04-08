import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type {
  BooleanFilterState,
  DateFilterState,
  NumberFilterState,
  PropertyMeta,
  StringArrayFilterState,
  StringFilterState,
} from '../types'
import { initializeFilters, useFilterState } from '../hooks/useFilterState'
import type { PropertyColumns } from '../hooks/useFilterState'

const columns: PropertyColumns = {
  age: [34, 28, 45, 31, 27],
  active: [true, false, true, false, true],
  status: ['active', 'pending', 'active', 'inactive', 'pending'],
  joined: ['2021-03-15', '2023-11-02', '2019-07-20', '2022-01-10', '2024-05-30'],
  tags: [['web', 'api'], ['scraper', 'web'], ['api'], ['data', 'etl'], ['web']],
}

const metas: PropertyMeta[] = [
  { key: 'age', type: 'number' },
  { key: 'active', type: 'boolean' },
  { key: 'status', type: 'string' },
  { key: 'joined', type: 'date' },
  { key: 'tags', type: 'string[]' },
]

describe('initializeFilters', () => {
  it('creates a filter for each property meta', () => {
    const filters = initializeFilters(metas, columns)
    expect(filters.size).toBe(5)
    expect(filters.has('age')).toBe(true)
    expect(filters.has('active')).toBe(true)
    expect(filters.has('status')).toBe(true)
    expect(filters.has('joined')).toBe(true)
    expect(filters.has('tags')).toBe(true)
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

  it('number filter has isLogScale defaulting to false', () => {
    const filters = initializeFilters(metas, columns)
    const age = filters.get('age') as NumberFilterState
    expect(age.isLogScale).toBe(false)
  })

  it('number filter has precomputed histogram buckets', () => {
    const filters = initializeFilters(metas, columns)
    const age = filters.get('age') as NumberFilterState
    expect(age.histogramBuckets.length).toBeGreaterThanOrEqual(3)
    const totalCount = age.histogramBuckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(5)
  })

  it('number filter has precomputed log histogram buckets for non-negative domain', () => {
    const filters = initializeFilters(metas, columns)
    const age = filters.get('age') as NumberFilterState
    expect(age.logHistogramBuckets.length).toBeGreaterThanOrEqual(3)
    const totalCount = age.logHistogramBuckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(5)
  })

  it('number filter has empty log histogram when domain has negative values', () => {
    const filters = initializeFilters(
      [{ key: 'x', type: 'number' }],
      { x: [-10, -5, 0, 5, 10] },
    )
    const x = filters.get('x') as NumberFilterState
    expect(x.logHistogramBuckets).toEqual([])
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

  it('string[] filter gets flattened sorted distinct values', () => {
    const filters = initializeFilters(metas, columns)
    const tags = filters.get('tags') as StringArrayFilterState
    expect(tags.type).toBe('string[]')
    expect(tags.allValues).toEqual(['api', 'data', 'etl', 'scraper', 'web'])
    expect(tags.selectedValues.size).toBe(0)
    expect(tags.isEnabled).toBe(false)
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

  it('handles empty columns — histograms are empty', () => {
    const filters = initializeFilters(metas, {})
    const age = filters.get('age') as NumberFilterState
    expect(age.domainMin).toBe(0)
    expect(age.domainMax).toBe(0)
    expect(age.histogramBuckets).toEqual([])
    expect(age.logHistogramBuckets).toEqual([])
  })

  it('handles single-value number column — valid histograms', () => {
    const filters = initializeFilters(
      [{ key: 'x', type: 'number' }],
      { x: [42] },
    )
    const x = filters.get('x') as NumberFilterState
    expect(x.domainMin).toBe(42)
    expect(x.domainMax).toBe(42)
    expect(x.histogramBuckets).toHaveLength(3)
    expect(x.histogramBuckets[0].count).toBe(1)
    expect(x.logHistogramBuckets).toHaveLength(3)
    expect(x.logHistogramBuckets[0].count).toBe(1)
  })

  it('all-zero column produces valid histograms', () => {
    const filters = initializeFilters(
      [{ key: 'x', type: 'number' }],
      { x: [0, 0, 0] },
    )
    const x = filters.get('x') as NumberFilterState
    expect(x.domainMin).toBe(0)
    expect(x.domainMax).toBe(0)
    expect(x.histogramBuckets).toHaveLength(3)
    expect(x.logHistogramBuckets).toHaveLength(3)
    const linearTotal = x.histogramBuckets.reduce((s, b) => s + b.count, 0)
    const logTotal = x.logHistogramBuckets.reduce((s, b) => s + b.count, 0)
    expect(linearTotal).toBe(3)
    expect(logTotal).toBe(3)
  })

  it('histogram bucket counts equal the number of numeric values', () => {
    const filters = initializeFilters(metas, columns)
    const age = filters.get('age') as NumberFilterState
    const linearTotal = age.histogramBuckets.reduce((s, b) => s + b.count, 0)
    const logTotal = age.logHistogramBuckets.reduce((s, b) => s + b.count, 0)
    // age column has 5 numeric values
    expect(linearTotal).toBe(5)
    expect(logTotal).toBe(5)
  })
})

describe('useFilterState hook', () => {
  it('setNumberFilter updates min and max', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberFilter('age', 30, 40))
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.min).toBe(30)
    expect(age.max).toBe(40)
  })

  it('setNumberLogScale updates isLogScale', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberLogScale('age', true))
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.isLogScale).toBe(true)
  })

  it('clearAllFilters resets isLogScale to false', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberLogScale('age', true))
    act(() => result.current.clearAllFilters())
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.isLogScale).toBe(false)
  })

  it('setNumberLogScale preserves min/max range', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberFilter('age', 30, 40))
    act(() => result.current.setNumberLogScale('age', true))
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.min).toBe(30)
    expect(age.max).toBe(40)
    expect(age.isLogScale).toBe(true)
  })

  it('setNumberFilter preserves isLogScale', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberLogScale('age', true))
    act(() => result.current.setNumberFilter('age', 30, 40))
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.isLogScale).toBe(true)
    expect(age.min).toBe(30)
    expect(age.max).toBe(40)
  })

  it('setNumberLogScale preserves histogramBuckets', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    const before = (result.current.filters.get('age') as NumberFilterState).histogramBuckets
    act(() => result.current.setNumberLogScale('age', true))
    const after = (result.current.filters.get('age') as NumberFilterState).histogramBuckets
    expect(after).toEqual(before)
  })

  it('setFilterEnabled preserves isLogScale', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setNumberLogScale('age', true))
    act(() => result.current.setFilterEnabled('age', true))
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.isLogScale).toBe(true)
    expect(age.isEnabled).toBe(true)
  })

  it('clearAllFilters restores histogramBuckets', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    const before = (result.current.filters.get('age') as NumberFilterState).histogramBuckets
    act(() => {
      result.current.setNumberFilter('age', 30, 40)
      result.current.setNumberLogScale('age', true)
    })
    act(() => result.current.clearAllFilters())
    const after = (result.current.filters.get('age') as NumberFilterState).histogramBuckets
    expect(after).toEqual(before)
    expect((result.current.filters.get('age') as NumberFilterState).isLogScale).toBe(false)
  })

  it('setStringFilter updates selectedValues', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setStringFilter('status', new Set(['active', 'pending'])))
    const status = result.current.filters.get('status') as StringFilterState
    expect(status.selectedValues).toEqual(new Set(['active', 'pending']))
  })

  it('setStringFilter works for string[] type', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setStringFilter('tags', new Set(['web'])))
    const tags = result.current.filters.get('tags') as StringArrayFilterState
    expect(tags.selectedValues).toEqual(new Set(['web']))
  })

  it('setDateFilter updates after and before', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setDateFilter('joined', '2022-01-01', '2023-12-31'))
    const joined = result.current.filters.get('joined') as DateFilterState
    expect(joined.after).toBe('2022-01-01')
    expect(joined.before).toBe('2023-12-31')
  })

  it('setBooleanFilter updates selected', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setBooleanFilter('active', false))
    const active = result.current.filters.get('active') as BooleanFilterState
    expect(active.selected).toBe(false)
  })

  it('setFilterEnabled toggles isEnabled', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setFilterEnabled('age', true))
    expect(result.current.filters.get('age')!.isEnabled).toBe(true)
    act(() => result.current.setFilterEnabled('age', false))
    expect(result.current.filters.get('age')!.isEnabled).toBe(false)
  })

  it('setAllFiltersEnabled enables/disables all', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    act(() => result.current.setAllFiltersEnabled(true))
    for (const f of result.current.filters.values()) {
      expect(f.isEnabled).toBe(true)
    }
    act(() => result.current.setAllFiltersEnabled(false))
    for (const f of result.current.filters.values()) {
      expect(f.isEnabled).toBe(false)
    }
  })

  it('hasActiveFilters is true when any filter is enabled', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    expect(result.current.hasActiveFilters).toBe(false)
    act(() => result.current.setFilterEnabled('age', true))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('clearAllFilters resets to initial state', () => {
    const { result } = renderHook(() => useFilterState(metas, columns))
    // Mutate
    act(() => {
      result.current.setFilterEnabled('age', true)
      result.current.setNumberFilter('age', 30, 40)
      result.current.setStringFilter('status', new Set(['active']))
    })
    expect(result.current.hasActiveFilters).toBe(true)
    // Clear
    act(() => result.current.clearAllFilters())
    expect(result.current.hasActiveFilters).toBe(false)
    const age = result.current.filters.get('age') as NumberFilterState
    expect(age.isEnabled).toBe(false)
    expect(age.min).toBe(27)
    expect(age.max).toBe(45)
  })
})

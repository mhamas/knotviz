import { describe, expect, it } from 'vitest'
import type {
  BooleanFilterState,
  DateFilterState,
  GraphData,
  NumberFilterState,
  PropertyMeta,
  StringFilterState,
} from '../types'
import {
  buildNodeValueIndex,
  computeMatchingNodeIds,
  initializeFilters,
  nodePassesFilter,
} from '../hooks/useFilterState'

const sampleGraph: GraphData = {
  version: '1',
  nodes: [
    { id: '1', label: 'Alice', properties: { age: 34, active: true, status: 'active', joined: '2021-03-15' } },
    { id: '2', label: 'Bob', properties: { age: 28, active: false, status: 'pending', joined: '2023-11-02' } },
    { id: '3', label: 'Carol', properties: { age: 45, active: true, status: 'active', joined: '2019-07-20' } },
    { id: '4', label: 'Dave', properties: { age: 31, active: false, status: 'inactive', joined: '2022-01-10' } },
    { id: '5', label: 'Eve', properties: { age: 27, active: true, status: 'pending', joined: '2024-05-30' } },
  ],
  edges: [],
}

const metas: PropertyMeta[] = [
  { key: 'age', type: 'number' },
  { key: 'active', type: 'boolean' },
  { key: 'status', type: 'string' },
  { key: 'joined', type: 'date' },
]

describe('buildNodeValueIndex', () => {
  it('builds index with all properties and nodes', () => {
    const index = buildNodeValueIndex(sampleGraph)
    expect(index.size).toBe(4)
    expect(index.get('age')?.get('1')).toBe(34)
    expect(index.get('active')?.get('2')).toBe(false)
    expect(index.get('status')?.get('4')).toBe('inactive')
    expect(index.get('joined')?.get('5')).toBe('2024-05-30')
  })

  it('handles nodes without properties', () => {
    const graph: GraphData = {
      version: '1',
      nodes: [{ id: '1' }, { id: '2', properties: { x: 10 } }],
      edges: [],
    }
    const index = buildNodeValueIndex(graph)
    expect(index.size).toBe(1)
    expect(index.get('x')?.size).toBe(1)
  })
})

describe('initializeFilters', () => {
  const index = buildNodeValueIndex(sampleGraph)

  it('initializes number filter with correct domain', () => {
    const filters = initializeFilters(metas, index)
    const ageFilter = filters.get('age') as NumberFilterState
    expect(ageFilter.type).toBe('number')
    expect(ageFilter.isEnabled).toBe(false)
    expect(ageFilter.domainMin).toBe(27)
    expect(ageFilter.domainMax).toBe(45)
    expect(ageFilter.min).toBe(27)
    expect(ageFilter.max).toBe(45)
  })

  it('initializes boolean filter with either', () => {
    const filters = initializeFilters(metas, index)
    const boolFilter = filters.get('active') as BooleanFilterState
    expect(boolFilter.type).toBe('boolean')
    expect(boolFilter.selected).toBe('either')
    expect(boolFilter.isEnabled).toBe(false)
  })

  it('initializes string filter with all values pre-selected (<=50)', () => {
    const filters = initializeFilters(metas, index)
    const strFilter = filters.get('status') as StringFilterState
    expect(strFilter.type).toBe('string')
    expect(strFilter.allValues).toEqual(['active', 'inactive', 'pending'])
    expect(strFilter.selectedValues).toEqual(new Set(['active', 'inactive', 'pending']))
  })

  it('initializes date filter with null bounds', () => {
    const filters = initializeFilters(metas, index)
    const dateFilter = filters.get('joined') as DateFilterState
    expect(dateFilter.type).toBe('date')
    expect(dateFilter.after).toBeNull()
    expect(dateFilter.before).toBeNull()
  })

  it('string filter: >50 distinct values → empty selectedValues', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => ({
      id: String(i),
      properties: { tag: `tag_${i}` },
    }))
    const graph: GraphData = { version: '1', nodes, edges: [] }
    const idx = buildNodeValueIndex(graph)
    const filters = initializeFilters([{ key: 'tag', type: 'string' }], idx)
    const strFilter = filters.get('tag') as StringFilterState
    expect(strFilter.selectedValues.size).toBe(0)
    expect(strFilter.allValues.length).toBe(51)
  })
})

describe('nodePassesFilter', () => {
  const index = buildNodeValueIndex(sampleGraph)

  it('disabled filter always passes', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: false, min: 100, max: 200, domainMin: 0, domainMax: 200,
    }
    expect(nodePassesFilter('1', filter, index, 'age')).toBe(true)
  })

  it('number filter: in range passes', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: true, min: 30, max: 50, domainMin: 27, domainMax: 45,
    }
    expect(nodePassesFilter('1', filter, index, 'age')).toBe(true) // 34
    expect(nodePassesFilter('2', filter, index, 'age')).toBe(false) // 28
    expect(nodePassesFilter('3', filter, index, 'age')).toBe(true) // 45
    expect(nodePassesFilter('4', filter, index, 'age')).toBe(true) // 31
    expect(nodePassesFilter('5', filter, index, 'age')).toBe(false) // 27
  })

  it('number filter: boundary values included', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: true, min: 28, max: 28, domainMin: 27, domainMax: 45,
    }
    expect(nodePassesFilter('2', filter, index, 'age')).toBe(true) // exactly 28
    expect(nodePassesFilter('1', filter, index, 'age')).toBe(false) // 34
  })

  it('boolean filter: true', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: true, selected: 'true' }
    expect(nodePassesFilter('1', filter, index, 'active')).toBe(true) // Alice: true
    expect(nodePassesFilter('2', filter, index, 'active')).toBe(false) // Bob: false
  })

  it('boolean filter: false', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: true, selected: 'false' }
    expect(nodePassesFilter('1', filter, index, 'active')).toBe(false)
    expect(nodePassesFilter('2', filter, index, 'active')).toBe(true)
  })

  it('boolean filter: either always passes', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: true, selected: 'either' }
    expect(nodePassesFilter('1', filter, index, 'active')).toBe(true)
    expect(nodePassesFilter('2', filter, index, 'active')).toBe(true)
  })

  it('string filter: selected values', () => {
    const filter: StringFilterState = {
      type: 'string', isEnabled: true,
      selectedValues: new Set(['active']),
      allValues: ['active', 'inactive', 'pending'],
    }
    expect(nodePassesFilter('1', filter, index, 'status')).toBe(true) // active
    expect(nodePassesFilter('2', filter, index, 'status')).toBe(false) // pending
    expect(nodePassesFilter('4', filter, index, 'status')).toBe(false) // inactive
  })

  it('string filter: empty selectedValues → all pass', () => {
    const filter: StringFilterState = {
      type: 'string', isEnabled: true,
      selectedValues: new Set(),
      allValues: ['active', 'inactive', 'pending'],
    }
    expect(nodePassesFilter('1', filter, index, 'status')).toBe(true)
    expect(nodePassesFilter('4', filter, index, 'status')).toBe(true)
  })

  it('date filter: after constraint', () => {
    const filter: DateFilterState = {
      type: 'date', isEnabled: true, after: '2022-01-01', before: null,
    }
    expect(nodePassesFilter('2', filter, index, 'joined')).toBe(true) // 2023-11-02
    expect(nodePassesFilter('3', filter, index, 'joined')).toBe(false) // 2019-07-20
    expect(nodePassesFilter('4', filter, index, 'joined')).toBe(true) // 2022-01-10
  })

  it('date filter: before constraint', () => {
    const filter: DateFilterState = {
      type: 'date', isEnabled: true, after: null, before: '2022-01-01',
    }
    expect(nodePassesFilter('1', filter, index, 'joined')).toBe(true) // 2021-03-15
    expect(nodePassesFilter('2', filter, index, 'joined')).toBe(false) // 2023-11-02
  })

  it('date filter: both constraints', () => {
    const filter: DateFilterState = {
      type: 'date', isEnabled: true, after: '2021-01-01', before: '2023-01-01',
    }
    expect(nodePassesFilter('1', filter, index, 'joined')).toBe(true) // 2021-03-15
    expect(nodePassesFilter('2', filter, index, 'joined')).toBe(false) // 2023-11-02
    expect(nodePassesFilter('3', filter, index, 'joined')).toBe(false) // 2019-07-20
    expect(nodePassesFilter('4', filter, index, 'joined')).toBe(true) // 2022-01-10
  })

  it('number filter: node without property fails', () => {
    const graph: GraphData = {
      version: '1',
      nodes: [{ id: '1' }],
      edges: [],
    }
    const idx = buildNodeValueIndex(graph)
    const filter: NumberFilterState = {
      type: 'number', isEnabled: true, min: 0, max: 100, domainMin: 0, domainMax: 100,
    }
    expect(nodePassesFilter('1', filter, idx, 'age')).toBe(false)
  })
})

describe('computeMatchingNodeIds', () => {
  const index = buildNodeValueIndex(sampleGraph)

  it('all disabled filters → all nodes match', () => {
    const filters = initializeFilters(metas, index)
    const matching = computeMatchingNodeIds(sampleGraph, filters, index)
    expect(matching.size).toBe(5)
  })

  it('single number filter narrows results', () => {
    const filters = initializeFilters(metas, index)
    filters.set('age', {
      type: 'number', isEnabled: true, min: 30, max: 50, domainMin: 27, domainMax: 45,
    })
    const matching = computeMatchingNodeIds(sampleGraph, filters, index)
    expect(matching).toEqual(new Set(['1', '3', '4'])) // Alice 34, Carol 45, Dave 31
  })

  it('AND logic: number + boolean', () => {
    const filters = initializeFilters(metas, index)
    filters.set('age', {
      type: 'number', isEnabled: true, min: 30, max: 50, domainMin: 27, domainMax: 45,
    })
    filters.set('active', {
      type: 'boolean', isEnabled: true, selected: 'true',
    })
    const matching = computeMatchingNodeIds(sampleGraph, filters, index)
    // Alice (34, true) and Carol (45, true) — Dave (31, false) excluded
    expect(matching).toEqual(new Set(['1', '3']))
  })

  it('all filters enabled with restrictive values → may yield zero matches', () => {
    const filters = initializeFilters(metas, index)
    filters.set('age', {
      type: 'number', isEnabled: true, min: 100, max: 200, domainMin: 27, domainMax: 45,
    })
    const matching = computeMatchingNodeIds(sampleGraph, filters, index)
    expect(matching.size).toBe(0)
  })
})

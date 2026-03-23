import { describe, expect, it } from 'vitest'
import { filterBooleanLegend, filterStringLegend } from '@/components/ColorTab'
import type { BooleanFilterState, StringFilterState } from '@/types'

const stops = ['#3b82f6', '#f97316']

describe('filterStringLegend', () => {
  const allLabels = ['A', 'B', 'C', 'D']

  it('returns all labels when no filter is provided', () => {
    expect(filterStringLegend(allLabels, undefined)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns all labels when filter is disabled', () => {
    const filter: StringFilterState = {
      type: 'string',
      isEnabled: false,
      selectedValues: new Set(['A']),
      allValues: ['A', 'B', 'C', 'D'],
    }
    expect(filterStringLegend(allLabels, filter)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns all labels when filter is enabled but selectedValues is empty', () => {
    const filter: StringFilterState = {
      type: 'string',
      isEnabled: true,
      selectedValues: new Set(),
      allValues: ['A', 'B', 'C', 'D'],
    }
    expect(filterStringLegend(allLabels, filter)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns only selected values when filter is enabled with selections', () => {
    const filter: StringFilterState = {
      type: 'string',
      isEnabled: true,
      selectedValues: new Set(['A', 'C']),
      allValues: ['A', 'B', 'C', 'D'],
    }
    expect(filterStringLegend(allLabels, filter)).toEqual(['A', 'C'])
  })

  it('returns single value when filter selects one', () => {
    const filter: StringFilterState = {
      type: 'string',
      isEnabled: true,
      selectedValues: new Set(['B']),
      allValues: ['A', 'B', 'C', 'D'],
    }
    expect(filterStringLegend(allLabels, filter)).toEqual(['B'])
  })
})

describe('filterBooleanLegend', () => {
  it('returns both labels when no filter is provided', () => {
    const result = filterBooleanLegend(undefined, stops)
    expect(result.labels).toEqual(['false', 'true'])
    expect(result.colorStops).toEqual([stops[0], stops[1]])
  })

  it('returns both labels when filter is disabled', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: false, selected: true }
    const result = filterBooleanLegend(filter, stops)
    expect(result.labels).toEqual(['false', 'true'])
  })

  it('returns only "true" when filter selects true', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: true, selected: true }
    const result = filterBooleanLegend(filter, stops)
    expect(result.labels).toEqual(['true'])
    expect(result.colorStops).toEqual([stops[1]])
  })

  it('returns only "false" when filter selects false', () => {
    const filter: BooleanFilterState = { type: 'boolean', isEnabled: true, selected: false }
    const result = filterBooleanLegend(filter, stops)
    expect(result.labels).toEqual(['false'])
    expect(result.colorStops).toEqual([stops[0]])
  })
})

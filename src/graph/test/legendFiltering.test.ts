import { describe, expect, it } from 'vitest'
import { filterBooleanLegend, filterContinuousRange, filterStringLegend } from '@/components/ColorTab'
import type { BooleanFilterState, DateFilterState, NumberFilterState, StringArrayFilterState, StringFilterState } from '@/types'

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

  it('filters using string[] filter type', () => {
    const filter: StringArrayFilterState = {
      type: 'string[]',
      isEnabled: true,
      selectedValues: new Set(['A', 'D']),
      allValues: ['A', 'B', 'C', 'D'],
    }
    expect(filterStringLegend(allLabels, filter)).toEqual(['A', 'D'])
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

describe('filterContinuousRange — number', () => {
  const values = [10, 50, 100, 200, 500]

  it('returns data min/max when no filter is provided', () => {
    const result = filterContinuousRange(values, 'number', undefined)
    expect(result.minLabel).toBe('10')
    expect(result.maxLabel).toBe('500')
    expect(result.isUniform).toBe(false)
  })

  it('returns data min/max when filter is disabled', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: false, min: 50, max: 200, domainMin: 10, domainMax: 500,
      scaleMode: 'linear', histogramBuckets: [], logHistogramBuckets: [], quantiles: new Float64Array(0),
    }
    const result = filterContinuousRange(values, 'number', filter)
    expect(result.minLabel).toBe('10')
    expect(result.maxLabel).toBe('500')
  })

  it('clamps to filter range when filter is enabled', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: true, min: 50, max: 200, domainMin: 10, domainMax: 500,
      scaleMode: 'linear', histogramBuckets: [], logHistogramBuckets: [], quantiles: new Float64Array(0),
    }
    const result = filterContinuousRange(values, 'number', filter)
    expect(result.minLabel).toBe('50')
    expect(result.maxLabel).toBe('200')
  })

  it('does not expand beyond data range even if filter is wider', () => {
    const filter: NumberFilterState = {
      type: 'number', isEnabled: true, min: 0, max: 1000, domainMin: 0, domainMax: 1000,
      scaleMode: 'linear', histogramBuckets: [], logHistogramBuckets: [], quantiles: new Float64Array(0),
    }
    const result = filterContinuousRange(values, 'number', filter)
    expect(result.minLabel).toBe('10')
    expect(result.maxLabel).toBe('500')
  })

  it('reports uniform when filter narrows to single value', () => {
    const result = filterContinuousRange([5, 5, 5], 'number', undefined)
    expect(result.isUniform).toBe(true)
  })
})

describe('filterContinuousRange — date', () => {
  const values = ['2020-01-01', '2021-06-15', '2022-12-31']

  it('returns data min/max when no filter is provided', () => {
    const result = filterContinuousRange(values, 'date', undefined)
    expect(result.minLabel).toBe('2020-01-01')
    expect(result.maxLabel).toBe('2022-12-31')
  })

  it('clamps to filter range when filter is enabled', () => {
    const filter: DateFilterState = {
      type: 'date', isEnabled: true,
      after: '2021-01-01', before: '2022-06-01',
      domainMin: '2020-01-01', domainMax: '2022-12-31',
      scaleMode: 'linear', histogramBuckets: [], logHistogramBuckets: [], quantiles: [],
    }
    const result = filterContinuousRange(values, 'date', filter)
    expect(result.minLabel).toBe('2021-01-01')
    expect(result.maxLabel).toBe('2022-06-01')
  })

  it('does not expand beyond data range even if filter is wider', () => {
    const filter: DateFilterState = {
      type: 'date', isEnabled: true,
      after: '2019-01-01', before: '2025-01-01',
      domainMin: '2019-01-01', domainMax: '2025-01-01',
      scaleMode: 'linear', histogramBuckets: [], logHistogramBuckets: [], quantiles: [],
    }
    const result = filterContinuousRange(values, 'date', filter)
    expect(result.minLabel).toBe('2020-01-01')
    expect(result.maxLabel).toBe('2022-12-31')
  })
})

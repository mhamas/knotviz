import { useCallback, useMemo, useState } from 'react'
import type {
  BooleanFilterState,
  DateFilterState,
  FilterMap,
  FilterState,
  NumberFilterState,
  PropertyMeta,
  StringArrayFilterState,
  StringFilterState,
} from '../types'
import { computeHistogram, computeLogHistogram } from '../lib/computeHistogram'

/** Columnar property values indexed by node index. */
export type PropertyColumns = Record<string, (number | string | boolean | string[] | undefined)[]>

export interface FilterStateHandle {
  filters: FilterMap
  resetKey: number
  setNumberFilter: (key: string, min: number, max: number) => void
  setNumberLogScale: (key: string, isLogScale: boolean) => void
  setStringFilter: (key: string, values: Set<string>) => void
  setDateFilter: (key: string, after: string, before: string) => void
  setBooleanFilter: (key: string, selected: BooleanFilterState['selected']) => void
  setFilterEnabled: (key: string, isEnabled: boolean) => void
  setAllFiltersEnabled: (isEnabled: boolean) => void
  clearAllFilters: () => void
  hasActiveFilters: boolean
}

/**
 * Initializes filter state for each detected property using columnar arrays.
 */
function initializeFilters(
  propertyMetas: PropertyMeta[],
  propertyColumns: PropertyColumns,
): FilterMap {
  const filters: FilterMap = new Map()

  for (const meta of propertyMetas) {
    const col = propertyColumns[meta.key]

    if (meta.type === 'number') {
      let domainMin = 0
      let domainMax = 0
      let isFirst = true
      const numericValues: number[] = []
      if (col) {
        for (let i = 0; i < col.length; i++) {
          const v = col[i]
          if (typeof v !== 'number') continue
          numericValues.push(v)
          if (isFirst) { domainMin = v; domainMax = v; isFirst = false }
          else { if (v < domainMin) domainMin = v; if (v > domainMax) domainMax = v }
        }
      }
      const histogramBuckets = computeHistogram(numericValues)
      const logHistogramBuckets = domainMin >= 0 ? computeLogHistogram(numericValues) : []
      filters.set(meta.key, {
        type: 'number',
        isEnabled: false,
        min: domainMin,
        max: domainMax,
        domainMin,
        domainMax,
        isLogScale: false,
        histogramBuckets,
        logHistogramBuckets,
      } satisfies NumberFilterState)
    } else if (meta.type === 'boolean') {
      filters.set(meta.key, {
        type: 'boolean',
        isEnabled: false,
        selected: true,
      } satisfies BooleanFilterState)
    } else if (meta.type === 'string') {
      const distinct = new Set<string>()
      if (col) {
        for (let i = 0; i < col.length; i++) {
          const v = col[i]
          if (typeof v === 'string') distinct.add(v)
        }
      }
      const allValues = Array.from(distinct).sort()
      filters.set(meta.key, {
        type: 'string',
        isEnabled: false,
        selectedValues: new Set<string>(),
        allValues,
      } satisfies StringFilterState)
    } else if (meta.type === 'string[]') {
      const distinct = new Set<string>()
      if (col) {
        for (let i = 0; i < col.length; i++) {
          const v = col[i]
          if (Array.isArray(v)) {
            for (const s of v) {
              if (typeof s === 'string') distinct.add(s)
            }
          }
        }
      }
      const allValues = Array.from(distinct).sort()
      filters.set(meta.key, {
        type: 'string[]',
        isEnabled: false,
        selectedValues: new Set<string>(),
        allValues,
      } satisfies StringArrayFilterState)
    } else if (meta.type === 'date') {
      let domainMin = '1970-01-01'
      let domainMax = '1970-01-01'
      let isFirst = true
      if (col) {
        for (let i = 0; i < col.length; i++) {
          const v = col[i]
          if (typeof v !== 'string') continue
          if (isFirst) { domainMin = v; domainMax = v; isFirst = false }
          else { if (v < domainMin) domainMin = v; if (v > domainMax) domainMax = v }
        }
      }
      filters.set(meta.key, {
        type: 'date',
        isEnabled: false,
        after: domainMin,
        before: domainMax,
        domainMin,
        domainMax,
      } satisfies DateFilterState)
    }
  }

  return filters
}

/**
 * Manages filter state for all properties. Filter matching is computed in a
 * Web Worker (via useCosmos) — this hook only manages the UI state.
 *
 * @param propertyMetas - Detected property types.
 * @param propertyColumns - Columnar property values indexed by node index.
 * @returns Filter state handle with getters, setters, and hasActiveFilters.
 */
export function useFilterState(
  propertyMetas: PropertyMeta[],
  propertyColumns: PropertyColumns,
): FilterStateHandle {
  const [filters, setFilters] = useState<FilterMap>(() =>
    initializeFilters(propertyMetas, propertyColumns),
  )
  const [resetKey, setResetKey] = useState(0)

  const updateFilter = useCallback(
    (key: string, updater: (prev: FilterState) => FilterState): void => {
      setFilters((prev) => {
        const existing = prev.get(key)
        if (!existing) return prev
        const next = new Map(prev)
        next.set(key, updater(existing))
        return next
      })
    },
    [],
  )

  const setNumberFilter = useCallback(
    (key: string, min: number, max: number): void => {
      updateFilter(key, (prev) => ({ ...prev, min, max }) as NumberFilterState)
    },
    [updateFilter],
  )

  const setNumberLogScale = useCallback(
    (key: string, isLogScale: boolean): void => {
      updateFilter(key, (prev) => ({ ...prev, isLogScale }) as NumberFilterState)
    },
    [updateFilter],
  )

  const setStringFilter = useCallback(
    (key: string, values: Set<string>): void => {
      updateFilter(
        key,
        (prev) => ({ ...prev, selectedValues: values }) as StringFilterState,
      )
    },
    [updateFilter],
  )

  const setDateFilter = useCallback(
    (key: string, after: string, before: string): void => {
      updateFilter(
        key,
        (prev) => ({ ...prev, after, before }) as DateFilterState,
      )
    },
    [updateFilter],
  )

  const setBooleanFilter = useCallback(
    (key: string, selected: BooleanFilterState['selected']): void => {
      updateFilter(
        key,
        (prev) => ({ ...prev, selected }) as BooleanFilterState,
      )
    },
    [updateFilter],
  )

  const setFilterEnabled = useCallback(
    (key: string, isEnabled: boolean): void => {
      updateFilter(key, (prev) => ({ ...prev, isEnabled }))
    },
    [updateFilter],
  )

  const setAllFiltersEnabled = useCallback(
    (isEnabled: boolean): void => {
      setFilters((prev) => {
        const next = new Map<string, FilterState>()
        for (const [key, filter] of prev) {
          next.set(key, { ...filter, isEnabled })
        }
        return next
      })
    },
    [],
  )

  const clearAllFilters = useCallback((): void => {
    setFilters(() => initializeFilters(propertyMetas, propertyColumns))
    setResetKey((k) => k + 1)
  }, [propertyMetas, propertyColumns])

  const hasActiveFilters = useMemo(() => {
    for (const f of filters.values()) {
      if (f.isEnabled) return true
    }
    return false
  }, [filters])

  return {
    filters,
    resetKey,
    setNumberFilter,
    setNumberLogScale,
    setStringFilter,
    setDateFilter,
    setBooleanFilter,
    setFilterEnabled,
    setAllFiltersEnabled,
    clearAllFilters,
    hasActiveFilters,
  }
}

// Export pure functions for unit testing
export { initializeFilters }

import { useCallback, useMemo, useState } from 'react'
import type {
  BooleanFilterState,
  DateFilterState,
  FilterMap,
  FilterState,
  GraphData,
  NumberFilterState,
  PropertyMeta,
  PropertyValue,
  StringFilterState,
} from '../types'

export interface FilterStateHandle {
  filters: FilterMap
  resetKey: number
  setNumberFilter: (key: string, min: number, max: number) => void
  setStringFilter: (key: string, values: Set<string>) => void
  setDateFilter: (key: string, after: string, before: string) => void
  setBooleanFilter: (key: string, selected: BooleanFilterState['selected']) => void
  setFilterEnabled: (key: string, isEnabled: boolean) => void
  setAllFiltersEnabled: (isEnabled: boolean) => void
  clearAllFilters: () => void
  matchingNodeIds: Set<string>
  hasActiveFilters: boolean
}

/** propertyKey → Map<nodeId, value> */
type NodeValueIndex = Map<string, Map<string, PropertyValue>>

/**
 * Builds a lookup index of property values per node, keyed by property key.
 * Built once per graph load.
 */
function buildNodeValueIndex(graphData: GraphData): NodeValueIndex {
  const index: NodeValueIndex = new Map()
  for (const node of graphData.nodes) {
    if (!node.properties) continue
    for (const [key, value] of Object.entries(node.properties)) {
      if (!index.has(key)) index.set(key, new Map())
      index.get(key)!.set(node.id, value)
    }
  }
  return index
}

/**
 * Initializes filter state for each detected property.
 */
function initializeFilters(
  propertyMetas: PropertyMeta[],
  nodeValueIndex: NodeValueIndex,
): FilterMap {
  const filters: FilterMap = new Map()

  for (const meta of propertyMetas) {
    const values = nodeValueIndex.get(meta.key)

    if (meta.type === 'number') {
      const nums: number[] = []
      if (values) {
        for (const v of values.values()) {
          if (typeof v === 'number') nums.push(v)
        }
      }
      const domainMin = nums.length > 0 ? Math.min(...nums) : 0
      const domainMax = nums.length > 0 ? Math.max(...nums) : 0
      filters.set(meta.key, {
        type: 'number',
        isEnabled: false,
        min: domainMin,
        max: domainMax,
        domainMin,
        domainMax,
      } satisfies NumberFilterState)
    } else if (meta.type === 'boolean') {
      filters.set(meta.key, {
        type: 'boolean',
        isEnabled: false,
        selected: true,
      } satisfies BooleanFilterState)
    } else if (meta.type === 'string') {
      const distinct = new Set<string>()
      if (values) {
        for (const v of values.values()) {
          if (typeof v === 'string') distinct.add(v)
        }
      }
      const allValues = Array.from(distinct).sort()
      const selectedValues = new Set<string>()
      filters.set(meta.key, {
        type: 'string',
        isEnabled: false,
        selectedValues,
        allValues,
      } satisfies StringFilterState)
    } else if (meta.type === 'date') {
      const dates: string[] = []
      if (values) {
        for (const v of values.values()) {
          if (typeof v === 'string') dates.push(v)
        }
      }
      dates.sort()
      const domainMin = dates.length > 0 ? dates[0] : '1970-01-01'
      const domainMax = dates.length > 0 ? dates[dates.length - 1] : '1970-01-01'
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
 * Evaluates whether a node passes a single filter.
 */
function nodePassesFilter(
  nodeId: string,
  filter: FilterState,
  nodeValueIndex: NodeValueIndex,
  propertyKey: string,
): boolean {
  if (!filter.isEnabled) return true

  const valueMap = nodeValueIndex.get(propertyKey)
  const value = valueMap?.get(nodeId)

  switch (filter.type) {
    case 'number': {
      if (typeof value !== 'number') return false
      return value >= filter.min && value <= filter.max
    }
    case 'boolean': {
      return value === filter.selected
    }
    case 'string': {
      if (filter.selectedValues.size === 0) return true
      if (typeof value !== 'string') return false
      return filter.selectedValues.has(value)
    }
    case 'date': {
      if (typeof value !== 'string') return false
      return value >= filter.after && value <= filter.before
    }
  }
}

/**
 * Computes the set of node IDs that pass all enabled filters.
 */
function computeMatchingNodeIds(
  graphData: GraphData,
  filters: FilterMap,
  nodeValueIndex: NodeValueIndex,
): Set<string> {
  const matching = new Set<string>()
  for (const node of graphData.nodes) {
    let isPass = true
    for (const [key, filter] of filters) {
      if (!nodePassesFilter(node.id, filter, nodeValueIndex, key)) {
        isPass = false
        break
      }
    }
    if (isPass) matching.add(node.id)
  }
  return matching
}

/**
 * Manages filter state for all properties and computes matchingNodeIds
 * synchronously on every change.
 *
 * @param graphData - The loaded graph data.
 * @param propertyMetas - Detected property types.
 * @returns Filter state handle with getters, setters, and matching node IDs.
 */
export function useFilterState(
  graphData: GraphData,
  propertyMetas: PropertyMeta[],
): FilterStateHandle {
  const nodeValueIndex = useMemo(
    () => buildNodeValueIndex(graphData),
    [graphData],
  )

  const [filters, setFilters] = useState<FilterMap>(() =>
    initializeFilters(propertyMetas, nodeValueIndex),
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
    setFilters(() => initializeFilters(propertyMetas, nodeValueIndex))
    setResetKey((k) => k + 1)
  }, [propertyMetas, nodeValueIndex])

  const matchingNodeIds = useMemo(
    () => computeMatchingNodeIds(graphData, filters, nodeValueIndex),
    [graphData, filters, nodeValueIndex],
  )

  const hasActiveFilters = useMemo(
    () => Array.from(filters.values()).some((f) => f.isEnabled),
    [filters],
  )

  return {
    filters,
    resetKey,
    setNumberFilter,
    setStringFilter,
    setDateFilter,
    setBooleanFilter,
    setFilterEnabled,
    setAllFiltersEnabled,
    clearAllFilters,
    matchingNodeIds,
    hasActiveFilters,
  }
}

// Export pure functions for unit testing
export { buildNodeValueIndex, initializeFilters, nodePassesFilter, computeMatchingNodeIds }

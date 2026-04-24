import type { NodePropertiesMetadata, PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { PropertyFilterPanel } from './filters/PropertyFilterPanel'
import { formatNumber } from '../lib/formatNumber'

interface Props {
  propertyMetas: PropertyMeta[]
  nodePropertiesMetadata: NodePropertiesMetadata | undefined
  filterHandle: FilterStateHandle
  matchingCount: number
  totalNodeCount: number
}

/**
 * Filters tab content: match count, AND logic note, clear-all button,
 * zero-match banner, and scrollable list of property filter panels.
 *
 * @param props - Property metadata and filter state handle.
 * @returns Filters tab element.
 */
export function FiltersTab({ propertyMetas, nodePropertiesMetadata, filterHandle, matchingCount, totalNodeCount }: Props): React.JSX.Element {
  const {
    filters,
    resetKey,
    setNumberFilter,
    setNumberScaleMode,
    setStringFilter,
    setDateFilter,
    setDateScaleMode,
    setBooleanFilter,
    setFilterEnabled,
    setAllFiltersEnabled,
    clearAllFilters,
    hasActiveFilters,
  } = filterHandle

  const matchCount = matchingCount
  const sortedMetas = [...propertyMetas].sort((a, b) => a.key.localeCompare(b.key))

  if (propertyMetas.length === 0) {
    return <p className="text-xs italic text-slate-400">No properties.</p>
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-slate-700" aria-live="polite" data-testid="filter-match-count">
          {formatNumber(matchCount)}/{formatNumber(totalNodeCount)} nodes match
          {matchCount === 0 && hasActiveFilters && (
            <span className="ml-1.5 font-normal text-amber-600">— no match</span>
          )}
        </p>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            data-testid="filter-toggle-all"
            onClick={(): void => setAllFiltersEnabled(!hasActiveFilters)}
            className="text-[11px] text-slate-400 hover:text-slate-600"
          >
            {hasActiveFilters ? 'Unselect all' : 'Select all'}
          </button>
          <button
            type="button"
            data-testid="filter-clear-all"
            onClick={clearAllFilters}
            className="text-[11px] text-slate-400 hover:text-slate-600"
          >
            Reset all
          </button>
        </div>
      </div>

      {/* Filter panels */}
      <div className="mt-2">
        {sortedMetas.map((meta) => {
          const filterState = filters.get(meta.key)
          if (!filterState) return null
          return (
            <PropertyFilterPanel
              key={`${meta.key}-${resetKey}`}
              meta={meta}
              description={nodePropertiesMetadata?.[meta.key]?.description}
              filterState={filterState}
              onEnabledChange={(isEnabled): void => setFilterEnabled(meta.key, isEnabled)}
              onNumberChange={
                filterState.type === 'number'
                  ? (min, max): void => setNumberFilter(meta.key, min, max)
                  : undefined
              }
              onScaleModeChange={
                filterState.type === 'number'
                  ? (mode): void => setNumberScaleMode(meta.key, mode)
                  : filterState.type === 'date'
                    ? (mode): void => setDateScaleMode(meta.key, mode)
                    : undefined
              }
              onBooleanChange={
                filterState.type === 'boolean'
                  ? (selected): void => setBooleanFilter(meta.key, selected)
                  : undefined
              }
              onStringChange={
                filterState.type === 'string' || filterState.type === 'string[]'
                  ? (values): void => setStringFilter(meta.key, values)
                  : undefined
              }
              onDateChange={
                filterState.type === 'date'
                  ? (after, before): void => setDateFilter(meta.key, after, before)
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}

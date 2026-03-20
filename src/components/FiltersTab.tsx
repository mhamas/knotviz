import type { PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { PropertyFilterPanel } from './filters/PropertyFilterPanel'

interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle
}

/**
 * Filters tab content: match count, AND logic note, clear-all button,
 * zero-match banner, and scrollable list of property filter panels.
 *
 * @param props - Property metadata and filter state handle.
 * @returns Filters tab element.
 */
export function FiltersTab({ propertyMetas, filterHandle }: Props): React.JSX.Element {
  const {
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
  } = filterHandle

  const matchCount = matchingNodeIds.size
  const sortedMetas = [...propertyMetas].sort((a, b) => a.key.localeCompare(b.key))

  if (propertyMetas.length === 0) {
    return <p className="text-xs italic text-slate-400 p-2">No properties.</p>
  }

  return (
    <div className="flex h-full flex-col">
      {/* Pinned header */}
      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-700" aria-live="polite" data-testid="filter-match-count">
          {matchCount.toLocaleString()} {matchCount === 1 ? 'node matches' : 'nodes match'}
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

      {/* Scrollable filter panels */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {sortedMetas.map((meta) => {
          const filterState = filters.get(meta.key)
          if (!filterState) return null
          return (
            <PropertyFilterPanel
              key={`${meta.key}-${resetKey}`}
              meta={meta}
              filterState={filterState}
              onEnabledChange={(isEnabled): void => setFilterEnabled(meta.key, isEnabled)}
              onNumberChange={
                filterState.type === 'number'
                  ? (min, max): void => setNumberFilter(meta.key, min, max)
                  : undefined
              }
              onBooleanChange={
                filterState.type === 'boolean'
                  ? (selected): void => setBooleanFilter(meta.key, selected)
                  : undefined
              }
              onStringChange={
                filterState.type === 'string'
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

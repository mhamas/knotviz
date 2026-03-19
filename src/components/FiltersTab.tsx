import type { PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { PropertyFilterPanel } from './filters/PropertyFilterPanel'
import { SidebarButton } from '@/components/sidebar'

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
    setNumberFilter,
    setBooleanFilter,
    setFilterEnabled,
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
      <div className="shrink-0 space-y-1.5 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-700" aria-live="polite" data-testid="filter-match-count">
          {matchCount.toLocaleString()} {matchCount === 1 ? 'node matches' : 'nodes match'}
        </p>
        <p className="text-[12px] italic text-slate-400">
          Filters combine with AND — nodes must match all enabled filters.
        </p>
        {hasActiveFilters && (
          <SidebarButton onClick={clearAllFilters}>
            Clear all filters
          </SidebarButton>
        )}
        {matchCount === 0 && hasActiveFilters && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>No nodes match the current filters.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-1 text-xs underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable filter panels */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {sortedMetas.map((meta) => {
          const filterState = filters.get(meta.key)
          if (!filterState) return null
          return (
            <PropertyFilterPanel
              key={meta.key}
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
            />
          )
        })}
      </div>
    </div>
  )
}

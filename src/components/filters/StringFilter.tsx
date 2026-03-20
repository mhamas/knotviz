import { useState, useMemo } from 'react'
import type { StringFilterState } from '../../types'
import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  state: StringFilterState
  onChange: (selectedValues: Set<string>) => void
}

/**
 * Checkbox list for filtering nodes by a string property.
 * Shows all distinct values with select/deselect all controls.
 * When >50 values exist, includes a search input for filtering the list.
 *
 * @param props - Current filter state and change handler.
 * @returns String filter checkbox list element.
 */
export function StringFilter({ state, onChange }: Props): React.JSX.Element {
  const [search, setSearch] = useState('')
  const isAllSelected = state.selectedValues.size === state.allValues.length
  const hasSearch = state.allValues.length > 10

  const visibleValues = useMemo(() => {
    if (!search) return state.allValues
    const lower = search.toLowerCase()
    return state.allValues.filter((v) => v.toLowerCase().includes(lower))
  }, [state.allValues, search])

  const handleToggle = (value: string, isChecked: boolean): void => {
    const next = new Set(state.selectedValues)
    if (isChecked) {
      next.add(value)
    } else {
      next.delete(value)
    }
    onChange(next)
  }

  const handleSelectAll = (): void => {
    onChange(new Set(state.allValues))
  }

  const handleDeselectAll = (): void => {
    onChange(new Set<string>())
  }

  return (
    <div className="space-y-1.5" data-testid="string-filter">
      {/* Select/deselect all controls */}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="string-filter-select-all"
          onClick={handleSelectAll}
          className="text-[11px] text-slate-400 hover:text-slate-600"
          disabled={isAllSelected}
        >
          All
        </button>
        <button
          type="button"
          data-testid="string-filter-deselect-all"
          onClick={handleDeselectAll}
          className="text-[11px] text-slate-400 hover:text-slate-600"
          disabled={state.selectedValues.size === 0}
        >
          None
        </button>
        <span className="text-[11px] text-slate-400">
          {state.selectedValues.size}/{state.allValues.length}
        </span>
      </div>

      {/* Search input for large lists */}
      {hasSearch && (
        <input
          type="text"
          data-testid="string-filter-search"
          value={search}
          onChange={(e): void => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-slate-400"
        />
      )}

      {/* Value list */}
      <div className="max-h-32 space-y-0.5 overflow-y-auto" data-testid="string-filter-list">
        {visibleValues.map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-1.5 py-0.5">
            <Checkbox
              className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
              checked={state.selectedValues.has(value)}
              onCheckedChange={(v): void => handleToggle(value, v === true)}
            />
            <span className="min-w-0 truncate text-[11px] text-slate-600" title={value}>
              {value || <em className="text-slate-400">empty</em>}
            </span>
          </label>
        ))}
        {visibleValues.length === 0 && search && (
          <p className="text-[11px] italic text-slate-400">No matches</p>
        )}
      </div>
    </div>
  )
}

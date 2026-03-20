import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type { StringFilterState } from '../../types'

interface Props {
  state: StringFilterState
  onChange: (selectedValues: Set<string>) => void
}

const MAX_VISIBLE_CHIPS = 10

/**
 * Chip-based string filter with prefix search and dropdown selection.
 * Shows a search input with chips for selected values, a dropdown of
 * matching unselected values (up to 10), and All/None bulk actions.
 *
 * @param props - Current filter state and change handler.
 * @returns String filter element.
 */
export function StringFilter({ state, onChange }: Props): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [isForceClosed, setIsForceClosed] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isAllSelected = state.selectedValues.size === state.allValues.length

  // Dropdown candidates: prefix match (or all unselected on empty search), exclude selected, limit 10
  const candidates = useMemo(() => {
    const lower = search.toLowerCase()
    const results: string[] = []
    for (const v of state.allValues) {
      if (state.selectedValues.has(v)) continue
      if (!search || v.toLowerCase().startsWith(lower)) {
        results.push(v)
        if (results.length >= 10) break
      }
    }
    return results
  }, [state.allValues, state.selectedValues, search])

  // Chips to display: last N with overflow indicator
  const selectedArray = useMemo(() => {
    const arr: string[] = []
    for (const v of state.selectedValues) arr.push(v)
    return arr
  }, [state.selectedValues])

  const overflowCount = Math.max(0, selectedArray.length - MAX_VISIBLE_CHIPS)
  const visibleChips = overflowCount > 0
    ? selectedArray.slice(selectedArray.length - MAX_VISIBLE_CHIPS)
    : selectedArray

  const [isFocused, setIsFocused] = useState(false)

  // Dropdown is open when focused (or has search text), candidates exist, and not force-closed
  const isOpen = (isFocused || search.length > 0) && candidates.length > 0 && !isForceClosed

  const handleSelect = useCallback((value: string): void => {
    const next = new Set(state.selectedValues)
    next.add(value)
    onChange(next)
    setSearch('')
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }, [state.selectedValues, onChange])

  const handleRemove = useCallback((value: string): void => {
    const next = new Set(state.selectedValues)
    next.delete(value)
    onChange(next)
  }, [state.selectedValues, onChange])

  const handleSelectAll = (): void => {
    onChange(new Set(state.allValues))
  }

  const handleDeselectAll = (): void => {
    onChange(new Set<string>())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    // Backspace on empty input removes last chip (regardless of dropdown state)
    if (e.key === 'Backspace' && !search && selectedArray.length > 0) {
      handleRemove(selectedArray[selectedArray.length - 1])
      return
    }

    if (!isOpen || candidates.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < candidates.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : candidates.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < candidates.length) {
        handleSelect(candidates[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      setIsForceClosed(true)
      setHighlightIndex(-1)
    }
  }

  // Reset force-closed when search text changes
  const handleSearchChange = (value: string): void => {
    setSearch(value)
    setIsForceClosed(false)
    setHighlightIndex(-1)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsForceClosed(true)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return (): void => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-1.5" data-testid="string-filter" ref={containerRef}>
      {/* All / None controls + count */}
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
        <span className="text-[11px] text-slate-400" data-testid="string-filter-count">
          {state.selectedValues.size === 0
            ? `showing all ${state.allValues.length}`
            : `${state.selectedValues.size}/${state.allValues.length}`}
        </span>
      </div>

      {/* Chip input area */}
      <div className="relative">
        <div
          className="flex min-h-[28px] flex-wrap items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-1 focus-within:border-slate-400"
          onClick={(): void => inputRef.current?.focus()}
        >
          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <span
              className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
              data-testid="string-filter-overflow"
            >
              +{overflowCount} more
            </span>
          )}

          {/* Visible chips — entire chip is clickable to remove */}
          {visibleChips.map((value) => (
            <button
              key={value}
              type="button"
              onClick={(e): void => {
                e.stopPropagation()
                handleRemove(value)
              }}
              className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200"
              title={`Remove ${value}`}
              data-testid="string-filter-chip"
            >
              <span className="max-w-[60px] truncate">{value}</span>
              <span className="ml-0.5 text-slate-400">×</span>
            </button>
          ))}

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            data-testid="string-filter-search"
            value={search}
            onChange={(e): void => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(): void => {
              setIsFocused(true)
              setIsForceClosed(false)
            }}
            onBlur={(): void => setIsFocused(false)}
            placeholder={selectedArray.length === 0 ? 'Search…' : ''}
            className="min-w-[40px] flex-1 border-none bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>

        {/* Dropdown */}
        {isOpen && candidates.length > 0 && (
          <div
            className="absolute z-10 mt-0.5 max-h-[200px] w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-sm"
            data-testid="string-filter-dropdown"
            role="listbox"
          >
            {candidates.map((value, i) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={i === highlightIndex}
                data-testid="string-filter-option"
                className={`w-full px-2 py-1 text-left text-[11px] ${
                  i === highlightIndex
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                onMouseDown={(e): void => {
                  e.preventDefault()
                  handleSelect(value)
                }}
                onMouseEnter={(): void => setHighlightIndex(i)}
              >
                {value}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

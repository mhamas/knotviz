import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  /** Seed value for the input (e.g. the current store value on mount). */
  initialValue?: string
  /** Called on every keystroke with the new value. Parent is expected to debounce. */
  onChange: (value: string) => void
  /**
   * Number of nodes matching the committed query, or `null` when no search
   * is active. 0 renders as "No matches"; positive values render with
   * singular/plural word. Suppressed entirely when `disabled` is true.
   */
  matchCount: number | null
  /**
   * First few highlighted nodes surfaced by the worker, used to render a
   * dropdown of candidates. Empty array (or missing) means no dropdown.
   */
  matches?: Array<{ id: string; label: string }>
  /** When true, the input is read-only and no clear button / dropdown is shown. */
  disabled?: boolean
}

/**
 * Substring-search input that highlights matching nodes in the graph.
 * Fully controlled by its own local state so keystrokes feel instant;
 * `onChange` fires every keystroke and the parent debounces before
 * committing to the store. When `matches` is non-empty and the input has
 * focus, a dropdown of candidates is shown; arrow keys navigate, Enter
 * picks the highlighted option, Escape closes.
 *
 * @param props - Search input state, match data, and handlers.
 * @returns Search box element.
 */
export function SearchBox({ initialValue = '', onChange, matchCount, matches = [], disabled = false }: Props): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)
  const [isForceClosed, setIsForceClosed] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (next: string): void => {
    setValue(next)
    setIsForceClosed(false)
    setHighlightIndex(-1)
    onChange(next)
  }

  const pick = (match: { id: string; label: string }): void => {
    const next = match.label || match.id
    setValue(next)
    setIsForceClosed(true)
    setHighlightIndex(-1)
    onChange(next)
    inputRef.current?.focus()
  }

  // Close the dropdown when the click lands outside the component.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsForceClosed(true)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return (): void => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isQueryActive = !disabled && matchCount !== null
  const countLabel = matchCount === 0
    ? 'No matches'
    : matchCount === 1
      ? '1 match'
      : `${matchCount?.toLocaleString()} matches`

  const isDropdownOpen = !disabled && isFocused && !isForceClosed && value.length > 0 && matches.length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!isDropdownOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < matches.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : matches.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < matches.length) {
        e.preventDefault()
        pick(matches[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      setIsForceClosed(true)
      setHighlightIndex(-1)
    }
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          data-testid="search-box-input"
          value={value}
          onChange={(e): void => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(): void => {
            setIsFocused(true)
            setIsForceClosed(false)
          }}
          onBlur={(): void => setIsFocused(false)}
          disabled={disabled}
          placeholder="Search label or ID…"
          className="w-full rounded border border-slate-300 bg-white py-1 pl-6 pr-6 text-xs text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {!disabled && value.length > 0 && (
          <button
            type="button"
            data-testid="search-box-clear"
            onClick={(): void => handleChange('')}
            className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {isDropdownOpen && (
          <div
            data-testid="search-box-dropdown"
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[220px] overflow-y-auto rounded border border-slate-200 bg-white shadow-md"
          >
            {matches.map((m, i) => {
              const display = m.label || m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={i === highlightIndex}
                  data-testid="search-box-option"
                  title={display}
                  onMouseDown={(e): void => {
                    // Prevent the input from losing focus (which would close
                    // the dropdown) before the click fires.
                    e.preventDefault()
                    pick(m)
                  }}
                  onMouseEnter={(): void => setHighlightIndex(i)}
                  className={`block w-full truncate px-2 py-1 text-left text-[11px] ${
                    i === highlightIndex
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {display}
                </button>
              )
            })}
            {matchCount !== null && matchCount > matches.length && (
              <p
                data-testid="search-box-dropdown-footer"
                className="border-t border-slate-100 px-2 py-1 text-[10px] text-slate-400"
              >
                Showing {matches.length} of {matchCount.toLocaleString()} matches
              </p>
            )}
          </div>
        )}
      </div>
      {isQueryActive && (
        <p
          data-testid="search-box-count"
          className={`text-[11px] ${matchCount === 0 ? 'text-amber-600' : 'text-slate-500'}`}
        >
          {countLabel}
        </p>
      )}
    </div>
  )
}

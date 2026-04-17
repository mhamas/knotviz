import { useState } from 'react'
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
  /** When true, the input is read-only and no clear button / match count is shown. */
  disabled?: boolean
}

/**
 * Substring-search input that highlights matching nodes in the graph.
 * Fully controlled by its own local state so keystrokes feel instant;
 * `onChange` fires every keystroke and the parent debounces before
 * committing to the store.
 *
 * @param props - Search input state and handlers.
 * @returns Search box element.
 */
export function SearchBox({ initialValue = '', onChange, matchCount, disabled = false }: Props): React.JSX.Element {
  const [value, setValue] = useState(initialValue)

  const handleChange = (next: string): void => {
    setValue(next)
    onChange(next)
  }

  const isQueryActive = !disabled && matchCount !== null
  const countLabel = matchCount === 0
    ? 'No matches'
    : matchCount === 1
      ? '1 match'
      : `${matchCount?.toLocaleString()} matches`

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          data-testid="search-box-input"
          value={value}
          onChange={(e): void => handleChange(e.target.value)}
          disabled={disabled}
          placeholder="Search label or ID…"
          className="w-full rounded border border-slate-200 bg-white py-1 pl-6 pr-6 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
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

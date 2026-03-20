import { useState } from 'react'
import type { DateFilterState } from '../../types'
import { useDebounce } from '@/hooks/useDebounce'
import { Slider } from '@/components/ui/slider'

interface Props {
  state: DateFilterState
  onChange: (after: string, before: string) => void
}

/** Converts an ISO date string (YYYY-MM-DD) to days since epoch. */
function dateToDays(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 86_400_000)
}

/** Converts days since epoch back to an ISO date string (YYYY-MM-DD). */
function daysToDate(days: number): string {
  return new Date(days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Dual-handle range slider for filtering nodes by a date property.
 * Dates are mapped to integer day offsets for the slider, then
 * converted back to ISO strings on change. Debounces by 150ms.
 *
 * @param props - Current filter state and change handler.
 * @returns Date filter slider element.
 */
export function DateFilter({ state, onChange }: Props): React.JSX.Element {
  const domainMinDays = dateToDays(state.domainMin)
  const domainMaxDays = dateToDays(state.domainMax)

  const [localRange, setLocalRange] = useState<[number, number]>([
    dateToDays(state.after),
    dateToDays(state.before),
  ])
  const debouncedOnChange = useDebounce(onChange, 150)

  const handleChange = (value: number | readonly number[]): void => {
    const arr = Array.isArray(value) ? value : [value]
    const newRange: [number, number] = [arr[0], arr[1] ?? arr[0]]
    setLocalRange(newRange)
    debouncedOnChange(daysToDate(newRange[0]), daysToDate(newRange[1]))
  }

  return (
    <div className="space-y-1.5" data-testid="date-filter">
      <Slider
        min={domainMinDays}
        max={domainMaxDays}
        step={1}
        value={localRange}
        onValueChange={handleChange}
      />
      <div className="flex justify-between text-[11px] text-slate-500">
        <span data-testid="date-filter-min">{daysToDate(localRange[0])}</span>
        <span data-testid="date-filter-max">{daysToDate(localRange[1])}</span>
      </div>
    </div>
  )
}

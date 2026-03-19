import { useState } from 'react'
import type { NumberFilterState } from '../../types'
import { useDebounce } from '@/hooks/useDebounce'
import { Slider } from '@/components/ui/slider'

interface Props {
  state: NumberFilterState
  onChange: (min: number, max: number) => void
}

/**
 * Formats a number for display in the range label.
 * Uses toFixed(2) for values >= 0.01, toPrecision(3) for smaller values.
 */
function formatValue(v: number): string {
  if (v === 0) return '0'
  if (Math.abs(v) >= 0.01) return v.toFixed(2)
  return v.toPrecision(3)
}

/**
 * Dual-handle range slider for filtering nodes by a numeric property.
 * Debounces changes by 150ms before applying to filter state.
 *
 * @param props - Current filter state and change handler.
 * @returns Number filter slider element.
 */
export function NumberFilter({ state, onChange }: Props): React.JSX.Element {
  const [localRange, setLocalRange] = useState<[number, number]>([state.min, state.max])
  const debouncedOnChange = useDebounce(onChange, 150)

  const handleChange = (value: number | readonly number[]): void => {
    const arr = Array.isArray(value) ? value : [value]
    const newRange: [number, number] = [arr[0], arr[1] ?? arr[0]]
    setLocalRange(newRange)
    debouncedOnChange(newRange[0], newRange[1])
  }

  return (
    <div className="space-y-1.5" data-testid="number-filter">
      <Slider
        min={state.domainMin}
        max={state.domainMax}
        step={(state.domainMax - state.domainMin) / 200 || 0.01}
        value={localRange}
        onValueChange={handleChange}
      />
      <div className="flex justify-between text-[11px] text-slate-500">
        <span data-testid="number-filter-min">{formatValue(localRange[0])}</span>
        <span data-testid="number-filter-max">{formatValue(localRange[1])}</span>
      </div>
    </div>
  )
}

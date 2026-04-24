import { useState } from 'react'
import type { DateFilterState } from '../../types'
import { useDebounce } from '@/hooks/useDebounce'
import { Slider } from '@/components/ui/slider'
import { Histogram } from '@/components/Histogram'

interface Props {
  state: DateFilterState
  onChange: (after: string, before: string) => void
  isHistogramVisible: boolean
}

/** Converts an ISO date string (YYYY-MM-DD) to days since epoch. */
function dateToDays(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 86_400_000)
}

/** Converts days since epoch back to an ISO date string (YYYY-MM-DD). */
function daysToDate(days: number): string {
  return new Date(Math.round(days) * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Dual-handle range slider for filtering nodes by a date property.
 * Dates are mapped to integer day offsets for the slider, then
 * converted back to ISO strings on change. Supports optional log
 * scale and an inline histogram. Debounces by 150 ms.
 *
 * Log scale for dates is *inverted* relative to numeric log scale:
 * instead of spreading out low values, it spreads out **recent** dates.
 * Typical date properties (signups, events, commits) cluster toward
 * "now", so users want fine-grained control at the right end of the
 * slider. Formula: map each date to days-since-domain-max, take log,
 * then flip. Near the right end of the slider, one step ≈ one day;
 * near the left end, one step ≈ many months.
 *
 * @param props - Current filter state, change handler, and histogram visibility.
 * @returns Date filter slider element.
 */
export function DateFilter({ state, onChange, isHistogramVisible }: Props): React.JSX.Element {
  const domainMinDays = dateToDays(state.domainMin)
  const domainMaxDays = dateToDays(state.domainMax)
  const { isLogScale } = state

  const [localRange, setLocalRange] = useState<[number, number]>([
    dateToDays(state.after),
    dateToDays(state.before),
  ])
  const debouncedOnChange = useDebounce(onChange, 150)

  // Inverted log: map days-since-max to log space, then subtract from
  // logMax so position 0 = domainMin and position logMax = domainMax.
  // logMax is the total log-space width; single-day datasets collapse
  // to 0 and we fall back to a nonzero slider step below.
  const domainSpanDays = domainMaxDays - domainMinDays
  const logMax = isLogScale ? Math.log10(domainSpanDays + 1) : 0
  const toLog = (daysAbs: number): number =>
    logMax - Math.log10(domainMaxDays - daysAbs + 1)
  const fromLog = (s: number): number =>
    domainMaxDays - Math.pow(10, logMax - s) + 1

  const sliderMin = isLogScale ? 0 : domainMinDays
  const sliderMax = isLogScale ? logMax : domainMaxDays
  const sliderStep = isLogScale ? (sliderMax - sliderMin) / 200 || 0.01 : 1
  const sliderValue: [number, number] = isLogScale
    ? [toLog(localRange[0]), toLog(localRange[1])]
    : localRange

  const handleChange = (value: number | readonly number[]): void => {
    const arr = Array.isArray(value) ? value : [value]
    let newMin = arr[0]
    let newMax = arr[1] ?? arr[0]
    if (isLogScale) {
      newMin = fromLog(newMin)
      newMax = fromLog(newMax)
    }
    const newRange: [number, number] = [newMin, newMax]
    setLocalRange(newRange)
    debouncedOnChange(daysToDate(newRange[0]), daysToDate(newRange[1]))
  }

  const histogramBuckets = isLogScale ? state.logHistogramBuckets : state.histogramBuckets

  return (
    <div className="space-y-1.5" data-testid="date-filter">
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onValueChange={handleChange}
      />
      <div className="flex justify-between text-[11px] text-slate-500">
        <span data-testid="date-filter-min">{daysToDate(localRange[0])}</span>
        <span data-testid="date-filter-max">{daysToDate(localRange[1])}</span>
      </div>
      {isHistogramVisible && histogramBuckets.length > 0 && (
        <div data-testid="date-filter-histogram">
          <Histogram buckets={histogramBuckets} />
        </div>
      )}
    </div>
  )
}

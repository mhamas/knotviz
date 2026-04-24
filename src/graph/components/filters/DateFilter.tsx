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
 * Convert a date to its x-position (0–100) on the date histogram. Mirrors
 * the numeric helper in NumberFilter — finds the bucket, then interpolates
 * linearly in epoch-ms space within that bucket.
 */
function dateToHistogramPercent(iso: string, buckets: { from: string; to: string }[]): number {
  if (buckets.length === 0) return 0
  const target = new Date(iso).getTime()
  const firstFrom = new Date(buckets[0].from).getTime()
  const lastTo = new Date(buckets[buckets.length - 1].to).getTime()
  if (target <= firstFrom) return 0
  if (target >= lastTo) return 100
  for (let i = 0; i < buckets.length; i++) {
    const bFrom = new Date(buckets[i].from).getTime()
    const bTo = new Date(buckets[i].to).getTime()
    if (target >= bFrom && target < bTo) {
      const span = bTo - bFrom
      const inBucket = span === 0 ? 0 : (target - bFrom) / span
      return ((i + inBucket) / buckets.length) * 100
    }
  }
  return 100
}

/**
 * Inverse percentile lookup for dates. Given an ISO date and the
 * precomputed quantiles array (101 ISO strings), return the interpolated
 * percentile position (0–100). Clamps out-of-range dates to the endpoints.
 */
function dateToPercentile(iso: string, quantiles: string[]): number {
  if (quantiles.length === 0) return 0
  const target = new Date(iso).getTime()
  const first = new Date(quantiles[0]).getTime()
  const last = new Date(quantiles[100]).getTime()
  if (target <= first) return 0
  if (target >= last) return 100
  let lo = 0
  let hi = 100
  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1
    if (new Date(quantiles[mid]).getTime() <= target) lo = mid
    else hi = mid
  }
  const a = new Date(quantiles[lo]).getTime()
  const b = new Date(quantiles[hi]).getTime()
  if (a === b) return lo
  return lo + (target - a) / (b - a)
}

/**
 * Dual-handle range slider for filtering nodes by a date property.
 * Dates are mapped to integer day offsets for the slider, then
 * converted back to ISO strings on change. Supports three scale modes:
 * - `linear`     — slider step = 1 day.
 * - `log`        — inverted vs numeric log: gives *recent* dates more
 *                  resolution, matching typical clustering-toward-now shapes.
 * - `percentile` — slider in [0, 100]; a drag to [10, 90] keeps nodes
 *                  whose dates fall between p10 and p90 of the dataset.
 *
 * In pct mode, a small `p{N}` tag above each label shows the percentile
 * the handle is currently at.
 *
 * @param props - Current filter state, change handler, and histogram visibility.
 * @returns Date filter slider element.
 */
export function DateFilter({ state, onChange, isHistogramVisible }: Props): React.JSX.Element {
  const domainMinDays = dateToDays(state.domainMin)
  const domainMaxDays = dateToDays(state.domainMax)
  const { scaleMode, quantiles } = state
  const isLogScale = scaleMode === 'log'
  const isPercentileScale = scaleMode === 'percentile'

  const [localRange, setLocalRange] = useState<[number, number]>([
    dateToDays(state.after),
    dateToDays(state.before),
  ])
  // Separate local state for the pct-mode slider position. See the
  // equivalent comment in NumberFilter — tied quantiles (e.g. many dates
  // on the same day) would otherwise collapse the handle back to p0.
  const [localPct, setLocalPct] = useState<[number, number]>(() => {
    if (state.scaleMode !== 'percentile' || state.quantiles.length === 0) {
      return [0, 100]
    }
    return [
      dateToPercentile(state.after, state.quantiles),
      dateToPercentile(state.before, state.quantiles),
    ]
  })
  const debouncedOnChange = useDebounce(onChange, 150)

  // Resync the pct handles whenever we *enter* pct mode from another
  // scale. Uses React's "adjust state during render" pattern (same
  // effect as useEffect but without the cascading render penalty).
  const [cachedScaleMode, setCachedScaleMode] = useState<typeof scaleMode>(scaleMode)
  if (cachedScaleMode !== scaleMode) {
    setCachedScaleMode(scaleMode)
    if (scaleMode === 'percentile' && quantiles.length > 0) {
      setLocalPct([
        dateToPercentile(daysToDate(localRange[0]), quantiles),
        dateToPercentile(daysToDate(localRange[1]), quantiles),
      ])
    }
  }

  // Inverted log transform: day at position 0 is domainMin, position
  // logMax is domainMax. One slider step ≈ 1 day at the recent end.
  const domainSpanDays = domainMaxDays - domainMinDays
  const logMax = isLogScale ? Math.log10(domainSpanDays + 1) : 0
  const toLog = (daysAbs: number): number =>
    logMax - Math.log10(domainMaxDays - daysAbs + 1)
  const fromLog = (s: number): number =>
    domainMaxDays - Math.pow(10, logMax - s) + 1

  let sliderMin: number
  let sliderMax: number
  let sliderStep: number
  let sliderValue: [number, number]

  if (isPercentileScale) {
    sliderMin = 0
    sliderMax = 100
    sliderStep = 1
    sliderValue = localPct
  } else if (isLogScale) {
    sliderMin = 0
    sliderMax = logMax
    sliderStep = (sliderMax - sliderMin) / 200 || 0.01
    sliderValue = [toLog(localRange[0]), toLog(localRange[1])]
  } else {
    sliderMin = domainMinDays
    sliderMax = domainMaxDays
    sliderStep = 1
    sliderValue = localRange
  }

  const handleChange = (value: number | readonly number[]): void => {
    const arr = Array.isArray(value) ? value : [value]
    let newMin = arr[0]
    let newMax = arr[1] ?? arr[0]
    if (isPercentileScale) {
      const pLo = Math.round(Math.min(Math.max(newMin, 0), 100))
      const pHi = Math.round(Math.min(Math.max(newMax, 0), 100))
      setLocalPct([pLo, pHi])
      const loIso = quantiles.length > 0 ? quantiles[pLo] : state.domainMin
      const hiIso = quantiles.length > 0 ? quantiles[pHi] : state.domainMax
      const newRange: [number, number] = [dateToDays(loIso), dateToDays(hiIso)]
      setLocalRange(newRange)
      debouncedOnChange(loIso, hiIso)
      return
    }
    if (isLogScale) {
      newMin = fromLog(newMin)
      newMax = fromLog(newMax)
    }
    const newRange: [number, number] = [newMin, newMax]
    setLocalRange(newRange)
    debouncedOnChange(daysToDate(newRange[0]), daysToDate(newRange[1]))
  }

  const histogramBuckets = isLogScale ? state.logHistogramBuckets : state.histogramBuckets

  // Round for display: on scale-mode transitions, `localPct` is a float
  // (valueToPercentile interpolates) but the slider step is 1, so a
  // whole-number tag keeps the label consistent with the visible track.
  const pctTagLow = isPercentileScale && quantiles.length > 0 ? `p${Math.round(localPct[0])}` : null
  const pctTagHigh = isPercentileScale && quantiles.length > 0 ? `p${Math.round(localPct[1])}` : null

  return (
    <div className="space-y-1.5" data-testid="date-filter">
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onValueChange={handleChange}
      />
      {isPercentileScale && (
        <div className="flex justify-between text-[10px] font-medium text-slate-500" data-testid="date-filter-pct-tags">
          <span data-testid="date-filter-pct-tag-min">{pctTagLow}</span>
          <span data-testid="date-filter-pct-tag-max">{pctTagHigh}</span>
        </div>
      )}
      <div className="flex justify-between text-[11px] text-slate-500">
        <span data-testid="date-filter-min">{daysToDate(localRange[0])}</span>
        <span data-testid="date-filter-max">{daysToDate(localRange[1])}</span>
      </div>
      {isHistogramVisible && histogramBuckets.length > 0 && (
        <div data-testid="date-filter-histogram">
          <Histogram
            buckets={histogramBuckets}
            selectionMinPercent={dateToHistogramPercent(daysToDate(localRange[0]), histogramBuckets)}
            selectionMaxPercent={dateToHistogramPercent(daysToDate(localRange[1]), histogramBuckets)}
          />
        </div>
      )}
    </div>
  )
}

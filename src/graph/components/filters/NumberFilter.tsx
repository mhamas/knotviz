import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import type { NumberFilterState } from '../../types'
import { useDebounce } from '@/hooks/useDebounce'
import { Slider } from '@/components/ui/slider'
import { Histogram } from '@/components/Histogram'
import { formatNumber } from '../../lib/formatNumber'

interface Props {
  state: NumberFilterState
  onChange: (min: number, max: number) => void
  isHistogramVisible: boolean
}

/** Convert a real value to log-space slider position. */
function toLog(v: number): number {
  return Math.log10(v + 1)
}

/** Convert a log-space slider position back to a real value. */
function fromLog(s: number): number {
  return Math.pow(10, s) - 1
}

/**
 * Convert a value to its x-position (0–100) on the histogram. The histogram
 * renders buckets with equal visual width regardless of underlying scale,
 * so the position is `(bucketIndex + fractionWithinBucket) / bucketCount`.
 * Linear interpolation inside the bucket is visually faithful because each
 * bar's x-axis is rendered linearly by the DOM.
 */
function valueToHistogramPercent(v: number, buckets: { from: number; to: number }[]): number {
  if (buckets.length === 0) return 0
  if (v <= buckets[0].from) return 0
  if (v >= buckets[buckets.length - 1].to) return 100
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i]
    if (v >= b.from && v < b.to) {
      const span = b.to - b.from
      const inBucket = span === 0 ? 0 : (v - b.from) / span
      return ((i + inBucket) / buckets.length) * 100
    }
  }
  return 100
}

/**
 * Inverse percentile lookup: given a value and the precomputed quantiles
 * array (101 entries, q[i] = value at percentile i), return the interpolated
 * percentile position (0–100). Clamps out-of-range values to the endpoints.
 */
function valueToPercentile(v: number, quantiles: Float64Array): number {
  if (quantiles.length === 0) return 0
  if (v <= quantiles[0]) return 0
  if (v >= quantiles[100]) return 100
  let lo = 0
  let hi = 100
  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1
    if (quantiles[mid] <= v) lo = mid
    else hi = mid
  }
  const a = quantiles[lo]
  const b = quantiles[hi]
  if (a === b) return lo
  return lo + (v - a) / (b - a)
}

/**
 * Raw value shown inside the input while the user is actively editing.
 * `parseFloat` must round-trip this string back to a number, so no
 * thousands separator here.
 */
function editValue(v: number): string {
  if (v === 0) return '0'
  if (Math.abs(v) >= 0.01) return v.toFixed(2)
  return v.toPrecision(3)
}

/**
 * Pretty value shown inside the input when it is *not* focused — uses
 * `formatNumber` so large bounds read with commas (e.g. `1,234.56`).
 * On focus we swap this for `editValue` to keep parseFloat happy.
 */
function displayValue(v: number): string {
  if (v === 0) return '0'
  if (Math.abs(v) >= 0.01) return formatNumber(v, { decimals: 2 })
  return formatNumber(v)
}

/**
 * Dual-handle range slider for filtering nodes by a numeric property.
 * Supports three scale modes (linear / log / percentile), an optional
 * inline histogram, and editable min/max inputs. In percentile mode the
 * slider operates in [0, 100] space; a drag to [10, 90] keeps the middle
 * 80% of nodes. A small `p{N}` tag above each input shows what
 * percentile the current value sits at.
 *
 * @param props - Current filter state, change handler, and histogram visibility.
 * @returns Number filter element.
 */
export function NumberFilter({ state, onChange, isHistogramVisible }: Props): React.JSX.Element {
  const [localRange, setLocalRange] = useState<[number, number]>([state.min, state.max])
  // Separate local state for the pct-mode slider position. Decoupled from
  // `localRange` so tied quantiles (e.g. mostly-zero activity data where
  // q[0..80] all equal 0) don't collapse the handle back to p0 on every
  // re-render. The handle position is authoritative while in pct mode;
  // `localRange` is derived from it via `quantiles[p]` lookups.
  const [localPct, setLocalPct] = useState<[number, number]>(() => {
    if (state.scaleMode !== 'percentile' || state.quantiles.length === 0) {
      return [0, 100]
    }
    return [
      valueToPercentile(state.min, state.quantiles),
      valueToPercentile(state.max, state.quantiles),
    ]
  })
  const [editingMin, setEditingMin] = useState<string | null>(null)
  const [editingMax, setEditingMax] = useState<string | null>(null)
  const debouncedOnChange = useDebounce(onChange, 150)
  const minInputRef = useRef<HTMLInputElement>(null)
  const maxInputRef = useRef<HTMLInputElement>(null)
  // Ref to prevent blur handler from committing when Escape was pressed.
  // React batches state updates, so blur fires before setEditingMin(null) takes effect.
  const isEscapingRef = useRef(false)

  const { scaleMode, domainMin, domainMax, quantiles } = state
  const isLogScale = scaleMode === 'log'
  const isPercentileScale = scaleMode === 'percentile'

  // On scaleMode transition *into* pct, resync the slider position from
  // the current range so the handles land where the last non-pct selection
  // was. Uses React's "adjust state during render" pattern instead of
  // useEffect — same effect, no cascading render penalty.
  const [cachedScaleMode, setCachedScaleMode] = useState<typeof scaleMode>(scaleMode)
  if (cachedScaleMode !== scaleMode) {
    setCachedScaleMode(scaleMode)
    if (scaleMode === 'percentile' && quantiles.length > 0) {
      setLocalPct([
        valueToPercentile(localRange[0], quantiles),
        valueToPercentile(localRange[1], quantiles),
      ])
    }
  }

  // Slider bounds, step, and current value in the active scale space.
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
    sliderMin = toLog(domainMin)
    sliderMax = toLog(domainMax)
    sliderStep = (sliderMax - sliderMin) / 200 || 0.01
    sliderValue = [toLog(localRange[0]), toLog(localRange[1])]
  } else {
    sliderMin = domainMin
    sliderMax = domainMax
    sliderStep = (sliderMax - sliderMin) / 200 || 0.01
    sliderValue = localRange
  }

  const handleSliderChange = useCallback(
    (value: number | readonly number[]): void => {
      const arr = Array.isArray(value) ? value : [value]
      let newMin = arr[0]
      let newMax = arr[1] ?? arr[0]
      if (isPercentileScale) {
        // Slider positions are integer percentiles 0..100. Store the
        // exact slider position in `localPct` (authoritative — handles
        // tied-quantile data gracefully) and derive the actual value for
        // the committed range via an O(1) quantile lookup.
        const pLo = Math.round(Math.min(Math.max(newMin, 0), 100))
        const pHi = Math.round(Math.min(Math.max(newMax, 0), 100))
        setLocalPct([pLo, pHi])
        newMin = quantiles.length > 0 ? quantiles[pLo] : domainMin
        newMax = quantiles.length > 0 ? quantiles[pHi] : domainMax
      } else if (isLogScale) {
        newMin = fromLog(newMin)
        newMax = fromLog(newMax)
      }
      const newRange: [number, number] = [newMin, newMax]
      setLocalRange(newRange)
      debouncedOnChange(newRange[0], newRange[1])
    },
    [isPercentileScale, isLogScale, quantiles, domainMin, domainMax, debouncedOnChange],
  )

  const commitInput = useCallback(
    (which: 'min' | 'max', raw: string): void => {
      const parsed = parseFloat(raw)
      if (Number.isNaN(parsed)) {
        // Revert
        if (which === 'min') setEditingMin(null)
        else setEditingMax(null)
        return
      }
      const clamped = Math.min(Math.max(parsed, domainMin), domainMax)
      let newRange: [number, number]
      if (which === 'min') {
        newRange = [Math.min(clamped, localRange[1]), localRange[1]]
        setEditingMin(null)
      } else {
        newRange = [localRange[0], Math.max(clamped, localRange[0])]
        setEditingMax(null)
      }
      setLocalRange(newRange)
      debouncedOnChange(newRange[0], newRange[1])
    },
    [domainMin, domainMax, localRange, debouncedOnChange],
  )

  const histogramBuckets = isLogScale ? state.logHistogramBuckets : state.histogramBuckets

  // Percentile tags shown above the inputs in pct mode. Read directly
  // from `localPct` (authoritative slider position) rather than deriving
  // from `localRange` — otherwise ties collapse both tags to p0.
  // Rounded for display: `localPct` is a float right after a log/linear→%
  // mode switch (because `valueToPercentile` interpolates), but the
  // slider itself only emits integer percentiles, so a whole-number tag
  // keeps the label consistent with what the user sees on the track.
  const pctTagLow = isPercentileScale && quantiles.length > 0 ? `p${Math.round(localPct[0])}` : null
  const pctTagHigh = isPercentileScale && quantiles.length > 0 ? `p${Math.round(localPct[1])}` : null

  return (
    <div className="space-y-1" data-testid="number-filter">
      {/* Slider */}
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onValueChange={handleSliderChange}
      />

      {/* Percentile tags (pct mode only) */}
      {isPercentileScale && (
        <div className="flex justify-between text-[10px] font-medium text-slate-500" data-testid="number-filter-pct-tags">
          <span data-testid="number-filter-pct-tag-min">{pctTagLow}</span>
          <span data-testid="number-filter-pct-tag-max">{pctTagHigh}</span>
        </div>
      )}

      {/* Editable min/max inputs */}
      <div className="flex justify-between text-[11px] text-slate-500">
        <input
          ref={minInputRef}
          type="text"
          data-testid="number-filter-min"
          className="w-16 border-b border-transparent bg-transparent text-left text-[11px] text-slate-500 outline-none focus:border-slate-400"
          value={editingMin ?? displayValue(localRange[0])}
          onFocus={(e): void => {
            setEditingMin(editValue(localRange[0]))
            e.target.select()
          }}
          onChange={(e): void => setEditingMin(e.target.value)}
          onBlur={(): void => {
            if (isEscapingRef.current) {
              isEscapingRef.current = false
              return
            }
            if (editingMin !== null) commitInput('min', editingMin)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
            if (e.key === 'Enter') {
              if (editingMin !== null) commitInput('min', editingMin)
              minInputRef.current?.blur()
            } else if (e.key === 'Escape') {
              isEscapingRef.current = true
              setEditingMin(null)
              minInputRef.current?.blur()
            }
          }}
        />
        <input
          ref={maxInputRef}
          type="text"
          data-testid="number-filter-max"
          className="w-16 border-b border-transparent bg-transparent text-right text-[11px] text-slate-500 outline-none focus:border-slate-400"
          value={editingMax ?? displayValue(localRange[1])}
          onFocus={(e): void => {
            setEditingMax(editValue(localRange[1]))
            e.target.select()
          }}
          onChange={(e): void => setEditingMax(e.target.value)}
          onBlur={(): void => {
            if (isEscapingRef.current) {
              isEscapingRef.current = false
              return
            }
            if (editingMax !== null) commitInput('max', editingMax)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
            if (e.key === 'Enter') {
              if (editingMax !== null) commitInput('max', editingMax)
              maxInputRef.current?.blur()
            } else if (e.key === 'Escape') {
              isEscapingRef.current = true
              setEditingMax(null)
              maxInputRef.current?.blur()
            }
          }}
        />
      </div>

      {/* Histogram (below slider) */}
      {isHistogramVisible && histogramBuckets.length > 0 && (
        <div data-testid="number-filter-histogram">
          <Histogram
            buckets={histogramBuckets}
            selectionMinPercent={valueToHistogramPercent(localRange[0], histogramBuckets)}
            selectionMaxPercent={valueToHistogramPercent(localRange[1], histogramBuckets)}
          />
        </div>
      )}
    </div>
  )
}

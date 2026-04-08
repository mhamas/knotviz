import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { BarChart3 } from 'lucide-react'
import type { NumberFilterState } from '../../types'
import { useDebounce } from '@/hooks/useDebounce'
import { Slider } from '@/components/ui/slider'
import { Histogram } from '@/components/Histogram'

interface Props {
  state: NumberFilterState
  onChange: (min: number, max: number) => void
  onLogScaleChange?: (isLogScale: boolean) => void
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
 * Supports optional log scale, inline histogram, and editable min/max inputs.
 *
 * @param props - Current filter state, change handler, and log scale handler.
 * @returns Number filter element.
 */
export function NumberFilter({ state, onChange, onLogScaleChange }: Props): React.JSX.Element {
  const [localRange, setLocalRange] = useState<[number, number]>([state.min, state.max])
  const [isHistogramVisible, setIsHistogramVisible] = useState(false)
  const [editingMin, setEditingMin] = useState<string | null>(null)
  const [editingMax, setEditingMax] = useState<string | null>(null)
  const debouncedOnChange = useDebounce(onChange, 150)
  const minInputRef = useRef<HTMLInputElement>(null)
  const maxInputRef = useRef<HTMLInputElement>(null)
  // Ref to prevent blur handler from committing when Escape was pressed.
  // React batches state updates, so blur fires before setEditingMin(null) takes effect.
  const isEscapingRef = useRef(false)

  const { isLogScale, domainMin, domainMax } = state
  const isLogAvailable = domainMin >= 0 && state.logHistogramBuckets.length > 0

  // Slider bounds and step in the active scale space
  const sliderMin = isLogScale ? toLog(domainMin) : domainMin
  const sliderMax = isLogScale ? toLog(domainMax) : domainMax
  const sliderStep = (sliderMax - sliderMin) / 200 || 0.01
  const sliderValue: [number, number] = isLogScale
    ? [toLog(localRange[0]), toLog(localRange[1])]
    : localRange

  const handleSliderChange = useCallback(
    (value: number | readonly number[]): void => {
      const arr = Array.isArray(value) ? value : [value]
      let newMin = arr[0]
      let newMax = arr[1] ?? arr[0]
      if (isLogScale) {
        newMin = fromLog(newMin)
        newMax = fromLog(newMax)
      }
      const newRange: [number, number] = [newMin, newMax]
      setLocalRange(newRange)
      debouncedOnChange(newRange[0], newRange[1])
    },
    [isLogScale, debouncedOnChange],
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

  return (
    <div className="space-y-1" data-testid="number-filter">
      {/* Toolbar */}
      <div className="flex items-center justify-start gap-1">
        <button
          type="button"
          data-testid="number-filter-log-toggle"
          disabled={!isLogAvailable}
          onClick={(): void => onLogScaleChange?.(!isLogScale)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            isLogScale
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          } ${!isLogAvailable ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
          title={isLogAvailable ? (isLogScale ? 'Switch to linear scale' : 'Switch to log scale') : 'Log scale unavailable (negative values)'}
        >
          log
        </button>
        <button
          type="button"
          data-testid="number-filter-histogram-toggle"
          onClick={(): void => setIsHistogramVisible((v) => !v)}
          className={`rounded p-0.5 transition-colors ${
            isHistogramVisible
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          } cursor-pointer`}
          title={isHistogramVisible ? 'Hide histogram' : 'Show histogram'}
        >
          <BarChart3 className="h-3 w-3" />
        </button>
      </div>

      {/* Slider */}
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onValueChange={handleSliderChange}
      />

      {/* Editable min/max inputs */}
      <div className="flex justify-between text-[11px] text-slate-500">
        <input
          ref={minInputRef}
          type="text"
          data-testid="number-filter-min"
          className="w-16 border-b border-transparent bg-transparent text-left text-[11px] text-slate-500 outline-none focus:border-slate-400"
          value={editingMin ?? formatValue(localRange[0])}
          onFocus={(e): void => {
            setEditingMin(formatValue(localRange[0]))
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
          value={editingMax ?? formatValue(localRange[1])}
          onFocus={(e): void => {
            setEditingMax(formatValue(localRange[1]))
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
          <Histogram buckets={histogramBuckets} />
        </div>
      )}
    </div>
  )
}

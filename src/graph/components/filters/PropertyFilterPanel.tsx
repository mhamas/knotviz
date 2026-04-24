import { useState } from 'react'
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { HelpPopover } from '@/components/sidebar'
import type {
  BooleanFilterState,
  DateFilterState,
  FilterState,
  NumberFilterState,
  PropertyMeta,
  ScaleMode,
  StringFilterState,
} from '../../types'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberFilter } from './NumberFilter'
import { BooleanFilter } from './BooleanFilter'
import { StringFilter } from './StringFilter'
import { DateFilter } from './DateFilter'

interface Props {
  meta: PropertyMeta
  description?: string
  filterState: FilterState
  onEnabledChange: (isEnabled: boolean) => void
  onNumberChange?: (min: number, max: number) => void
  onScaleModeChange?: (mode: ScaleMode) => void
  onBooleanChange?: (selected: BooleanFilterState['selected']) => void
  onStringChange?: (selectedValues: Set<string>) => void
  onDateChange?: (after: string, before: string) => void
}

const SCALE_BUTTONS: ReadonlyArray<{ mode: ScaleMode; label: string; title: string }> = [
  { mode: 'linear', label: 'lin', title: 'Linear scale' },
  { mode: 'log', label: 'log', title: 'Log scale' },
  { mode: 'percentile', label: '%', title: 'Percentile scale (0–100)' },
]

/**
 * Panel for a single property filter.
 *
 * Header row is always compact: enable checkbox, name, histogram toggle,
 * a chevron expander, and the type badge. Clicking the chevron reveals a
 * second row with a 3-button segmented control for picking a scale
 * mode (linear / log / percentile). Scale modes are mutually exclusive;
 * the segmented control makes that explicit instead of overloading two
 * toggle buttons. The expanded row stays open until the chevron is
 * clicked again. The scale row only shows up for number and date
 * filters — other types have no scale concept.
 *
 * Controls are always visible; dimmed and non-interactive when the
 * filter is disabled.
 *
 * @param props - Property metadata, filter state, and change handlers.
 * @returns Property filter panel element.
 */
export function PropertyFilterPanel({
  meta,
  description,
  filterState,
  onEnabledChange,
  onNumberChange,
  onScaleModeChange,
  onBooleanChange,
  onStringChange,
  onDateChange,
}: Props): React.JSX.Element {
  const [isHistogramVisible, setIsHistogramVisible] = useState(false)
  const [isScaleRowVisible, setIsScaleRowVisible] = useState(false)

  const isNumber = filterState.type === 'number'
  const isDate = filterState.type === 'date'
  const hasScaleControls = isNumber || isDate
  const numberState = isNumber ? (filterState as NumberFilterState) : null
  const dateState = isDate ? (filterState as DateFilterState) : null

  const scaleMode: ScaleMode =
    numberState?.scaleMode ?? dateState?.scaleMode ?? 'linear'

  // Mode availability. Linear is always available. Log requires the
  // data to be in the valid range. Percentile requires a non-empty
  // quantiles array (no quantiles → slider would have no anchor points).
  const isLogAvailable = numberState
    ? numberState.domainMin >= 0 && numberState.logHistogramBuckets.length > 0
    : dateState
    ? dateState.logHistogramBuckets.length > 0
    : false
  const isPercentileAvailable = numberState
    ? numberState.quantiles.length > 0
    : dateState
    ? dateState.quantiles.length > 0
    : false

  const isModeAvailable = (mode: ScaleMode): boolean => {
    if (mode === 'linear') return true
    if (mode === 'log') return isLogAvailable
    return isPercentileAvailable
  }

  const expanderTestId = isNumber
    ? 'number-filter-scale-expander'
    : isDate
    ? 'date-filter-scale-expander'
    : 'filter-scale-expander'
  const histogramToggleTestId = isNumber
    ? 'number-filter-histogram-toggle'
    : 'date-filter-histogram-toggle'
  const typePrefix = isNumber ? 'number-filter' : 'date-filter'

  return (
    <div data-testid={`filter-panel-${meta.key}`} className="border-b border-slate-100 pb-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 py-1">
        <Checkbox
          className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
          checked={filterState.isEnabled}
          onCheckedChange={(v): void => onEnabledChange(v === true)}
        />

        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-xs font-medium text-slate-700" title={meta.key}>
            {meta.key}
          </span>
          {description && <HelpPopover>{description}</HelpPopover>}
        </span>

        {/* Histogram + scale-expander icons — next to the type badge */}
        {hasScaleControls && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              data-testid={histogramToggleTestId}
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
            <button
              type="button"
              data-testid={expanderTestId}
              onClick={(): void => setIsScaleRowVisible((v) => !v)}
              className={`rounded p-0.5 transition-colors ${
                isScaleRowVisible
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              } cursor-pointer`}
              title={isScaleRowVisible ? 'Hide scale options' : 'Show scale options'}
              aria-expanded={isScaleRowVisible}
            >
              {isScaleRowVisible ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        )}

        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          {meta.type}
        </span>
      </div>

      {/* Scale row — expanded. Aligned to the right edge, directly below
          the scale-expander chevron, and given a bit of bottom margin so
          the segmented control doesn't crowd the slider body. */}
      {hasScaleControls && isScaleRowVisible && (
        <div
          className={`mt-1 mb-2 flex items-center justify-end ${
            !filterState.isEnabled ? 'pointer-events-none opacity-30' : ''
          }`}
          data-testid={`${typePrefix}-scale-row`}
        >
          <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-white">
            {SCALE_BUTTONS.map(({ mode, label, title }, i) => {
              const isActive = scaleMode === mode
              const isDisabled = !isModeAvailable(mode)
              return (
                <button
                  key={mode}
                  type="button"
                  data-testid={`${typePrefix}-scale-mode-${mode}`}
                  disabled={isDisabled}
                  onClick={(): void => onScaleModeChange?.(mode)}
                  className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    i > 0 ? 'border-l border-slate-200' : ''
                  } ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  } ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
                  title={isDisabled ? `${title} (unavailable for this data)` : title}
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Body — always visible, dimmed when disabled */}
      <div className={`mt-1 pl-6 ${!filterState.isEnabled ? 'pointer-events-none opacity-30' : ''}`}>
        {isNumber && onNumberChange && numberState && (
          <NumberFilter
            state={numberState}
            onChange={onNumberChange}
            isHistogramVisible={isHistogramVisible}
          />
        )}
        {filterState.type === 'boolean' && onBooleanChange && (
          <BooleanFilter
            state={filterState as BooleanFilterState}
            onChange={onBooleanChange}
          />
        )}
        {filterState.type === 'string' && onStringChange && (
          <StringFilter
            state={filterState as StringFilterState}
            onChange={onStringChange}
          />
        )}
        {filterState.type === 'string[]' && onStringChange && (
          <StringFilter
            state={filterState as unknown as StringFilterState}
            onChange={onStringChange}
          />
        )}
        {filterState.type === 'date' && onDateChange && (
          <DateFilter
            state={filterState as DateFilterState}
            onChange={onDateChange}
            isHistogramVisible={isHistogramVisible}
          />
        )}
      </div>
    </div>
  )
}

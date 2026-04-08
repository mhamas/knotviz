import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import type {
  BooleanFilterState,
  DateFilterState,
  FilterState,
  NumberFilterState,
  PropertyMeta,
  StringFilterState,
} from '../../types'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberFilter } from './NumberFilter'
import { BooleanFilter } from './BooleanFilter'
import { StringFilter } from './StringFilter'
import { DateFilter } from './DateFilter'

interface Props {
  meta: PropertyMeta
  filterState: FilterState
  onEnabledChange: (isEnabled: boolean) => void
  onNumberChange?: (min: number, max: number) => void
  onLogScaleChange?: (isLogScale: boolean) => void
  onBooleanChange?: (selected: BooleanFilterState['selected']) => void
  onStringChange?: (selectedValues: Set<string>) => void
  onDateChange?: (after: string, before: string) => void
}

/**
 * Panel for a single property filter.
 * Controls are always visible; dimmed and non-interactive when disabled.
 *
 * @param props - Property metadata, filter state, and change handlers.
 * @returns Property filter panel element.
 */
export function PropertyFilterPanel({
  meta,
  filterState,
  onEnabledChange,
  onNumberChange,
  onLogScaleChange,
  onBooleanChange,
  onStringChange,
  onDateChange,
}: Props): React.JSX.Element {
  const [isHistogramVisible, setIsHistogramVisible] = useState(false)

  const isNumber = filterState.type === 'number'
  const numberState = isNumber ? (filterState as NumberFilterState) : null
  const isLogScale = numberState?.isLogScale ?? false
  const isLogAvailable = numberState ? numberState.domainMin >= 0 && numberState.logHistogramBuckets.length > 0 : false

  return (
    <div data-testid={`filter-panel-${meta.key}`} className="border-b border-slate-100 pb-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 py-1">
        <Checkbox
          className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
          checked={filterState.isEnabled}
          onCheckedChange={(v): void => onEnabledChange(v === true)}
        />

        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" title={meta.key}>
          {meta.key}
        </span>

        {/* Number filter toolbar icons — next to the type badge */}
        {isNumber && (
          <div className="flex shrink-0 items-center gap-0.5">
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
        )}

        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          {meta.type}
        </span>
      </div>

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
          />
        )}
      </div>
    </div>
  )
}

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
  onBooleanChange,
  onStringChange,
  onDateChange,
}: Props): React.JSX.Element {
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

        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          {meta.type}
        </span>
      </div>

      {/* Body — always visible, dimmed when disabled */}
      <div className={`mt-1 pl-6 ${!filterState.isEnabled ? 'pointer-events-none opacity-30' : ''}`}>
        {filterState.type === 'number' && onNumberChange && (
          <NumberFilter
            state={filterState as NumberFilterState}
            onChange={onNumberChange}
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

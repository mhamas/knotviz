import type {
  BooleanFilterState,
  FilterState,
  NumberFilterState,
  PropertyMeta,
} from '../../types'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberFilter } from './NumberFilter'
import { BooleanFilter } from './BooleanFilter'

interface Props {
  meta: PropertyMeta
  filterState: FilterState
  onEnabledChange: (isEnabled: boolean) => void
  onNumberChange?: (min: number, max: number) => void
  onBooleanChange?: (selected: BooleanFilterState['selected']) => void
}

/**
 * Panel for a single property filter.
 * Checkbox enables the filter and reveals the control; unchecked hides it.
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

      {/* Body — only shown when filter is enabled */}
      {filterState.isEnabled && (
        <div className="mt-1 pl-6">
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
          {filterState.type === 'string' && (
            <p className="text-[11px] italic text-slate-400">String filter (coming soon)</p>
          )}
          {filterState.type === 'date' && (
            <p className="text-[11px] italic text-slate-400">Date filter (coming soon)</p>
          )}
        </div>
      )}
    </div>
  )
}

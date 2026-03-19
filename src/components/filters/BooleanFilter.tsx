import type { BooleanFilterState } from '../../types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface Props {
  state: BooleanFilterState
  onChange: (selected: boolean) => void
}

/**
 * Two-way radio group for filtering by a boolean property.
 *
 * @param props - Current filter state and change handler.
 * @returns Boolean filter radio group element.
 */
export function BooleanFilter({ state, onChange }: Props): React.JSX.Element {
  return (
    <RadioGroup
      data-testid="boolean-filter"
      className="flex gap-4"
      value={String(state.selected)}
      onValueChange={(v): void => onChange(v === 'true')}
    >
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
        <RadioGroupItem value="true" />
        True
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
        <RadioGroupItem value="false" />
        False
      </label>
    </RadioGroup>
  )
}

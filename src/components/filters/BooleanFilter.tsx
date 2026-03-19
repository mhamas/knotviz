import type { BooleanFilterState } from '../../types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface Props {
  state: BooleanFilterState
  onChange: (selected: BooleanFilterState['selected']) => void
}

const OPTIONS: { value: BooleanFilterState['selected']; label: string }[] = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
  { value: 'either', label: 'Either' },
]

/**
 * Three-way radio group for filtering by a boolean property.
 * Options: true, false, either (no restriction).
 *
 * @param props - Current filter state and change handler.
 * @returns Boolean filter radio group element.
 */
export function BooleanFilter({ state, onChange }: Props): React.JSX.Element {
  return (
    <RadioGroup
      data-testid="boolean-filter"
      className="flex gap-4"
      value={state.selected}
      onValueChange={(v): void => onChange(v as BooleanFilterState['selected'])}
    >
      {OPTIONS.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
          <RadioGroupItem value={opt.value} />
          {opt.label}
        </label>
      ))}
    </RadioGroup>
  )
}

import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  label: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * Styled sidebar checkbox with label.
 *
 * @param props - Label text, checked state, optional disabled, and change handler.
 * @returns Sidebar checkbox element.
 */
export function SidebarCheckbox({
  label,
  checked,
  disabled = false,
  onCheckedChange,
}: Props): React.JSX.Element {
  return (
    <label className={`flex items-center gap-2 text-xs font-medium ${disabled ? 'cursor-default text-slate-400' : 'cursor-pointer text-slate-600'}`}>
      <Checkbox
        className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v): void => onCheckedChange(v === true)}
      />
      {label}
    </label>
  )
}

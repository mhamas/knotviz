import { Checkbox } from '@/components/ui/checkbox'
import { HelpPopover } from './HelpPopover'

interface Props {
  label: string
  checked: boolean
  disabled?: boolean
  help?: React.ReactNode
  onCheckedChange: (checked: boolean) => void
}

/**
 * Styled sidebar checkbox with label and optional help popover.
 *
 * @param props - Label text, checked state, optional disabled/help, and change handler.
 * @returns Sidebar checkbox element.
 */
export function SidebarCheckbox({
  label,
  checked,
  disabled = false,
  help,
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
      {help && <HelpPopover>{help}</HelpPopover>}
    </label>
  )
}

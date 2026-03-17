import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * Styled sidebar checkbox with label.
 *
 * @param props - Label text, checked state, and change handler.
 * @returns Sidebar checkbox element.
 */
export function SidebarCheckbox({
  label,
  checked,
  onCheckedChange,
}: Props): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
      <Checkbox
        className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
        checked={checked}
        onCheckedChange={(v): void => onCheckedChange(v === true)}
      />
      {label}
    </label>
  )
}

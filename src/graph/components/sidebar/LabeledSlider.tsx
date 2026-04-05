import { Slider } from '@/components/ui/slider'
import { HelpPopover } from './HelpPopover'

interface Props {
  label: string
  value: number
  formatValue?: (v: number) => string
  help?: string
  min: number
  max: number
  step: number
  defaultValue: number[]
  onValueChange: (value: number | readonly number[]) => void
}

/**
 * Slider with a label row showing name, optional help popover, and current value.
 *
 * @param props - Slider configuration, label, and optional help text.
 * @returns Labeled slider element.
 */
export function LabeledSlider({
  label,
  value,
  formatValue,
  help,
  min,
  max,
  step,
  defaultValue,
  onValueChange,
}: Props): React.JSX.Element {
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium text-slate-600">{label}</label>
          {help && <HelpPopover>{help}</HelpPopover>}
        </div>
        <span className="text-[10px] text-slate-400">{displayValue}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      />
    </div>
  )
}

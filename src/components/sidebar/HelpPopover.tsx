import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Small `?` icon that opens a popover with help text on click.
 *
 * @param props - Popover content and optional placement side.
 * @returns Help popover trigger element.
 */
export function HelpPopover({ children, side = 'right' }: Props): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-300">
        ?
      </PopoverTrigger>
      <PopoverContent side={side} className="w-48 text-xs text-slate-600">
        {children}
      </PopoverContent>
    </Popover>
  )
}

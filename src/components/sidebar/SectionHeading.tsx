import { HelpPopover } from './HelpPopover'

interface Props {
  children: React.ReactNode
  help?: string
}

/**
 * Sidebar section heading with optional help popover.
 *
 * @param props - Heading text and optional help tooltip content.
 * @returns Section heading element.
 */
export function SectionHeading({ children, help }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{children}</h3>
      {help && <HelpPopover>{help}</HelpPopover>}
    </div>
  )
}

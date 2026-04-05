import { HelpPopover } from './HelpPopover'

interface Props {
  label: string
  help?: string
  children: React.ReactNode
  defaultOpen?: boolean
  trailing?: React.ReactNode
}

/**
 * Collapsible details/summary toggle for sidebar sections.
 *
 * @param props - Toggle label, optional help popover, and collapsible content.
 * @returns Collapsible section element.
 */
export function CollapsibleSection({ label, help, children, defaultOpen = true, trailing }: Props): React.JSX.Element {
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-1 select-none">
        <span className="inline-block text-sm text-slate-400 transition-transform group-open:rotate-90">
          ▶
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</h3>
        {help && <HelpPopover>{help}</HelpPopover>}
        {trailing && <span className="ml-auto">{trailing}</span>}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

interface Props {
  label: string
  children: React.ReactNode
}

/**
 * Collapsible details/summary toggle for sidebar sub-sections.
 *
 * @param props - Toggle label and collapsible content.
 * @returns Collapsible section element.
 */
export function CollapsibleSection({ label, children }: Props): React.JSX.Element {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs font-medium text-slate-600 select-none">
        <span className="inline-block text-sm text-slate-500 transition-transform group-open:rotate-90">
          ▶
        </span>{' '}
        {label}
      </summary>
      <div className="mt-2 space-y-3">{children}</div>
    </details>
  )
}

interface Props {
  label: string
  value: string | number
}

/**
 * Key-value stat row for displaying graph metadata.
 *
 * @param props - Label and formatted value to display.
 * @returns Stat row element.
 */
export function StatRow({ label, value }: Props): React.JSX.Element {
  return (
    <div className="flex justify-between text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-slate-400">{value}</span>
    </div>
  )
}

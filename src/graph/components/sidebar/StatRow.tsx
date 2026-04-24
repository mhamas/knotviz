interface Props {
  label: string
  value: React.ReactNode
  /**
   * Optional CSS color for a small round dot rendered before the label.
   * Used by `StatisticsPanel` to tag p25/p50/p75/mean rows so they match
   * the coloured markers drawn on the histogram below.
   */
  markerColor?: string
}

/**
 * Key-value stat row for displaying graph metadata.
 *
 * @param props - Label and formatted value to display.
 * @returns Stat row element.
 */
export function StatRow({ label, value, markerColor }: Props): React.JSX.Element {
  return (
    <div className="flex justify-between text-xs" style={{ fontVariantNumeric: 'tabular-nums' }} data-testid={`stat-${label.toLowerCase()}`}>
      <span className="flex items-center gap-1.5 font-medium text-slate-600">
        <span>{label}</span>
        {markerColor && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: markerColor }}
            data-testid="stat-row-marker"
          />
        )}
      </span>
      <span className="text-slate-400">{value}</span>
    </div>
  )
}

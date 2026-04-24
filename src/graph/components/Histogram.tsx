import { useState } from 'react'
import type { HistogramBucket, DateHistogramBucket } from '../types'
import { formatNumber } from '../lib/formatNumber'

interface NumericProps {
  buckets: HistogramBucket[]
  /** Left position of the min marker as a percentage of histogram width (0–100). */
  selectionMinPercent?: number
  /** Left position of the max marker as a percentage of histogram width (0–100). */
  selectionMaxPercent?: number
}

interface DateProps {
  buckets: DateHistogramBucket[]
  selectionMinPercent?: number
  selectionMaxPercent?: number
}

type Props = NumericProps | DateProps

/** Format a numeric boundary for display: up to 1 decimal place. */
function fmtNum(v: number): string {
  return Number.isInteger(v) ? formatNumber(v) : formatNumber(v, { decimals: 1 })
}

/** Build tooltip text for a bucket. */
function tooltipText(bucket: HistogramBucket | DateHistogramBucket): string {
  const from = typeof bucket.from === 'number' ? fmtNum(bucket.from) : bucket.from
  const to = typeof bucket.to === 'number' ? fmtNum(bucket.to) : bucket.to
  const noun = bucket.count === 1 ? 'node' : 'nodes'
  return `${from} – ${to}: ${formatNumber(bucket.count)} ${noun}`
}

/**
 * Horizontal bar chart visualising histogram bucket distribution.
 * Each bar has a hover tooltip showing its range and count.
 *
 * Optional `selectionMinPercent` / `selectionMaxPercent` draw two thin
 * red vertical markers at the given positions (0–100, as % of the
 * histogram's width). Markers are rendered over the bars and the caller
 * is expected to omit them when the current slider selection matches
 * the full domain (i.e. the filter hasn't been narrowed yet) so the
 * histogram isn't decorated with redundant edge-hugging lines.
 *
 * @param props - Histogram buckets (numeric or date) and optional selection markers.
 * @returns Bar chart element, or null when there are no buckets.
 */
export function Histogram({ buckets, selectionMinPercent, selectionMaxPercent }: Props): React.JSX.Element | null {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (buckets.length === 0) return null

  let maxCount = 0
  for (const b of buckets) {
    if (b.count > maxCount) maxCount = b.count
  }

  return (
    <div className="mt-2" data-testid="histogram">
      <div className="relative flex h-24 items-end gap-px">
        {buckets.map((bucket, i) => {
          const heightPct = maxCount === 0 ? 0 : (bucket.count / maxCount) * 100
          const tip = tooltipText(bucket)
          return (
            <div
              key={i}
              className="relative flex flex-1 flex-col justify-end"
              style={{ height: '100%' }}
              onMouseEnter={(): void => setHoveredIndex(i)}
              onMouseLeave={(): void => setHoveredIndex(null)}
            >
              <div
                className="w-full rounded-t bg-slate-400 transition-all hover:bg-slate-600"
                style={{ height: `${heightPct}%`, minHeight: bucket.count > 0 ? '2px' : '0px' }}
                title={tip}
                data-testid="histogram-bar"
              />
            </div>
          )
        })}
        {selectionMinPercent !== undefined && (
          <div
            data-testid="histogram-selection-min"
            className="pointer-events-none absolute top-0 h-full w-px -translate-x-1/2 bg-red-500"
            style={{ left: `${selectionMinPercent}%` }}
          />
        )}
        {selectionMaxPercent !== undefined && (
          <div
            data-testid="histogram-selection-max"
            className="pointer-events-none absolute top-0 h-full w-px -translate-x-1/2 bg-red-500"
            style={{ left: `${selectionMaxPercent}%` }}
          />
        )}
      </div>
      {hoveredIndex !== null && (
        <div
          className="mt-1 text-center text-xs text-slate-600"
          data-testid="histogram-tooltip"
        >
          {tooltipText(buckets[hoveredIndex])}
        </div>
      )}
    </div>
  )
}

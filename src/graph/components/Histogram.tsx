import { useState } from 'react'
import type { HistogramBucket, DateHistogramBucket } from '../types'

interface NumericProps {
  buckets: HistogramBucket[]
}

interface DateProps {
  buckets: DateHistogramBucket[]
}

type Props = NumericProps | DateProps

/** Format a numeric boundary for display: up to 1 decimal place. */
function fmtNum(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

/** Build tooltip text for a bucket. */
function tooltipText(bucket: HistogramBucket | DateHistogramBucket): string {
  const from = typeof bucket.from === 'number' ? fmtNum(bucket.from) : bucket.from
  const to = typeof bucket.to === 'number' ? fmtNum(bucket.to) : bucket.to
  const noun = bucket.count === 1 ? 'node' : 'nodes'
  return `${from} – ${to}: ${bucket.count.toLocaleString()} ${noun}`
}

/**
 * Horizontal bar chart visualising histogram bucket distribution.
 * Each bar has a hover tooltip showing its range and count.
 *
 * @param props - Histogram buckets (numeric or date).
 * @returns Bar chart element, or null when there are no buckets.
 */
export function Histogram({ buckets }: Props): React.JSX.Element | null {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (buckets.length === 0) return null

  let maxCount = 0
  for (const b of buckets) {
    if (b.count > maxCount) maxCount = b.count
  }

  return (
    <div className="mt-2" data-testid="histogram">
      <div className="flex h-24 items-end gap-px">
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

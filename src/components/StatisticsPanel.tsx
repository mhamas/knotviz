import type { PropertyStatsResult, NumericStats, DateStats, SerializableCategoricalStats } from '../types'
import { StatRow } from '@/components/sidebar'

interface Props {
  stats: PropertyStatsResult | null
  propertyKey: string | null
}

/** Format a number for display: up to 2 decimal places, with locale separators. */
function fmt(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** Numeric stats table (number property). */
function NumericStatsTable({ stats }: { stats: NumericStats }): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <StatRow label="Total" value={fmt(stats.count)} />
      <StatRow label="Mean" value={fmt(stats.mean)} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="p25" value={fmt(stats.p25)} />
      <StatRow label="p50" value={fmt(stats.p50)} />
      <StatRow label="p75" value={fmt(stats.p75)} />
    </div>
  )
}

/** Date stats table. */
function DateStatsTable({ stats }: { stats: DateStats }): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <StatRow label="Total" value={fmt(stats.count)} />
      <StatRow label="Mean" value={stats.mean} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="p25" value={stats.p25} />
      <StatRow label="p50" value={stats.p50} />
      <StatRow label="p75" value={stats.p75} />
    </div>
  )
}

/** Categorical frequency table (string/boolean). */
function CategoricalStatsTable({ stats }: { stats: SerializableCategoricalStats }): React.JSX.Element {
  let total = 0
  for (const [, count] of stats) total += count
  return (
    <div className="space-y-0.5">
      <StatRow label="Total" value={fmt(total)} />
      <div className="my-1 border-t border-slate-100" />
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
        {stats.map(([value, count]) => (
          <StatRow key={String(value)} label={String(value)} value={fmt(count)} />
        ))}
      </div>
    </div>
  )
}

/**
 * Statistics content for the selected color property, shown inside
 * the Colors sidebar when a property is selected.
 *
 * @param props - Stats result from the worker and the selected property key.
 * @returns Statistics content element, or null when hidden.
 */
export function StatisticsPanel({ stats, propertyKey }: Props): React.JSX.Element | null {
  if (!propertyKey || !stats) return null

  return (
    <div>
      <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700" title={propertyKey}>{propertyKey}</span>
      {stats.type === 'numeric' && <NumericStatsTable stats={stats.stats} />}
      {stats.type === 'date' && <DateStatsTable stats={stats.stats} />}
      {stats.type === 'categorical' && <CategoricalStatsTable stats={stats.stats} />}
    </div>
  )
}

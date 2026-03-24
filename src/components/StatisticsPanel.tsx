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
      <StatRow label="Count" value={fmt(stats.count)} />
      <StatRow label="Min" value={fmt(stats.min)} />
      <StatRow label="Max" value={fmt(stats.max)} />
      <StatRow label="Mean" value={fmt(stats.mean)} />
      <StatRow label="Median" value={fmt(stats.median)} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="p10" value={fmt(stats.p10)} />
      <StatRow label="p20" value={fmt(stats.p20)} />
      <StatRow label="p25" value={fmt(stats.p25)} />
      <StatRow label="p30" value={fmt(stats.p30)} />
      <StatRow label="p40" value={fmt(stats.p40)} />
      <StatRow label="p50" value={fmt(stats.p50)} />
      <StatRow label="p60" value={fmt(stats.p60)} />
      <StatRow label="p70" value={fmt(stats.p70)} />
      <StatRow label="p75" value={fmt(stats.p75)} />
      <StatRow label="p80" value={fmt(stats.p80)} />
      <StatRow label="p90" value={fmt(stats.p90)} />
    </div>
  )
}

/** Date stats table. */
function DateStatsTable({ stats }: { stats: DateStats }): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <StatRow label="Count" value={fmt(stats.count)} />
      <StatRow label="Min" value={stats.min} />
      <StatRow label="Max" value={stats.max} />
      <StatRow label="Mean" value={stats.mean} />
      <StatRow label="Median" value={stats.median} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="p10" value={stats.p10} />
      <StatRow label="p20" value={stats.p20} />
      <StatRow label="p25" value={stats.p25} />
      <StatRow label="p30" value={stats.p30} />
      <StatRow label="p40" value={stats.p40} />
      <StatRow label="p50" value={stats.p50} />
      <StatRow label="p60" value={stats.p60} />
      <StatRow label="p70" value={stats.p70} />
      <StatRow label="p75" value={stats.p75} />
      <StatRow label="p80" value={stats.p80} />
      <StatRow label="p90" value={stats.p90} />
    </div>
  )
}

/** Categorical frequency table (string/boolean). */
function CategoricalStatsTable({ stats }: { stats: SerializableCategoricalStats }): React.JSX.Element {
  return (
    <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
      {stats.map(([value, count]) => (
        <StatRow key={String(value)} label={String(value)} value={fmt(count)} />
      ))}
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
      <p className="mb-2 truncate text-[10px] text-slate-400" title={propertyKey}>{propertyKey}</p>
      {stats.type === 'numeric' && <NumericStatsTable stats={stats.stats} />}
      {stats.type === 'date' && <DateStatsTable stats={stats.stats} />}
      {stats.type === 'categorical' && <CategoricalStatsTable stats={stats.stats} />}
    </div>
  )
}

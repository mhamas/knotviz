import type { PropertyStatsResult, NumericStats, DateStats, SerializableCategoricalStats, HistogramBucket, DateHistogramBucket } from '../types'
import { StatRow } from '@/components/sidebar'
import { Histogram, type HistogramMarker } from './Histogram'
import { formatNumber } from '../lib/formatNumber'
import { valueToHistogramPercent, dateToHistogramPercent } from '../lib/histogramPercent'

interface Props {
  stats: PropertyStatsResult | null
  propertyKey: string | null
}

/** Format a number for display: up to 2 decimal places, with locale separators. */
function fmt(v: number): string {
  return Number.isInteger(v) ? formatNumber(v) : formatNumber(v, { decimals: 2 })
}

// Stat marker colors from Wong's colorblind-safe 4-class palette —
// the standard "maximally distinct" reference in scientific viz,
// designed so all four hues stay separable under deuteranopia,
// protanopia, and tritanopia. Roughly 120° apart around the hue wheel.
// None collide with the red slider-selection markers used on filter
// histograms.
const COLOR_P25 = '#56B4E9' // sky blue
const COLOR_P50 = '#009E73' // bluish green
const COLOR_P75 = '#E69F00' // orange
const COLOR_MEAN = '#CC79A7' // reddish purple

/** Numeric stats table (number property). */
function NumericStatsTable({ stats, histogram }: { stats: NumericStats; histogram: HistogramBucket[] }): React.JSX.Element {
  const markers: HistogramMarker[] = histogram.length === 0 ? [] : [
    { percent: valueToHistogramPercent(stats.mean, histogram), color: COLOR_MEAN, testId: 'stat-marker-mean' },
    { percent: valueToHistogramPercent(stats.p25, histogram), color: COLOR_P25, testId: 'stat-marker-p25' },
    { percent: valueToHistogramPercent(stats.p50, histogram), color: COLOR_P50, testId: 'stat-marker-p50' },
    { percent: valueToHistogramPercent(stats.p75, histogram), color: COLOR_P75, testId: 'stat-marker-p75' },
  ]
  return (
    <div className="space-y-0.5">
      <StatRow label="Total nodes" value={fmt(stats.count)} />
      <StatRow label="Total value" value={fmt(stats.sum)} />
      <StatRow label="Mean value" value={fmt(stats.mean)} markerColor={COLOR_MEAN} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="min" value={fmt(stats.min)} />
      <StatRow label="p25" value={fmt(stats.p25)} markerColor={COLOR_P25} />
      <StatRow label="p50" value={fmt(stats.p50)} markerColor={COLOR_P50} />
      <StatRow label="p75" value={fmt(stats.p75)} markerColor={COLOR_P75} />
      <StatRow label="max" value={fmt(stats.max)} />
      <Histogram buckets={histogram} markers={markers} />
    </div>
  )
}

/** Date stats table. */
function DateStatsTable({ stats, histogram }: { stats: DateStats; histogram: DateHistogramBucket[] }): React.JSX.Element {
  const markers: HistogramMarker[] = histogram.length === 0 ? [] : [
    { percent: dateToHistogramPercent(stats.mean, histogram), color: COLOR_MEAN, testId: 'stat-marker-mean' },
    { percent: dateToHistogramPercent(stats.p25, histogram), color: COLOR_P25, testId: 'stat-marker-p25' },
    { percent: dateToHistogramPercent(stats.p50, histogram), color: COLOR_P50, testId: 'stat-marker-p50' },
    { percent: dateToHistogramPercent(stats.p75, histogram), color: COLOR_P75, testId: 'stat-marker-p75' },
  ]
  return (
    <div className="space-y-0.5">
      <StatRow label="Total nodes" value={fmt(stats.count)} />
      <StatRow label="Mean value" value={stats.mean} markerColor={COLOR_MEAN} />
      <div className="my-1 border-t border-slate-100" />
      <StatRow label="min" value={stats.min} />
      <StatRow label="p25" value={stats.p25} markerColor={COLOR_P25} />
      <StatRow label="p50" value={stats.p50} markerColor={COLOR_P50} />
      <StatRow label="p75" value={stats.p75} markerColor={COLOR_P75} />
      <StatRow label="max" value={stats.max} />
      <Histogram buckets={histogram} markers={markers} />
    </div>
  )
}

/** Categorical frequency table (string/boolean). */
function CategoricalStatsTable({ stats }: { stats: SerializableCategoricalStats }): React.JSX.Element {
  let total = 0
  for (const [, count] of stats) total += count
  return (
    <div className="space-y-0.5">
      <StatRow label="Total nodes" value={fmt(total)} />
      <StatRow label="Distinct" value={fmt(stats.length)} />
      <div className="my-1 border-t border-slate-100" />
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
        {stats.map(([value, count]) => {
          const pct = total > 0 ? formatNumber((count / total) * 100, { decimals: 1 }) : '0.0'
          return (
            <StatRow
              key={String(value)}
              label={String(value)}
              value={<>{fmt(count)} <span className="ml-2 text-slate-300">({pct}%)</span></>}
            />
          )
        })}
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
      {stats.type === 'numeric' && <NumericStatsTable stats={stats.stats} histogram={stats.histogram} />}
      {stats.type === 'date' && <DateStatsTable stats={stats.stats} histogram={stats.histogram} />}
      {stats.type === 'categorical' && <CategoricalStatsTable stats={stats.stats} />}
    </div>
  )
}

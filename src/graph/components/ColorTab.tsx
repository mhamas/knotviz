import { useState, useRef } from 'react'
import { X, RefreshCw } from 'lucide-react'
import type { ColorGradientState, CustomPalette, FilterMap, FilterState, PropertyMeta, PropertyType, VisualMode } from '@/types'
import type { PropertyColumns } from '@/hooks/useFilterState'
import {
  PALETTE_NAMES,
  interpolateColors,
  isBuiltinPalette,
  getPaletteColors,
} from '@/lib/colorScales'
import { SectionHeading } from '@/components/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { CreatePaletteModal } from './CreatePaletteModal'

interface Props {
  propertyMetas: PropertyMeta[]
  state: ColorGradientState
  propertyColumns: PropertyColumns
  filters: FilterMap
  onChange: (s: ColorGradientState) => void
}

/**
 * Resolve a palette identifier to its color stops for display purposes.
 */
function resolveStops(state: ColorGradientState): string[] {
  let stops: string[]
  if (isBuiltinPalette(state.palette)) {
    stops = getPaletteColors(state.palette, state.customColors)
  } else {
    const custom = state.customPalettes.find((p) => p.id === state.palette)
    stops = custom ? [...custom.colors, ...state.customColors] : getPaletteColors('Viridis', state.customColors)
  }
  return state.isReversed ? [...stops].reverse() : stops
}

/**
 * Get display name for the current palette.
 */
function paletteName(state: ColorGradientState): string {
  if (isBuiltinPalette(state.palette)) return state.palette
  const custom = state.customPalettes.find((p) => p.id === state.palette)
  return custom?.name ?? 'Unknown'
}

/**
 * Color tab: property selector, palette selector with custom palette creation,
 * and a live gradient legend.
 *
 * @param props - Property metas, gradient state, cosmos data, matching nodes, and change handler.
 * @returns Color tab content element.
 */
export function ColorTab({
  propertyMetas,
  state,
  propertyColumns,
  filters,
  onChange,
}: Props): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const sortedMetas = [...propertyMetas].sort((a, b) => a.key.localeCompare(b.key))

  const selectedType = state.propertyKey
    ? propertyMetas.find((m) => m.key === state.propertyKey)?.type
    : null

  const handlePropertyChange = (value: string | null): void => {
    if (value === null) return
    onChange({
      ...state,
      propertyKey: value === '__none__' ? null : value,
    })
  }

  const handlePaletteChange = (value: string | null): void => {
    if (value === null) return
    if (value === '__create_palette__') {
      setIsModalOpen(true)
      return
    }
    onChange({ ...state, palette: value })
  }

  const handleSaveCustomPalette = (palette: CustomPalette): void => {
    onChange({
      ...state,
      palette: palette.id,
      customPalettes: [...state.customPalettes, palette],
    })
  }

  const handleDeleteCustomPalette = (id: string): void => {
    const isActive = state.palette === id
    onChange({
      ...state,
      palette: isActive ? 'Viridis' : state.palette,
      customPalettes: state.customPalettes.filter((p) => p.id !== id),
    })
  }

  const currentStops = resolveStops(state)

  return (
    <div className="flex flex-col gap-4">
      {/* Property selector */}
      <div>
        <SectionHeading>Property</SectionHeading>
        <div className="mt-1.5">
          <Select
            value={state.propertyKey ?? '__none__'}
            onValueChange={handlePropertyChange}
          >
            <SelectTrigger className="w-full" data-testid="color-property-select">
              <span className="flex flex-1 text-left">{state.propertyKey ?? 'None'}</span>
              {state.propertyKey && (
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded p-0.5 text-slate-400 [&_svg]:pointer-events-auto hover:text-slate-700"
                  onPointerDown={(e): void => {
                    e.stopPropagation()
                    e.preventDefault()
                    onChange({ ...state, propertyKey: null })
                  }}
                  aria-label="Clear property"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="__none__">None</SelectItem>
              {sortedMetas.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{m.key}</span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                      {m.type}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mode selector */}
      <div>
        <SectionHeading>Mode</SectionHeading>
        <div className="mt-1.5 flex gap-1" data-testid="visual-mode-selector">
          {(['size', 'color'] as VisualMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`visual-mode-${mode}`}
              onClick={(): void => onChange({ ...state, visualMode: mode })}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                state.visualMode === mode
                  ? 'bg-slate-700 text-white'
                  : 'cursor-pointer bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Log scale toggle — color mode only */}
      {state.visualMode === 'color' && state.propertyKey && (selectedType === 'number' || selectedType === 'date') && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="color-log-toggle"
            onClick={(): void => onChange({ ...state, isLogScale: !state.isLogScale })}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              state.isLogScale
                ? 'bg-slate-700 text-white'
                : 'cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            log
          </button>
          <span className="text-[11px] text-slate-400">
            {state.isLogScale ? 'Logarithmic scale' : 'Linear scale'}
          </span>
        </div>
      )}

      {/* Size range controls — dual-thumb slider + editable inputs */}
      {state.visualMode === 'size' && (
        <div data-testid="size-range-controls">
          <div className="mb-2">
            <span className="text-xs font-medium text-slate-700">Size range</span>
          </div>
          <Slider
            min={0.1}
            max={100}
            step={0.1}
            value={state.sizeRange}
            onValueChange={(v): void => {
              const arr = Array.isArray(v) ? v : [v]
              onChange({ ...state, sizeRange: [arr[0], arr[1] ?? arr[0]] })
            }}
          />
          <div className="mt-1 flex justify-between">
            <SizeInput
              value={state.sizeRange[0]}
              onChange={(v): void => onChange({ ...state, sizeRange: [Math.min(v, state.sizeRange[1]), state.sizeRange[1]] })}
            />
            <SizeInput
              value={state.sizeRange[1]}
              onChange={(v): void => onChange({ ...state, sizeRange: [state.sizeRange[0], Math.max(v, state.sizeRange[0])] })}
              isRight
            />
          </div>
        </div>
      )}

      {/* Palette selector — only for color mode */}
      {state.visualMode === 'color' && <div>
        <SectionHeading>Palette</SectionHeading>
        <div className="mt-1.5">
          <Select value={state.palette} onValueChange={handlePaletteChange}>
            <SelectTrigger className="w-full" data-testid="color-palette-select">
              <span className="flex flex-1 items-center gap-2 text-left">
                <GradientSwatch stops={currentStops} />
                {paletteName(state)}
              </span>
            </SelectTrigger>
            <SelectContent>
              {PALETTE_NAMES.map((name) => {
                const stops = getPaletteColors(name)
                return (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      <GradientSwatch stops={stops} />
                      {name}
                      {stops.length === 2 && (
                        <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium leading-none text-slate-400">
                          binary
                        </span>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
              {state.customPalettes.length > 0 && <SelectSeparator />}
              {state.customPalettes.map((cp) => (
                <SelectItem key={cp.id} value={cp.id}>
                  <span className="flex items-center gap-2">
                    <GradientSwatch stops={cp.colors} />
                    <span className="flex-1">{cp.name}</span>
                    <button
                      type="button"
                      className="ml-1 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      onClick={(e): void => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDeleteCustomPalette(cp.id)
                      }}
                      data-testid={`delete-palette-${cp.id}`}
                      aria-label={`Delete ${cp.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="__create_palette__">
                <span className="text-slate-500">+ Create custom palette</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          onClick={(): void => onChange({ ...state, isReversed: !state.isReversed })}
          data-testid="reverse-palette-btn"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reverse colors
        </button>
      </div>}

      {/* Legend */}
      <div data-testid="color-legend">
        <SectionHeading>Legend</SectionHeading>
        <div className="mt-1.5">
          <ColorLegend
            state={state}
            selectedType={selectedType ?? null}
            propertyColumns={propertyColumns}
            filters={filters}
            stops={currentStops}
          />
        </div>
      </div>

      <CreatePaletteModal
        isOpen={isModalOpen}
        onClose={(): void => setIsModalOpen(false)}
        onSave={handleSaveCustomPalette}
      />
    </div>
  )
}

/** Small horizontal swatch — smooth gradient for 3+ stops, hard split for 2 stops. */
/** Small editable number input for size range values. */
function SizeInput({ value, onChange, isRight }: {
  value: number
  onChange: (v: number) => void
  isRight?: boolean
}): React.JSX.Element {
  const [editing, setEditing] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const isEscapingRef = useRef(false)

  const commit = (raw: string): void => {
    const parsed = parseFloat(raw)
    if (Number.isNaN(parsed) || parsed < 0.1) {
      setEditing(null)
      return
    }
    const clamped = Math.min(Math.max(parsed, 0.1), 100)
    onChange(clamped)
    setEditing(null)
  }

  return (
    <input
      ref={ref}
      type="text"
      data-testid={isRight ? 'size-range-max' : 'size-range-min'}
      className={`w-12 border-b border-transparent bg-transparent text-[11px] text-slate-500 outline-none focus:border-slate-400 ${isRight ? 'text-right' : 'text-left'}`}
      value={editing ?? String(value)}
      onFocus={(e): void => { setEditing(String(value)); e.target.select() }}
      onChange={(e): void => setEditing(e.target.value)}
      onBlur={(): void => {
        if (isEscapingRef.current) { isEscapingRef.current = false; return }
        if (editing !== null) commit(editing)
      }}
      onKeyDown={(e): void => {
        if (e.key === 'Enter') { if (editing !== null) commit(editing); ref.current?.blur() }
        else if (e.key === 'Escape') { isEscapingRef.current = true; setEditing(null); ref.current?.blur() }
      }}
    />
  )
}

function GradientSwatch({ stops }: { stops: string[] }): React.JSX.Element {
  const isBinary = stops.length === 2
  const bg = isBinary
    ? `linear-gradient(to right, ${stops[0]} 50%, ${stops[1]} 50%)`
    : `linear-gradient(to right, ${stops.map((c, i) => `${c} ${(i / (stops.length - 1)) * 100}%`).join(', ')})`
  return (
    <span
      className="inline-block h-3 w-6 shrink-0 rounded-sm"
      style={{ background: bg }}
    />
  )
}

interface LegendProps {
  state: ColorGradientState
  selectedType: PropertyType | null
  propertyColumns: PropertyColumns
  filters: FilterMap
  stops: string[]
}

/** Live legend showing the visual mapping for the selected property. */
function ColorLegend({ state, selectedType, propertyColumns, filters, stops }: LegendProps): React.JSX.Element {
  const modeLabel = state.visualMode === 'color' ? 'colors' : state.visualMode
  if (state.propertyKey === null) {
    return <p className="text-xs italic text-slate-400">Select a property to visualise node {modeLabel}.</p>
  }

  if (!selectedType) {
    return <p className="text-xs italic text-slate-400">No data for selected property.</p>
  }

  const col = propertyColumns[state.propertyKey]
  if (!col || col.length === 0) {
    return <p className="text-xs italic text-slate-400">No data for selected property.</p>
  }

  if (selectedType === 'number' || selectedType === 'date') {
    // Collect values (sample for legend only)
    const values: unknown[] = []
    for (let i = 0; i < col.length; i++) {
      if (col[i] !== undefined) values.push(col[i])
      if (values.length >= 100_000) break // cap for legend perf
    }
    if (values.length === 0) return <p className="text-xs italic text-slate-400">No data for selected property.</p>
    const range = filterContinuousRange(values, selectedType, filters.get(state.propertyKey))
    if (state.visualMode === 'size') return <SizeLegend range={range} />
    return <ContinuousLegend range={range} stops={stops} />
  }

  if (selectedType === 'boolean') {
    const { labels, colorStops } = filterBooleanLegend(filters.get(state.propertyKey), stops)
    return <DiscreteLegend labels={labels} stops={colorStops} />
  }

  // string / string[]: collect distinct values, filtered to active selection if a filter is enabled
  const distinct = new Set<string>()
  for (let i = 0; i < col.length; i++) {
    const v = col[i]
    if (typeof v === 'string') {
      distinct.add(v)
    } else if (Array.isArray(v)) {
      if (typeof v[0] === 'string') distinct.add(v[0])
    }
  }
  const filteredLabels = filterStringLegend(Array.from(distinct).sort(), filters.get(state.propertyKey))
  return <DiscreteLegend labels={filteredLabels} stops={stops} />
}

/** Continuous gradient bar with min/max labels (for number/date). */
function ContinuousLegend({
  range,
  stops,
}: {
  range: { minLabel: string; maxLabel: string; isUniform: boolean }
  stops: string[]
}): React.JSX.Element {
  const { minLabel, maxLabel, isUniform } = range

  if (isUniform) {
    return (
      <p className="text-xs italic text-slate-400" data-testid="color-legend-uniform">
        All nodes have the same value — uniform color applied.
      </p>
    )
  }

  // Build gradient CSS from resolved stops
  const gradientStops = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10
    return `${interpolateColors(stops, t)} ${t * 100}%`
  }).join(', ')

  return (
    <div>
      <div
        className="h-3 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${gradientStops})` }}
        data-testid="color-legend-gradient"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

/** Size legend: small and large circles with min/max labels. */
function SizeLegend({
  range,
}: {
  range: { minLabel: string; maxLabel: string; isUniform: boolean }
}): React.JSX.Element {
  if (range.isUniform) {
    return <p className="text-xs italic text-slate-400" data-testid="color-legend-uniform">All nodes have the same value — uniform size applied.</p>
  }
  return (
    <div data-testid="size-legend">
      <div className="flex items-end justify-between">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
          <span className="text-[10px] text-slate-500">{range.minLabel}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="inline-block h-5 w-5 rounded-full bg-slate-400" />
          <span className="text-[10px] text-slate-500">{range.maxLabel}</span>
        </div>
      </div>
    </div>
  )
}

// ── Exported pure helpers for legend filtering (testable without rendering) ──

/**
 * Compute the visible min/max range for a continuous legend, clamped by an active filter.
 * @param values - Raw data values from the property column.
 * @param type - 'number' or 'date'.
 * @param filter - The filter state for the property, or undefined if none.
 * @returns Min/max labels and whether the range is uniform.
 */
export function filterContinuousRange(
  values: unknown[],
  type: 'number' | 'date',
  filter: FilterState | undefined,
): { minLabel: string; maxLabel: string; isUniform: boolean } {
  let minLabel: string
  let maxLabel: string
  let isUniform = false

  if (type === 'number') {
    const nums = values as number[]
    let min = nums[0]
    let max = nums[0]
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < min) min = nums[i]
      if (nums[i] > max) max = nums[i]
    }
    // Clamp to filter range if active
    if (filter?.type === 'number' && filter.isEnabled) {
      min = Math.max(min, filter.min)
      max = Math.min(max, filter.max)
    }
    isUniform = min === max
    minLabel = String(min)
    maxLabel = String(max)
  } else {
    const sorted = (values as string[]).sort()
    let min = sorted[0]
    let max = sorted[sorted.length - 1]
    // Clamp to filter range if active
    if (filter?.type === 'date' && filter.isEnabled) {
      if (filter.after > min) min = filter.after
      if (filter.before < max) max = filter.before
    }
    isUniform = min === max
    minLabel = min
    maxLabel = max
  }

  return { minLabel, maxLabel, isUniform }
}

/**
 * Filter boolean legend labels based on an active boolean filter.
 * @param filter - The filter state for the property, or undefined if none.
 * @param stops - The palette color stops.
 * @returns Labels and matching color stops for the discrete legend.
 */
export function filterBooleanLegend(
  filter: FilterState | undefined,
  stops: string[],
): { labels: string[]; colorStops: string[] } {
  const isFiltered = filter?.type === 'boolean' && filter.isEnabled
  if (!isFiltered) {
    return { labels: ['false', 'true'], colorStops: [stops[0], stops[stops.length - 1]] }
  }
  return {
    labels: [String(filter.selected)],
    colorStops: [filter.selected ? stops[stops.length - 1] : stops[0]],
  }
}

/**
 * Filter string legend labels based on an active string filter.
 * Empty selectedValues means all values pass (no filtering).
 * @param allLabels - All distinct sorted string values.
 * @param filter - The filter state for the property, or undefined if none.
 * @returns Filtered labels for the discrete legend.
 */
export function filterStringLegend(
  allLabels: string[],
  filter: FilterState | undefined,
): string[] {
  if ((filter?.type === 'string' || filter?.type === 'string[]') && filter.isEnabled && filter.selectedValues.size > 0) {
    return allLabels.filter((v) => filter.selectedValues.has(v))
  }
  return allLabels
}

/** Discrete color chips with labels (for boolean/string). */
function DiscreteLegend({
  labels,
  stops,
}: {
  labels: string[]
  stops: string[]
}): React.JSX.Element {
  return (
    <div className="flex max-h-48 flex-wrap gap-x-3 gap-y-1.5 overflow-y-auto" data-testid="color-legend-discrete">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: stops[i % stops.length] }}
          />
          <span className="text-[10px] text-slate-600">{label}</span>
        </div>
      ))}
    </div>
  )
}

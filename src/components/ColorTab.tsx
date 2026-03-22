import { useState } from 'react'
import type { CosmosGraphData, ColorGradientState, CustomPalette, PropertyMeta, PropertyType } from '@/types'
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
import { CreatePaletteModal } from './CreatePaletteModal'

interface Props {
  propertyMetas: PropertyMeta[]
  state: ColorGradientState
  cosmosData: CosmosGraphData | null
  matchingNodeIds: Set<string>
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
  cosmosData,
  matchingNodeIds,
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

      {/* Palette selector */}
      <div>
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
              {PALETTE_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <GradientSwatch stops={getPaletteColors(name)} />
                    {name}
                  </span>
                </SelectItem>
              ))}
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
                      </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.841v1.255a.75.75 0 0 1-1.5 0V9.14a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5h-1.37l.84.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.024-.274Z" clipRule="evenodd" />
          </svg>
          Reverse colors
        </button>
      </div>

      {/* Legend */}
      <div data-testid="color-legend">
        <SectionHeading>Legend</SectionHeading>
        <div className="mt-1.5">
          <ColorLegend
            state={state}
            selectedType={selectedType ?? null}
            cosmosData={cosmosData}
            matchingNodeIds={matchingNodeIds}
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

/** Small horizontal gradient swatch from an array of color stops. */
function GradientSwatch({ stops }: { stops: string[] }): React.JSX.Element {
  const gradient = stops.map((c, i) => `${c} ${(i / (stops.length - 1)) * 100}%`).join(', ')
  return (
    <span
      className="inline-block h-3 w-6 shrink-0 rounded-sm"
      style={{ background: `linear-gradient(to right, ${gradient})` }}
    />
  )
}

interface LegendProps {
  state: ColorGradientState
  selectedType: PropertyType | null
  cosmosData: CosmosGraphData | null
  matchingNodeIds: Set<string>
  stops: string[]
}

/** Live legend showing the color mapping for the selected property. */
function ColorLegend({ state, selectedType, cosmosData, matchingNodeIds, stops }: LegendProps): React.JSX.Element {
  if (state.propertyKey === null) {
    return <p className="text-xs italic text-slate-400">Select a property to visualise node colors.</p>
  }

  if (!cosmosData || !selectedType) {
    return <p className="text-xs italic text-slate-400">No data for selected property.</p>
  }

  // Collect active node values (properties are on the original NodeInput objects)
  const values: unknown[] = []
  for (const id of matchingNodeIds) {
    const idx = cosmosData.nodeIndexMap.get(id)
    if (idx === undefined) continue
    const value = cosmosData.nodes[idx].properties?.[state.propertyKey]
    if (value !== undefined) {
      values.push(value)
    }
  }

  if (values.length === 0) {
    return <p className="text-xs italic text-slate-400">No data for selected property.</p>
  }

  if (selectedType === 'number' || selectedType === 'date') {
    return <ContinuousLegend values={values} type={selectedType} stops={stops} />
  }

  if (selectedType === 'boolean') {
    return <DiscreteLegend labels={['false', 'true']} stops={[stops[0], stops[stops.length - 1]]} />
  }

  // string
  const distinct = Array.from(new Set(values as string[])).sort()
  return <DiscreteLegend labels={distinct} stops={stops} />
}

/** Continuous gradient bar with min/max labels (for number/date). */
function ContinuousLegend({
  values,
  type,
  stops,
}: {
  values: unknown[]
  type: 'number' | 'date'
  stops: string[]
}): React.JSX.Element {
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
    isUniform = min === max
    minLabel = String(min)
    maxLabel = String(max)
  } else {
    const sorted = (values as string[]).sort()
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    isUniform = min === max
    minLabel = min
    maxLabel = max
  }

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

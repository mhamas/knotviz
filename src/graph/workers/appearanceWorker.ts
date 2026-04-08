/**
 * Web Worker: computes filter matching + gradient colors + node sizes + link colors.
 * Runs the entire heavy appearance pipeline off the main thread.
 */

import type { SerializableFilter } from '../lib/appearanceUtils'
import type { PropertyType, PropertyStatsResult, VisualMode } from '../types'
import { passesFilter, hexToRgbNorm } from '../lib/appearanceUtils'
import { applyGradient } from '../lib/applyGradient'
import { computeFilteredStats } from '../lib/computeStats'

/** Base point size before pointSizeScale is applied by the GPU shader. */
const BASE_POINT_SIZE = 4

interface GradientConfig {
  propertyKey: string | null
  paletteStops: string[]
  propType: string | null
  visualMode: VisualMode
  sizeRange: [number, number]
  isLogScale: boolean
}

// Persistent state: columns sent once on graph load, reused across messages
let storedColumns: Record<string, (number | string | boolean | string[] | undefined)[]> = {}
let storedLinkIndices: Float32Array = new Float32Array(0)

interface InitMessage {
  type: 'init'
  propertyColumns: Record<string, (number | string | boolean | string[] | undefined)[]>
  linkIndices: Float32Array
}

interface UpdateLinksMessage {
  type: 'updateLinks'
  linkIndices: Float32Array
}

interface StatsConfig {
  propertyKey: string | null
  propertyType: PropertyType | null
}

interface UpdateMessage {
  type: 'update'
  nodeCount: number
  filters: Record<string, SerializableFilter>
  gradientConfig: GradientConfig
  statsConfig: StatsConfig
  defaultRgba: [number, number, number, number]
  edgeRgba: [number, number, number, number]
}

// Cache last update params so we can recompute when links change
let lastUpdateParams: UpdateMessage | null = null

self.onmessage = (e: MessageEvent<InitMessage | UpdateLinksMessage | UpdateMessage>): void => {
  const input = e.data

  if (input.type === 'init') {
    storedColumns = input.propertyColumns
    storedLinkIndices = input.linkIndices
    lastUpdateParams = null
    return
  }

  if (input.type === 'updateLinks') {
    storedLinkIndices = input.linkIndices
    // Recompute appearance with new links if we have cached params
    if (lastUpdateParams) {
      computeAppearance(lastUpdateParams)
    }
    return
  }

  lastUpdateParams = input
  computeAppearance(input)
}

function computeAppearance(input: UpdateMessage): void {
  const { nodeCount, filters, gradientConfig, statsConfig, defaultRgba, edgeRgba } = input
  const linkIndices = storedLinkIndices

  // Step 1: Compute matching bitmask
  const enabledFilters: [string, SerializableFilter][] = []
  for (const [key, f] of Object.entries(filters)) {
    if (f.isEnabled) enabledFilters.push([key, f])
  }

  // Convert string filter selectedValues from arrays to Sets for O(1) lookup
  for (const [, f] of enabledFilters) {
    if ((f.type === 'string' || f.type === 'string[]') && f.selectedValues && Array.isArray(f.selectedValues)) {
      f.selectedSet = new Set(f.selectedValues)
    }
  }

  const hasActiveFilters = enabledFilters.length > 0
  const visible = new Uint8Array(nodeCount)

  if (!hasActiveFilters) {
    visible.fill(1)
  } else {
    const columns = enabledFilters.map(([key]) => storedColumns[key])
    for (let i = 0; i < nodeCount; i++) {
      let isPass = true
      for (let f = 0; f < enabledFilters.length; f++) {
        const filter = enabledFilters[f][1]
        const value = columns[f]?.[i]
        if (!passesFilter(value, filter)) {
          isPass = false
          break
        }
      }
      visible[i] = isPass ? 1 : 0
    }
  }

  // Step 2: Build per-node RGBA + sizes
  const pointColors = new Float32Array(nodeCount * 4)
  const pointSizes = new Float32Array(nodeCount)

  const [dr, dg, db, da] = defaultRgba
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const off = i * 4
    pointColors[off] = dr
    pointColors[off + 1] = dg
    pointColors[off + 2] = db
    pointColors[off + 3] = da
    pointSizes[i] = BASE_POINT_SIZE
  }

  // Step 3: Visual mapping (color or size)
  if (gradientConfig.propertyKey && gradientConfig.propType) {
    const col = storedColumns[gradientConfig.propertyKey]
    if (col) {
      const stops = gradientConfig.paletteStops.length > 0
        ? gradientConfig.paletteStops.map(hexToRgbNorm)
        : [[0.5, 0.5, 0.5] as [number, number, number]]
      applyGradient(pointColors, pointSizes, visible, col, gradientConfig.propType, stops, nodeCount, gradientConfig.visualMode, {
        sizeRange: gradientConfig.sizeRange,
        isLogScale: gradientConfig.isLogScale,
      })
    }
  }

  // Step 4: Link colors
  let linkColors: Float32Array
  if (hasActiveFilters) {
    const linkCount = linkIndices.length / 2
    linkColors = new Float32Array(linkCount * 4)
    const [er0, er1, er2, er3] = edgeRgba
    for (let i = 0; i < linkCount; i++) {
      if (visible[linkIndices[i * 2]] && visible[linkIndices[i * 2 + 1]]) {
        const off = i * 4
        linkColors[off] = er0
        linkColors[off + 1] = er1
        linkColors[off + 2] = er2
        linkColors[off + 3] = er3
      }
    }
  } else {
    linkColors = new Float32Array(0)
  }

  // Step 5: Count matching nodes
  let matchingCount = 0
  for (let i = 0; i < nodeCount; i++) {
    if (visible[i]) matchingCount++
  }

  // Step 6: Compute stats for the selected color property over visible nodes
  let stats: PropertyStatsResult | null = null
  if (statsConfig.propertyKey && statsConfig.propertyType) {
    const col = storedColumns[statsConfig.propertyKey]
    if (col) {
      stats = computeFilteredStats(visible, col, statsConfig.propertyType)
    }
  }

  const msg = { pointColors, pointSizes, linkColors, matchingCount, stats, visibleNodes: visible }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)(msg, [
    pointColors.buffer, pointSizes.buffer, linkColors.buffer, visible.buffer,
  ])
}

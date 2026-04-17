/**
 * Web Worker: computes filter matching + gradient colors + node sizes + link colors.
 * Runs the entire heavy appearance pipeline off the main thread.
 */

import type { SerializableFilter } from '../lib/appearanceUtils'
import type { PropertyType, PropertyStatsResult, VisualMode } from '../types'
import { passesFilter, hexToRgbNorm } from '../lib/appearanceUtils'
import { applyGradient } from '../lib/applyGradient'
import { computeFilteredStats } from '../lib/computeStats'
import { matchQuery } from '../lib/matchQuery'
import { applyDimming, computeLinkColors } from '../lib/applyHighlight'

/** Base point size before pointSizeScale is applied by the GPU shader. */
const BASE_POINT_SIZE = 4
/** Alpha multiplier for non-highlighted nodes when a search query is active. */
const HIGHLIGHT_DIM_ALPHA = 0.1

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
/** Per-node lowercased "label id" haystack, built once on init. */
let storedSearchHaystack: string[] = []

interface InitMessage {
  type: 'init'
  propertyColumns: Record<string, (number | string | boolean | string[] | undefined)[]>
  linkIndices: Float32Array
  nodeLabels: (string | undefined)[]
  nodeIds: string[]
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
  /** Substring search; empty string = no highlight mode. */
  searchQuery: string
}

// Cache last update params so we can recompute when links change
let lastUpdateParams: UpdateMessage | null = null

self.onmessage = (e: MessageEvent<InitMessage | UpdateLinksMessage | UpdateMessage>): void => {
  const input = e.data

  if (input.type === 'init') {
    storedColumns = input.propertyColumns
    storedLinkIndices = input.linkIndices
    const { nodeLabels, nodeIds } = input
    const n = nodeIds.length
    storedSearchHaystack = new Array(n)
    for (let i = 0; i < n; i++) {
      const label = nodeLabels[i] ?? ''
      storedSearchHaystack[i] = (label + ' ' + nodeIds[i]).toLowerCase()
    }
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
  const { nodeCount, filters, gradientConfig, statsConfig, defaultRgba, edgeRgba, searchQuery } = input
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

  // Step 4: Highlight (search) pass — dims non-highlighted visible nodes.
  // Applied AFTER gradient (which always writes alpha=1) so dimming wins.
  let highlighted: Uint8Array | null = null
  let highlightedCount: number | null = null
  const lowerQuery = searchQuery.toLowerCase().trim()
  if (lowerQuery.length > 0) {
    highlighted = new Uint8Array(nodeCount)
    matchQuery(lowerQuery, storedSearchHaystack, nodeCount, highlighted)
    // Intersect with the filter mask — filter-hidden nodes must never count as
    // highlighted, and a tightened filter must shrink the displayed match count.
    let visibleMatches = 0
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) highlighted[i] = 0
      else if (highlighted[i]) visibleMatches++
    }
    highlightedCount = visibleMatches
    // Zero-match query: don't dim anything (caller shows "0 matches" text).
    if (visibleMatches > 0) {
      applyDimming(pointColors, visible, highlighted, nodeCount, HIGHLIGHT_DIM_ALPHA)
    } else {
      highlighted = null
    }
  }

  // Step 5: Link colors
  //   - Highlight active: both endpoints filter-visible AND ≥1 highlighted.
  //   - No highlight, filters active: both endpoints filter-visible.
  //   - No highlight, no filters: empty buffer → Cosmos uses its default color.
  let linkColors: Float32Array
  if (hasActiveFilters || highlighted) {
    const linkCount = linkIndices.length / 2
    linkColors = new Float32Array(linkCount * 4)
    computeLinkColors(linkColors, linkIndices, visible, highlighted, linkCount, edgeRgba)
  } else {
    linkColors = new Float32Array(0)
  }

  // Step 6: Count matching nodes
  let matchingCount = 0
  for (let i = 0; i < nodeCount; i++) {
    if (visible[i]) matchingCount++
  }

  // Step 7: Compute stats for the selected color property over visible nodes
  let stats: PropertyStatsResult | null = null
  if (statsConfig.propertyKey && statsConfig.propertyType) {
    const col = storedColumns[statsConfig.propertyKey]
    if (col) {
      stats = computeFilteredStats(visible, col, statsConfig.propertyType)
    }
  }

  // When no filters are active, every node is visible — send `null` instead of
  // an all-1s array. The main thread treats `null` as "no filter mask", which
  // lets the labels overlay take the cosmos GPU sampling fast path (otherwise
  // a non-null mask routes labels through the stride-sampling fallback that
  // doesn't cull off-screen samples gracefully on zoom).
  const visibleNodes = hasActiveFilters ? visible : null
  const msg = { pointColors, pointSizes, linkColors, matchingCount, highlightedCount, stats, visibleNodes }
  const transfer: ArrayBufferLike[] = [pointColors.buffer, pointSizes.buffer, linkColors.buffer]
  if (visibleNodes) transfer.push(visibleNodes.buffer)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)(msg, transfer)
}

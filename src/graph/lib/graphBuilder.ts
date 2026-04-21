import type { PropertyMeta, PropertyValue } from '../types'
import {
  createTypeState,
  isValidPropertyValue,
  resolveType,
  updateTypeState,
  type TypeState,
} from './typeDetection'

export interface GraphBuilderResult {
  nodeCount: number
  edgeCount: number
  linkIndices: Float32Array
  initialPositions: Float32Array | undefined
  positionMode: 'all' | 'partial' | 'none'
  nodeIds: string[]
  nodeLabels: (string | undefined)[]
  edgeSources: Uint32Array
  edgeTargets: Uint32Array
  edgeLabels: (string | undefined)[]
  edgeWeights: Float32Array | undefined
  edgeSortOrder: Uint32Array
  propertyColumns: Record<string, (number | string | boolean | string[] | undefined)[]>
  propertyMetas: PropertyMeta[]
  replacementCount: number
}

export const TYPE_DEFAULTS: Record<string, PropertyValue> = {
  number: 0,
  string: '',
  'string[]': [],
  boolean: false,
  date: '1970-01-01',
}

/**
 * Incremental graph builder: accepts nodes/edges one at a time and produces
 * compact cosmos-ready output on `finalize()`. Used by the loading worker
 * for every input format (JSON, CSV, GraphML, GEXF); also exercised by the
 * large-file test suite so it catches builder-level memory regressions
 * before users do.
 */
export class GraphBuilder {
  nodeIds: string[] = []
  nodeLabels: (string | undefined)[] = []
  nodeIndexMap = new Map<string, number>()
  propertyColumns: Record<string, (PropertyValue | undefined)[]> = {}
  typeStates: Record<string, TypeState> = {}
  xPositions: number[] = []
  yPositions: number[] = []
  hasPosition: boolean[] = []
  nodesWithPositions = 0
  skippedNodes = 0

  edgeSrcIndices: number[] = []
  edgeTgtIndices: number[] = []
  edgeLabelList: (string | undefined)[] = []
  edgeWeightList: number[] = []
  hasAnyWeight = false
  skippedEdges = 0

  addNode(n: Record<string, unknown>): void {
    if (typeof n.id !== 'string' || n.id === '') {
      this.skippedNodes++
      return
    }

    const index = this.nodeIds.length
    this.nodeIds.push(n.id)
    this.nodeIndexMap.set(n.id, index)
    this.nodeLabels.push(typeof n.label === 'string' ? n.label : undefined)

    const hasX = typeof n.x === 'number'
    const hasY = typeof n.y === 'number'
    this.xPositions.push(hasX ? (n.x as number) : 0)
    this.yPositions.push(hasY ? (n.y as number) : 0)
    this.hasPosition.push(hasX && hasY)
    if (hasX && hasY) this.nodesWithPositions++

    if (typeof n.properties === 'object' && n.properties !== null && !Array.isArray(n.properties)) {
      const props = n.properties as Record<string, unknown>
      for (const key of Object.keys(props)) {
        const val = props[key]
        const isNull = val === null || val === undefined
        // null values register the column but do not advance the type state, so
        // an all-null column resolves to the empty-state default ('number') and
        // finalize() backfills every slot with TYPE_DEFAULTS downstream. This
        // is what keeps a declared-but-empty CSV/JSON column visible instead of
        // vanishing from the filter panel.
        if (!isNull && !isValidPropertyValue(val)) continue

        if (!(key in this.propertyColumns)) {
          this.propertyColumns[key] = new Array(index).fill(undefined)
          this.typeStates[key] = createTypeState()
        }
        this.propertyColumns[key].push(isNull ? (undefined as unknown as PropertyValue) : (val as PropertyValue))
        if (!isNull) updateTypeState(this.typeStates[key], val)
      }
    }

    // Pad columns this node didn't have
    for (const key of Object.keys(this.propertyColumns)) {
      if (this.propertyColumns[key].length <= index) {
        this.propertyColumns[key].push(undefined)
      }
    }
  }

  addEdge(e: Record<string, unknown>): void {
    if (typeof e.source !== 'string' || typeof e.target !== 'string') {
      this.skippedEdges++
      return
    }
    const srcIdx = this.nodeIndexMap.get(e.source)
    const tgtIdx = this.nodeIndexMap.get(e.target)
    if (srcIdx === undefined || tgtIdx === undefined) {
      this.skippedEdges++
      return
    }

    this.edgeSrcIndices.push(srcIdx)
    this.edgeTgtIndices.push(tgtIdx)
    this.edgeLabelList.push(typeof e.label === 'string' ? e.label : undefined)
    if (typeof e.weight === 'number') {
      this.edgeWeightList.push(e.weight)
      this.hasAnyWeight = true
    } else {
      this.edgeWeightList.push(0)
    }
  }

  finalize(): GraphBuilderResult {
    const nodeCount = this.nodeIds.length
    if (nodeCount === 0) throw new Error('Graph has no nodes to display')
    if (this.skippedNodes > 0) console.warn(`Skipped ${this.skippedNodes} invalid nodes`)
    if (this.skippedEdges > 0) console.warn(`Skipped ${this.skippedEdges} invalid edges`)

    // Null defaults backfill + type detection
    const propertyMetas: PropertyMeta[] = []
    let replacementCount = 0

    for (const [key, ts] of Object.entries(this.typeStates)) {
      const type = resolveType(ts)
      propertyMetas.push({ key, type })

      const col = this.propertyColumns[key]
      const defaultVal = TYPE_DEFAULTS[type]
      while (col.length < nodeCount) col.push(undefined)
      for (let i = 0; i < col.length; i++) {
        if (col[i] === undefined) {
          col[i] = defaultVal
          replacementCount++
        }
      }
    }

    // Build typed arrays
    const edgeCount = this.edgeSrcIndices.length

    let positionMode: 'all' | 'partial' | 'none'
    if (this.nodesWithPositions === nodeCount) positionMode = 'all'
    else if (this.nodesWithPositions > 0) positionMode = 'partial'
    else positionMode = 'none'

    let initialPositions: Float32Array | undefined
    if (positionMode === 'all') {
      initialPositions = new Float32Array(nodeCount * 2)
      for (let i = 0; i < nodeCount; i++) {
        initialPositions[i * 2] = this.xPositions[i]
        initialPositions[i * 2 + 1] = this.yPositions[i]
      }
    }

    const linkIndices = new Float32Array(edgeCount * 2)
    const edgeSources = new Uint32Array(this.edgeSrcIndices)
    const edgeTargets = new Uint32Array(this.edgeTgtIndices)
    for (let i = 0; i < edgeCount; i++) {
      linkIndices[i * 2] = this.edgeSrcIndices[i]
      linkIndices[i * 2 + 1] = this.edgeTgtIndices[i]
    }

    const edgeWeights = this.hasAnyWeight ? new Float32Array(this.edgeWeightList) : undefined

    // Pre-sort edge indices by weight descending (for edge filtering sliders)
    const edgeSortOrder = new Uint32Array(edgeCount)
    for (let i = 0; i < edgeCount; i++) edgeSortOrder[i] = i
    if (edgeWeights) {
      edgeSortOrder.sort((a, b) => edgeWeights[b] - edgeWeights[a])
    }

    return {
      nodeCount,
      edgeCount,
      linkIndices,
      initialPositions,
      positionMode,
      nodeIds: this.nodeIds,
      nodeLabels: this.nodeLabels,
      edgeSources,
      edgeTargets,
      edgeLabels: this.edgeLabelList,
      edgeWeights,
      edgeSortOrder,
      propertyColumns: this.propertyColumns as Record<string, (number | string | boolean | undefined)[]>,
      propertyMetas,
      replacementCount,
    }
  }
}

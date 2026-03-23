/**
 * Web Worker: loads a JSON graph file off the main thread, builds compact
 * output structures, and transfers them back with zero-copy typed arrays.
 *
 * Protocol:
 * - Input:  { type: 'load', file: File }
 * - Output: { type: 'progress', stage, percent }
 *           { type: 'complete', ...result }
 *           { type: 'error', message }
 *
 * Architecture supports future format adapters by swapping the parser.
 * Currently implements the JSON graph format (version "1").
 *
 * Memory strategy: uses JSON.parse in the worker (separate heap from main thread).
 * After extracting data into compact columnar structures, the parsed object tree
 * is released. Peak memory: ~3× file size, but only in the worker's heap.
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface PropertyMeta {
  key: string
  type: 'number' | 'string' | 'date' | 'boolean'
}

type PropertyValue = number | string | boolean

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

const TYPE_DEFAULTS: Record<string, PropertyValue> = {
  number: 0,
  string: '',
  boolean: false,
  date: '1970-01-01',
}

/** Incremental type detection state per property key. */
interface TypeState {
  nonNullCount: number
  isAllBoolean: boolean
  isAllNumber: boolean
  isAllDate: boolean
}

// ─── Main ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = self.postMessage as any

self.onmessage = async (e: MessageEvent): Promise<void> => {
  const { file } = e.data as { type: 'load'; file: File }

  try {
    post({ type: 'progress', stage: 'Reading file', percent: 0 })
    const text = await file.text()

    post({ type: 'progress', stage: 'Parsing JSON', percent: 25 })
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new Error('Invalid JSON file')
    }
    // Release text string to free ~2× file size of RAM
    // (text variable goes out of scope naturally, but explicitly nulling helps GC)

    post({ type: 'progress', stage: 'Processing graph', percent: 50 })
    const result = processRawGraph(raw)

    post({ type: 'progress', stage: 'Finalizing', percent: 90 })

    const msg = { type: 'complete', ...result }

    // Transfer typed arrays (zero-copy)
    const transferables: ArrayBuffer[] = [
      result.linkIndices.buffer as ArrayBuffer,
      result.edgeSources.buffer as ArrayBuffer,
      result.edgeTargets.buffer as ArrayBuffer,
    ]
    if (result.initialPositions) transferables.push(result.initialPositions.buffer as ArrayBuffer)
    if (result.edgeWeights) transferables.push(result.edgeWeights.buffer as ArrayBuffer)

    post(msg, transferables)
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ─── Graph Processing ─────────────────────────────────────────────────────

interface ProcessResult {
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
  propertyColumns: Record<string, (number | string | boolean | undefined)[]>
  propertyMetas: PropertyMeta[]
  replacementCount: number
}

function processRawGraph(raw: unknown): ProcessResult {
  // ── Structural validation ──
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('File must contain nodes and edges arrays')
  }
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error('File must contain nodes and edges arrays')
  }

  const rawNodes = obj.nodes as unknown[]
  const rawEdges = obj.edges as unknown[]

  if (rawNodes.length === 0) {
    throw new Error('Graph has no nodes to display')
  }

  // ── Process nodes → compact stores + property columns ──
  const nodeIds: string[] = []
  const nodeLabels: (string | undefined)[] = []
  const nodeIndexMap = new Map<string, number>()
  const propertyColumns: Record<string, (PropertyValue | undefined)[]> = {}
  const typeStates: Record<string, TypeState> = {}
  let nodesWithPositions = 0
  const xPositions: number[] = []
  const yPositions: number[] = []
  const hasPosition: boolean[] = []
  let skippedNodes = 0

  for (let i = 0; i < rawNodes.length; i++) {
    const node = rawNodes[i]
    if (typeof node !== 'object' || node === null) { skippedNodes++; continue }
    const n = node as Record<string, unknown>
    if (typeof n.id !== 'string' || n.id === '') { skippedNodes++; continue }

    const index = nodeIds.length
    nodeIds.push(n.id)
    nodeIndexMap.set(n.id, index)
    nodeLabels.push(typeof n.label === 'string' ? n.label : undefined)

    const hasX = typeof n.x === 'number'
    const hasY = typeof n.y === 'number'
    xPositions.push(hasX ? (n.x as number) : 0)
    yPositions.push(hasY ? (n.y as number) : 0)
    hasPosition.push(hasX && hasY)
    if (hasX && hasY) nodesWithPositions++

    // Properties → columnar + type detection
    if (typeof n.properties === 'object' && n.properties !== null && !Array.isArray(n.properties)) {
      const props = n.properties as Record<string, unknown>
      for (const key of Object.keys(props)) {
        const val = props[key]
        if (typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean') continue

        if (!(key in propertyColumns)) {
          propertyColumns[key] = new Array(index).fill(undefined)
          typeStates[key] = { nonNullCount: 0, isAllBoolean: true, isAllNumber: true, isAllDate: true }
        }
        propertyColumns[key].push(val)

        const ts = typeStates[key]
        ts.nonNullCount++
        if (ts.isAllBoolean && typeof val !== 'boolean') ts.isAllBoolean = false
        if (ts.isAllNumber && typeof val !== 'number') ts.isAllNumber = false
        if (ts.isAllDate && !(typeof val === 'string' && ISO_DATE_RE.test(val))) ts.isAllDate = false
      }
    }

    // Pad columns this node didn't have
    for (const key of Object.keys(propertyColumns)) {
      if (propertyColumns[key].length <= index) {
        propertyColumns[key].push(undefined)
      }
    }
  }

  if (nodeIds.length === 0) throw new Error('Graph has no nodes to display')
  if (skippedNodes > 0) console.warn(`Skipped ${skippedNodes} invalid nodes`)

  // ── Process edges → link indices + compact edge stores ──
  const edgeSrcIndices: number[] = []
  const edgeTgtIndices: number[] = []
  const edgeLabelList: (string | undefined)[] = []
  const edgeWeightList: number[] = []
  let hasAnyWeight = false
  let skippedEdges = 0

  for (let i = 0; i < rawEdges.length; i++) {
    const edge = rawEdges[i]
    if (typeof edge !== 'object' || edge === null) { skippedEdges++; continue }
    const e = edge as Record<string, unknown>
    if (typeof e.source !== 'string' || typeof e.target !== 'string') { skippedEdges++; continue }

    const srcIdx = nodeIndexMap.get(e.source)
    const tgtIdx = nodeIndexMap.get(e.target)
    if (srcIdx === undefined || tgtIdx === undefined) { skippedEdges++; continue }

    edgeSrcIndices.push(srcIdx)
    edgeTgtIndices.push(tgtIdx)
    edgeLabelList.push(typeof e.label === 'string' ? e.label : undefined)
    if (typeof e.weight === 'number') {
      edgeWeightList.push(e.weight)
      hasAnyWeight = true
    } else {
      edgeWeightList.push(0)
    }
  }

  if (skippedEdges > 0) console.warn(`Skipped ${skippedEdges} invalid edges`)

  // ── Finalize: null defaults backfill + type detection ──
  const nodeCount = nodeIds.length
  const propertyMetas: PropertyMeta[] = []
  let replacementCount = 0

  for (const [key, ts] of Object.entries(typeStates)) {
    let type: PropertyMeta['type']
    if (ts.nonNullCount === 0) type = 'number'
    else if (ts.isAllBoolean) type = 'boolean'
    else if (ts.isAllNumber) type = 'number'
    else if (ts.isAllDate) type = 'date'
    else type = 'string'
    propertyMetas.push({ key, type })

    const col = propertyColumns[key]
    const defaultVal = TYPE_DEFAULTS[type]
    while (col.length < nodeCount) col.push(undefined)
    for (let i = 0; i < col.length; i++) {
      if (col[i] === undefined) {
        col[i] = defaultVal
        replacementCount++
      }
    }
  }

  // ── Build typed arrays ──
  const edgeCount = edgeSrcIndices.length

  let positionMode: 'all' | 'partial' | 'none'
  if (nodesWithPositions === nodeCount) positionMode = 'all'
  else if (nodesWithPositions > 0) positionMode = 'partial'
  else positionMode = 'none'

  let initialPositions: Float32Array | undefined
  if (positionMode === 'all') {
    initialPositions = new Float32Array(nodeCount * 2)
    for (let i = 0; i < nodeCount; i++) {
      initialPositions[i * 2] = xPositions[i]
      initialPositions[i * 2 + 1] = yPositions[i]
    }
  }

  const linkIndices = new Float32Array(edgeCount * 2)
  for (let i = 0; i < edgeCount; i++) {
    linkIndices[i * 2] = edgeSrcIndices[i]
    linkIndices[i * 2 + 1] = edgeTgtIndices[i]
  }

  return {
    nodeCount,
    edgeCount,
    linkIndices,
    initialPositions,
    positionMode,
    nodeIds,
    nodeLabels,
    edgeSources: new Uint32Array(edgeSrcIndices),
    edgeTargets: new Uint32Array(edgeTgtIndices),
    edgeLabels: edgeLabelList,
    edgeWeights: hasAnyWeight ? new Float32Array(edgeWeightList) : undefined,
    propertyColumns: propertyColumns as Record<string, (number | string | boolean | undefined)[]>,
    propertyMetas,
    replacementCount,
  }
}

/**
 * Web Worker: streams a JSON graph file and builds all output structures
 * incrementally. Never holds the full JSON string or parsed object tree
 * in memory — only the columnar output structures.
 *
 * Protocol:
 * - Input:  { type: 'load', file: File }
 * - Output: { type: 'progress', stage, count, percent }
 *           { type: 'complete', ...StreamedGraphResult }
 *           { type: 'error', message }
 *
 * Architecture supports future format adapters by swapping the parser.
 * Currently implements the JSON graph format (version "1").
 */

import JSONParser from '@streamparser/json/jsonparser.js'

// ─── Types ────────────────────────────────────────────────────────────────

interface PropertyMeta {
  key: string
  type: 'number' | 'string' | 'date' | 'boolean'
}

type PropertyValue = number | string | boolean

/** Incremental type detection state per property key. */
interface TypeState {
  nonNullCount: number
  isAllBoolean: boolean
  isAllNumber: boolean
  isAllDate: boolean
}

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

const TYPE_DEFAULTS: Record<string, PropertyValue> = {
  number: 0,
  string: '',
  boolean: false,
  date: '1970-01-01',
}

// ─── Progress ─────────────────────────────────────────────────────────────

const PROGRESS_INTERVAL = 10_000
let lastProgressCount = 0
let totalBytes = 0
let bytesRead = 0

function postProgress(stage: string, count: number): void {
  if (count - lastProgressCount < PROGRESS_INTERVAL) return
  lastProgressCount = count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)({
    type: 'progress',
    stage,
    count,
    percent: totalBytes > 0 ? Math.round((bytesRead / totalBytes) * 100) : 0,
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent): Promise<void> => {
  const { file } = e.data as { type: 'load'; file: File }
  totalBytes = file.size
  bytesRead = 0
  lastProgressCount = 0

  try {
    const result = await parseJsonGraph(file)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = result as any
    msg.type = 'complete'

    // Transfer typed arrays (zero-copy)
    const transferables = [
      msg.linkIndices.buffer,
      msg.edgeSources.buffer,
      msg.edgeTargets.buffer,
    ].filter(Boolean) as ArrayBuffer[]
    if (msg.initialPositions) transferables.push(msg.initialPositions.buffer)
    if (msg.edgeWeights) transferables.push(msg.edgeWeights.buffer)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(self.postMessage as any)(msg, transferables)
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(self.postMessage as any)({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── JSON Graph Parser ────────────────────────────────────────────────────

interface ParseResult {
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

async function parseJsonGraph(file: File): Promise<ParseResult> {
  // Output accumulators
  const nodeIds: string[] = []
  const nodeLabels: (string | undefined)[] = []
  const nodeXs: number[] = []
  const nodeYs: number[] = []
  const nodeHasPosition: boolean[] = []
  const nodeIndexMap = new Map<string, number>()

  // Property columns (grown dynamically as keys are discovered)
  const propertyColumns: Record<string, (PropertyValue | undefined)[]> = {}
  const typeStates: Record<string, TypeState> = {}

  // Edge accumulators
  const edgeSrcIndices: number[] = []
  const edgeTgtIndices: number[] = []
  const edgeLabelList: (string | undefined)[] = []
  const edgeWeightList: number[] = []
  let hasAnyWeight = false

  let versionSeen = false
  let skippedNodes = 0
  let skippedEdges = 0

  // Set up streaming JSON parser — emit complete objects for nodes.* and edges.*
  const parser = new JSONParser({ paths: ['$.version', '$.nodes.*', '$.edges.*'], keepStack: false })

  parser.onValue = ({ value }): void => {
    // Determine which top-level key we're in from the stack path
    // stack is empty with keepStack=false, but path is encoded differently.
    // With paths filter, we get values at the matched paths.
    // Check which path matched by examining the value context.
    if (typeof value === 'string' && !versionSeen) {
      // Must be $.version
      if (value !== '1') throw new Error('Unsupported schema version')
      versionSeen = true
      return
    }

    // Node or edge — determine by checking if we're still in nodes or edges
    // The parser with paths emits values in document order.
    // We determine context by the presence of 'id' (node) vs 'source'+'target' (edge).
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return

    const obj = value as Record<string, unknown>

    if (typeof obj.id === 'string') {
      // ── Process node ──
      processNode(obj)
    } else if (typeof obj.source === 'string' && typeof obj.target === 'string') {
      // ── Process edge ──
      processEdge(obj)
    }
  }

  function processNode(n: Record<string, unknown>): void {
    const id = n.id as string
    if (!id) { skippedNodes++; return }

    const index = nodeIds.length
    nodeIds.push(id)
    nodeIndexMap.set(id, index)
    nodeLabels.push(typeof n.label === 'string' ? n.label : undefined)

    const hasX = typeof n.x === 'number'
    const hasY = typeof n.y === 'number'
    nodeXs.push(hasX ? (n.x as number) : 0)
    nodeYs.push(hasY ? (n.y as number) : 0)
    nodeHasPosition.push(hasX && hasY)

    // Properties → columnar storage + type detection
    if (typeof n.properties === 'object' && n.properties !== null && !Array.isArray(n.properties)) {
      const props = n.properties as Record<string, unknown>
      for (const key of Object.keys(props)) {
        const val = props[key]
        if (typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean') continue

        // Ensure column exists
        if (!(key in propertyColumns)) {
          // Backfill with undefined for all previous nodes
          propertyColumns[key] = new Array(index).fill(undefined)
          typeStates[key] = { nonNullCount: 0, isAllBoolean: true, isAllNumber: true, isAllDate: true }
        }
        propertyColumns[key].push(val)

        // Update type detection
        const ts = typeStates[key]
        ts.nonNullCount++
        if (ts.isAllBoolean && typeof val !== 'boolean') ts.isAllBoolean = false
        if (ts.isAllNumber && typeof val !== 'number') ts.isAllNumber = false
        if (ts.isAllDate && !(typeof val === 'string' && ISO_DATE_RE.test(val))) ts.isAllDate = false
      }
    }

    // Pad columns that this node didn't have
    for (const key of Object.keys(propertyColumns)) {
      if (propertyColumns[key].length <= index) {
        propertyColumns[key].push(undefined)
      }
    }

    postProgress('Loading nodes', nodeIds.length)
  }

  function processEdge(e: Record<string, unknown>): void {
    const source = e.source as string
    const target = e.target as string
    const srcIdx = nodeIndexMap.get(source)
    const tgtIdx = nodeIndexMap.get(target)

    if (srcIdx === undefined || tgtIdx === undefined) {
      skippedEdges++
      return
    }

    edgeSrcIndices.push(srcIdx)
    edgeTgtIndices.push(tgtIdx)
    edgeLabelList.push(typeof e.label === 'string' ? e.label : undefined)

    if (typeof e.weight === 'number') {
      edgeWeightList.push(e.weight)
      hasAnyWeight = true
    } else {
      edgeWeightList.push(0)
    }

    postProgress('Loading edges', edgeSrcIndices.length)
  }

  // ── Stream the file through the parser ──
  postProgress('Reading file', 0)
  const stream = file.stream()
  const reader = stream.getReader()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    // Decode chunk to string and feed to parser
    const text = new TextDecoder().decode(value, { stream: true })
    parser.write(text)
  }
  parser.end()

  // ── Validation ──
  if (nodeIds.length === 0) throw new Error('Graph has no nodes to display')
  if (skippedNodes > 0) console.warn(`Skipped ${skippedNodes} invalid nodes`)
  if (skippedEdges > 0) console.warn(`Skipped ${skippedEdges} edges referencing unknown node ids`)

  // ── Finalize: null defaults backfill ──
  postProgress('Finalizing', 0)

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

    // Backfill undefined values with type defaults
    const col = propertyColumns[key]
    const defaultVal = TYPE_DEFAULTS[type]
    // Ensure column is padded to full node count
    while (col.length < nodeIds.length) {
      col.push(undefined)
    }
    for (let i = 0; i < col.length; i++) {
      if (col[i] === undefined) {
        col[i] = defaultVal
        replacementCount++
      }
    }
  }

  // ── Build typed arrays ──
  const nodeCount = nodeIds.length
  const edgeCount = edgeSrcIndices.length

  // Position mode
  let posWithPos = 0
  for (let i = 0; i < nodeCount; i++) {
    if (nodeHasPosition[i]) posWithPos++
  }
  let positionMode: 'all' | 'partial' | 'none'
  if (posWithPos === nodeCount) positionMode = 'all'
  else if (posWithPos > 0) positionMode = 'partial'
  else positionMode = 'none'

  let initialPositions: Float32Array | undefined
  if (positionMode === 'all') {
    initialPositions = new Float32Array(nodeCount * 2)
    for (let i = 0; i < nodeCount; i++) {
      initialPositions[i * 2] = nodeXs[i]
      initialPositions[i * 2 + 1] = nodeYs[i]
    }
  }

  // Link indices
  const linkIndices = new Float32Array(edgeCount * 2)
  for (let i = 0; i < edgeCount; i++) {
    linkIndices[i * 2] = edgeSrcIndices[i]
    linkIndices[i * 2 + 1] = edgeTgtIndices[i]
  }

  // Edge compact stores
  const edgeSources = new Uint32Array(edgeSrcIndices)
  const edgeTargets = new Uint32Array(edgeTgtIndices)
  const edgeWeights = hasAnyWeight ? new Float32Array(edgeWeightList) : undefined

  return {
    nodeCount,
    edgeCount,
    linkIndices,
    initialPositions,
    positionMode,
    nodeIds,
    nodeLabels,
    edgeSources,
    edgeTargets,
    edgeLabels: edgeLabelList,
    edgeWeights,
    propertyColumns: propertyColumns as Record<string, (number | string | boolean | undefined)[]>,
    propertyMetas,
    replacementCount,
  }
}

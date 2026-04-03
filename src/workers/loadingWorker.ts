/**
 * Web Worker: loads a JSON graph file off the main thread, builds compact
 * output structures, and transfers them back with zero-copy typed arrays.
 *
 * Uses two loading strategies:
 * - Small files (<200MB): JSON.parse (fast, simple)
 * - Large files (>=200MB): streaming parser (low memory — never holds full JSON in memory)
 *
 * Protocol:
 * - Input:  { type: 'load', file: File }
 * - Output: { type: 'progress', stage, percent }
 *           { type: 'complete', ...result }
 *           { type: 'error', message }
 */

import { parseStreamingJsonGraph } from '../lib/streamingJsonGraphParser'

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

interface TypeState {
  nonNullCount: number
  isAllBoolean: boolean
  isAllNumber: boolean
  isAllDate: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = self.postMessage as any
const yieldWorker = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/** Threshold above which streaming parser is used instead of JSON.parse. */
const STREAMING_THRESHOLD = 200 * 1024 * 1024 // 200MB

// ─── Main ─────────────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent): Promise<void> => {
  const { file } = e.data as { type: 'load'; file: File }

  try {
    let result: ProcessResult

    if (file.size < STREAMING_THRESHOLD) {
      result = await loadWithJsonParse(file)
    } else {
      result = await loadWithStreaming(file)
    }

    const msg = { type: 'complete', ...result }

    const transferables: ArrayBuffer[] = [
      result.linkIndices.buffer as ArrayBuffer,
      result.edgeSources.buffer as ArrayBuffer,
      result.edgeTargets.buffer as ArrayBuffer,
      result.edgeSortOrder.buffer as ArrayBuffer,
    ]
    if (result.initialPositions) transferables.push(result.initialPositions.buffer as ArrayBuffer)
    if (result.edgeWeights) transferables.push(result.edgeWeights.buffer as ArrayBuffer)

    post(msg, transferables)
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ─── Strategy 1: JSON.parse (small/medium files) ─────────────────────────

async function loadWithJsonParse(file: File): Promise<ProcessResult> {
  post({ type: 'progress', stage: 'Reading file…', percent: 0 })
  const text = await file.text()

  post({ type: 'progress', stage: 'Parsing JSON…', percent: 20 })
  await yieldWorker()

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : ''
    if (msg.includes('memory') || msg.includes('allocation')) {
      throw new Error(`File too large to parse (${Math.round(file.size / 1024 / 1024)}MB). Try a smaller graph.`)
    }
    throw new Error('Invalid JSON file')
  }

  post({ type: 'progress', stage: 'Building graph…', percent: 40 })
  await yieldWorker()
  return await processRawGraph(raw)
}

// ─── Strategy 2: Streaming parser (large files) ──────────────────────────

async function loadWithStreaming(file: File): Promise<ProcessResult> {
  const builder = new GraphBuilder()
  const totalBytes = file.size

  post({ type: 'progress', stage: 'Streaming file…', percent: 0 })
  await yieldWorker()

  let nodeCount = 0
  let edgeCount = 0

  // Stream the file directly — never hold the full text in memory.
  // Use File.stream() → ReadableStream<Uint8Array> → TextDecoder → parser
  const stream = file.stream()
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let bytesRead = 0

  async function* textChunks(): AsyncGenerator<string> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        const remaining = decoder.decode(new Uint8Array(0), { stream: false })
        if (remaining) yield remaining
        break
      }
      bytesRead += value.byteLength
      yield decoder.decode(value, { stream: true })
    }
  }

  await parseStreamingJsonGraph(textChunks(), {
    onVersion: (version) => {
      if (version !== '1') throw new Error('Unsupported schema version')
    },
    onNode: (obj) => {
      builder.addNode(obj)
      nodeCount++
      if (nodeCount % 100_000 === 0) {
        const pct = Math.min(80, Math.round((bytesRead / totalBytes) * 80))
        post({ type: 'progress', stage: `Streaming nodes… ${nodeCount.toLocaleString()}`, percent: pct })
      }
    },
    onEdge: (obj) => {
      builder.addEdge(obj)
      edgeCount++
      if (edgeCount % 100_000 === 0) {
        const pct = Math.min(90, Math.round((bytesRead / totalBytes) * 90))
        post({ type: 'progress', stage: `Streaming edges… ${edgeCount.toLocaleString()}`, percent: pct })
      }
    },
    onProgress: (processed) => {
      if (nodeCount === 0 && edgeCount === 0) {
        const pct = Math.round((processed / totalBytes) * 20)
        post({ type: 'progress', stage: 'Streaming file…', percent: pct })
      }
    },
  })

  // Release the text string — the builder has extracted everything into columnar arrays
  // (text goes out of scope when this function returns)

  post({ type: 'progress', stage: 'Finalizing…', percent: 90 })
  await yieldWorker()

  return builder.finalize()
}

// ─── Shared graph building logic ──────────────────────────────────────────

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
  edgeSortOrder: Uint32Array
  maxOutgoingDegree: number
  propertyColumns: Record<string, (number | string | boolean | undefined)[]>
  propertyMetas: PropertyMeta[]
  replacementCount: number
}

/**
 * Incremental graph builder: accepts nodes/edges one at a time,
 * builds compact output structures. Used by both loading strategies.
 */
class GraphBuilder {
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
    if (typeof n.id !== 'string' || n.id === '') { this.skippedNodes++; return }

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
        if (typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean') continue

        if (!(key in this.propertyColumns)) {
          this.propertyColumns[key] = new Array(index).fill(undefined)
          this.typeStates[key] = { nonNullCount: 0, isAllBoolean: true, isAllNumber: true, isAllDate: true }
        }
        this.propertyColumns[key].push(val)

        const ts = this.typeStates[key]
        ts.nonNullCount++
        if (ts.isAllBoolean && typeof val !== 'boolean') ts.isAllBoolean = false
        if (ts.isAllNumber && typeof val !== 'number') ts.isAllNumber = false
        if (ts.isAllDate && !(typeof val === 'string' && ISO_DATE_RE.test(val))) ts.isAllDate = false
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
    if (typeof e.source !== 'string' || typeof e.target !== 'string') { this.skippedEdges++; return }
    const srcIdx = this.nodeIndexMap.get(e.source)
    const tgtIdx = this.nodeIndexMap.get(e.target)
    if (srcIdx === undefined || tgtIdx === undefined) { this.skippedEdges++; return }

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

  finalize(): ProcessResult {
    const nodeCount = this.nodeIds.length
    if (nodeCount === 0) throw new Error('Graph has no nodes to display')
    if (this.skippedNodes > 0) console.warn(`Skipped ${this.skippedNodes} invalid nodes`)
    if (this.skippedEdges > 0) console.warn(`Skipped ${this.skippedEdges} invalid edges`)

    // Null defaults backfill + type detection
    const propertyMetas: PropertyMeta[] = []
    let replacementCount = 0

    for (const [key, ts] of Object.entries(this.typeStates)) {
      let type: PropertyMeta['type']
      if (ts.nonNullCount === 0) type = 'number'
      else if (ts.isAllBoolean) type = 'boolean'
      else if (ts.isAllNumber) type = 'number'
      else if (ts.isAllDate) type = 'date'
      else type = 'string'
      propertyMetas.push({ key, type })

      const col = this.propertyColumns[key]
      const defaultVal = TYPE_DEFAULTS[type]
      while (col.length < nodeCount) col.push(undefined)
      for (let i = 0; i < col.length; i++) {
        if (col[i] === undefined) { col[i] = defaultVal; replacementCount++ }
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

    // Compute max outgoing degree (max outgoing edges from any single node)
    const outDegree = new Uint32Array(nodeCount)
    for (let i = 0; i < edgeCount; i++) {
      outDegree[edgeSources[i]]++
    }
    let maxOutgoingDegree = 0
    for (let i = 0; i < nodeCount; i++) {
      if (outDegree[i] > maxOutgoingDegree) maxOutgoingDegree = outDegree[i]
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
      maxOutgoingDegree,
      propertyColumns: this.propertyColumns as Record<string, (number | string | boolean | undefined)[]>,
      propertyMetas,
      replacementCount,
    }
  }
}

// ─── JSON.parse path: reuses GraphBuilder ─────────────────────────────────

const PROGRESS_BATCH = 100_000

async function processRawGraph(raw: unknown): Promise<ProcessResult> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('File must contain nodes and edges arrays')
  }
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error('File must contain nodes and edges arrays')
  }

  const rawNodes = obj.nodes as unknown[]
  const rawEdges = obj.edges as unknown[]

  if (rawNodes.length === 0) throw new Error('Graph has no nodes to display')

  const builder = new GraphBuilder()

  for (let i = 0; i < rawNodes.length; i++) {
    if (i > 0 && i % PROGRESS_BATCH === 0) {
      post({ type: 'progress', stage: `Processing nodes… ${i.toLocaleString()} / ${rawNodes.length.toLocaleString()}`, percent: 40 + Math.round((i / rawNodes.length) * 25) })
      await yieldWorker()
    }
    const node = rawNodes[i]
    if (typeof node === 'object' && node !== null) {
      builder.addNode(node as Record<string, unknown>)
    }
  }

  for (let i = 0; i < rawEdges.length; i++) {
    if (i > 0 && i % PROGRESS_BATCH === 0) {
      post({ type: 'progress', stage: `Processing edges… ${i.toLocaleString()} / ${rawEdges.length.toLocaleString()}`, percent: 65 + Math.round((i / rawEdges.length) * 25) })
      await yieldWorker()
    }
    const edge = rawEdges[i]
    if (typeof edge === 'object' && edge !== null) {
      builder.addEdge(edge as Record<string, unknown>)
    }
  }

  post({ type: 'progress', stage: 'Finalizing…', percent: 90 })
  await yieldWorker()

  return builder.finalize()
}

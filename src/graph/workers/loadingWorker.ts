/**
 * Web Worker: loads a graph file off the main thread, builds compact
 * output structures, and transfers them back with zero-copy typed arrays.
 *
 * JSON uses two loading strategies:
 * - Small files (<200MB): JSON.parse (fast, simple)
 * - Large files (>=200MB): streaming parser (low memory — never holds full JSON in memory)
 *
 * CSV edge-list, CSV node+edge pair, GraphML, and GEXF are parsed from text via format-specific
 * parsers and then fed into the same GraphBuilder path used by JSON.
 *
 * Protocol:
 * - Input:  { type: 'load', files: File[], format: FileFormat }
 * - Output: { type: 'progress', stage, percent }
 *           { type: 'complete', ...result }
 *           { type: 'error', message }
 */

import type { FileFormat } from '../lib/detectFileFormat'
import type { GraphData } from '../types'
import { GraphBuilder, type GraphBuilderResult } from '../lib/graphBuilder'
import { parseEdgeListCSV } from '../lib/parseEdgeListCSV'
import { parseGEXF } from '../lib/parseGEXF'
import { parseGraphML } from '../lib/parseGraphML'
import { parseNodeEdgeCSV } from '../lib/parseNodeEdgeCSV'
import {
  parseStreamingEdgeListCSV,
  parseStreamingNodeEdgeCSV,
} from '../lib/streamingCsvGraphParser'
import { parseStreamingJsonGraph } from '../lib/streamingJsonGraphParser'

// ─── Helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = self.postMessage as any
const yieldWorker = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/** Threshold above which streaming parser is used instead of JSON.parse. */
const STREAMING_THRESHOLD = 200 * 1024 * 1024 // 200MB

// ─── Main ─────────────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent): Promise<void> => {
  const data = e.data as
    | { type: 'load'; files: File[]; format: FileFormat }
    | { type: 'load'; file: File }

  const files: File[] = 'files' in data ? data.files : [data.file]
  const format: FileFormat = 'format' in data ? data.format : 'json'

  try {
    let result: ProcessResult

    if (format === 'json') {
      const file = files[0]
      if (file.size < STREAMING_THRESHOLD) {
        result = await loadWithJsonParse(file)
      } else {
        result = await loadWithStreaming(file)
      }
    } else {
      result = await loadNonJson(files, format)
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

// ─── Strategy 1b: CSV / GraphML / GEXF ────────────────────────────────────

async function loadNonJson(files: File[], format: FileFormat): Promise<ProcessResult> {
  post({ type: 'progress', stage: 'Reading file…', percent: 0 })

  // CSV paths use a streaming pipeline once the file (or the pair total) crosses
  // the streaming threshold — reading a 500 MB CSV into a string and then again
  // into GraphData would peak around 2 GB. Streaming keeps memory O(built graph).
  try {
    if (format === 'csv-edge-list' && files[0].size >= STREAMING_THRESHOLD) {
      return await loadCsvEdgeListStreaming(files[0])
    }
    if (format === 'csv-pair' && files[0].size + files[1].size >= STREAMING_THRESHOLD) {
      return await loadCsvPairStreaming(files[0], files[1])
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to parse file')
  }

  let graph: GraphData
  try {
    if (format === 'csv-edge-list') {
      const text = await files[0].text()
      post({ type: 'progress', stage: 'Parsing CSV…', percent: 20 })
      await yieldWorker()
      graph = parseEdgeListCSV(text)
    } else if (format === 'csv-pair') {
      const [nodesText, edgesText] = await Promise.all([files[0].text(), files[1].text()])
      post({ type: 'progress', stage: 'Parsing CSV…', percent: 20 })
      await yieldWorker()
      graph = parseNodeEdgeCSV(nodesText, edgesText)
    } else if (format === 'graphml') {
      const text = await files[0].text()
      post({ type: 'progress', stage: 'Parsing GraphML…', percent: 20 })
      await yieldWorker()
      graph = parseGraphML(text)
    } else if (format === 'gexf') {
      const text = await files[0].text()
      post({ type: 'progress', stage: 'Parsing GEXF…', percent: 20 })
      await yieldWorker()
      graph = parseGEXF(text)
    } else {
      throw new Error(`Unsupported format: ${String(format)}`)
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to parse file')
  }

  post({ type: 'progress', stage: 'Building graph…', percent: 40 })
  await yieldWorker()
  return await processRawGraph(graph)
}

// ─── Strategy 1c: streaming CSV (edge-list + pair) ────────────────────────

function fileTextStream(file: File, onBytes: (n: number) => void): AsyncIterable<string> {
  const reader = file.stream().getReader()
  const decoder = new TextDecoder('utf-8')
  return {
    [Symbol.asyncIterator](): AsyncIterator<string> {
      return {
        async next(): Promise<IteratorResult<string>> {
          const { done, value } = await reader.read()
          if (done) return { value: undefined, done: true }
          onBytes(value.byteLength)
          return { value: decoder.decode(value, { stream: true }), done: false }
        },
      }
    },
  }
}

async function loadCsvEdgeListStreaming(file: File): Promise<ProcessResult> {
  const builder = new GraphBuilder()
  const totalBytes = file.size
  let bytesRead = 0
  let edgeCount = 0

  post({ type: 'progress', stage: 'Streaming CSV edges…', percent: 0 })
  await yieldWorker()

  const chunks = fileTextStream(file, (n) => {
    bytesRead += n
  })
  await parseStreamingEdgeListCSV(chunks, {
    onNode: (n) => {
      builder.addNode(n as unknown as Record<string, unknown>)
    },
    onEdge: (e) => {
      builder.addEdge(e as unknown as Record<string, unknown>)
      edgeCount++
      if (edgeCount % 100_000 === 0) {
        const pct = Math.min(90, Math.round((bytesRead / totalBytes) * 90))
        post({
          type: 'progress',
          stage: `Streaming edges… ${edgeCount.toLocaleString()}`,
          percent: pct,
        })
      }
    },
  })

  post({ type: 'progress', stage: 'Finalizing…', percent: 90 })
  await yieldWorker()
  return { ...builder.finalize(), nodePropertiesMetadata: undefined }
}

async function loadCsvPairStreaming(nodesFile: File, edgesFile: File): Promise<ProcessResult> {
  const builder = new GraphBuilder()
  const totalBytes = nodesFile.size + edgesFile.size
  let bytesRead = 0
  let nodeCount = 0
  let edgeCount = 0

  post({ type: 'progress', stage: 'Streaming nodes CSV…', percent: 0 })
  await yieldWorker()

  const nodesChunks = fileTextStream(nodesFile, (n) => {
    bytesRead += n
  })
  const edgesChunks = fileTextStream(edgesFile, (n) => {
    bytesRead += n
  })

  await parseStreamingNodeEdgeCSV(nodesChunks, edgesChunks, {
    onNode: (n) => {
      builder.addNode(n as unknown as Record<string, unknown>)
      nodeCount++
      if (nodeCount % 100_000 === 0) {
        const pct = Math.min(80, Math.round((bytesRead / totalBytes) * 80))
        post({
          type: 'progress',
          stage: `Streaming nodes… ${nodeCount.toLocaleString()}`,
          percent: pct,
        })
      }
    },
    onEdge: (e) => {
      builder.addEdge(e as unknown as Record<string, unknown>)
      edgeCount++
      if (edgeCount % 100_000 === 0) {
        const pct = Math.min(90, Math.round((bytesRead / totalBytes) * 90))
        post({
          type: 'progress',
          stage: `Streaming edges… ${edgeCount.toLocaleString()}`,
          percent: pct,
        })
      }
    },
  })

  post({ type: 'progress', stage: 'Finalizing…', percent: 90 })
  await yieldWorker()
  return { ...builder.finalize(), nodePropertiesMetadata: undefined }
}

// ─── Strategy 2: Streaming parser (large files) ──────────────────────────

async function loadWithStreaming(file: File): Promise<ProcessResult> {
  const builder = new GraphBuilder()
  const totalBytes = file.size

  post({ type: 'progress', stage: 'Streaming file…', percent: 0 })
  await yieldWorker()

  let nodeCount = 0
  let edgeCount = 0
  let metadata: Record<string, { description: string }> | undefined

  // Stream the file directly — never hold the full text in memory.
  // Use File.stream() → ReadableStream<Uint8Array> → TextDecoder → parser
  const stream = file.stream()
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let bytesRead = 0

  async function* textChunks(): AsyncGenerator<string> {
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
    onNodePropertiesMetadata: (m) => {
      metadata = m
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

  return { ...builder.finalize(), nodePropertiesMetadata: metadata }
}

// ─── Worker-level result type ─────────────────────────────────────────────

type ProcessResult = GraphBuilderResult & {
  nodePropertiesMetadata: Record<string, { description: string }> | undefined
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
  const rawMetadata = obj.nodePropertiesMetadata as Record<string, { description: string }> | undefined

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

  return { ...builder.finalize(), nodePropertiesMetadata: rawMetadata }
}

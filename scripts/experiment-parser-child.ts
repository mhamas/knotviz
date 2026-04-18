/**
 * Child process that parses a single graph file and writes a result JSON to stdout.
 *
 * Invoked by `scripts/experiment-large-sizes.mjs` with:
 *   FORMAT = json | csv-edge-list | csv-pair | graphml | gexf
 *   FILE = path to file (or nodes file for csv-pair)
 *   EDGES_FILE = path to edges file (csv-pair only)
 *
 * Exits 0 with JSON on stdout when parsing succeeds; exits non-zero (possibly
 * after an OOM with no output) when it fails. The wrapper treats either shape
 * as a signal.
 */

import fs from 'node:fs'
import { parseGEXF } from '../src/graph/lib/parseGEXF'
import { parseGraphML } from '../src/graph/lib/parseGraphML'
import {
  parseStreamingEdgeListCSV,
  parseStreamingNodeEdgeCSV,
} from '../src/graph/lib/streamingCsvGraphParser'
import { parseStreamingJsonGraph } from '../src/graph/lib/streamingJsonGraphParser'

async function* fileChunks(filePath: string): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1 << 20 })
  for await (const chunk of stream) yield chunk as string
}

const format = process.env.FORMAT ?? ''
const file = process.env.FILE ?? ''
const edgesFile = process.env.EDGES_FILE ?? ''

if (!format || !file) {
  console.error('Missing FORMAT or FILE env var')
  process.exit(2)
}

let peakHeapMB = 0
let peakRssMB = 0
const pollInterval = setInterval(() => {
  const mu = process.memoryUsage()
  const heapMB = mu.heapUsed / 1024 / 1024
  const rssMB = mu.rss / 1024 / 1024
  if (heapMB > peakHeapMB) peakHeapMB = heapMB
  if (rssMB > peakRssMB) peakRssMB = rssMB
}, 200)

async function main(): Promise<{ nodeCount: number; edgeCount: number }> {
  let nodeCount = 0
  let edgeCount = 0

  switch (format) {
    case 'json':
      await parseStreamingJsonGraph(fileChunks(file), {
        onVersion: () => {},
        onNode: () => {
          nodeCount++
        },
        onEdge: () => {
          edgeCount++
        },
        onNodePropertiesMetadata: () => {},
        onProgress: () => {},
      })
      break
    case 'csv-edge-list':
      await parseStreamingEdgeListCSV(fileChunks(file), {
        onNode: () => {
          nodeCount++
        },
        onEdge: () => {
          edgeCount++
        },
      })
      break
    case 'csv-pair':
      if (!edgesFile) throw new Error('csv-pair requires EDGES_FILE')
      await parseStreamingNodeEdgeCSV(fileChunks(file), fileChunks(edgesFile), {
        onNode: () => {
          nodeCount++
        },
        onEdge: () => {
          edgeCount++
        },
      })
      break
    case 'graphml': {
      const text = fs.readFileSync(file, 'utf8')
      const g = parseGraphML(text)
      nodeCount = g.nodes.length
      edgeCount = g.edges.length
      break
    }
    case 'gexf': {
      const text = fs.readFileSync(file, 'utf8')
      const g = parseGEXF(text)
      nodeCount = g.nodes.length
      edgeCount = g.edges.length
      break
    }
    default:
      throw new Error(`Unknown format: ${format}`)
  }
  return { nodeCount, edgeCount }
}

const start = Date.now()
main()
  .then((counts) => {
    clearInterval(pollInterval)
    const elapsedMs = Date.now() - start
    process.stdout.write(
      JSON.stringify({
        ok: true,
        nodeCount: counts.nodeCount,
        edgeCount: counts.edgeCount,
        elapsedMs,
        peakHeapMB: Math.round(peakHeapMB),
        peakRssMB: Math.round(peakRssMB),
      }),
    )
    process.exit(0)
  })
  .catch((err: unknown) => {
    clearInterval(pollInterval)
    const elapsedMs = Date.now() - start
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        elapsedMs,
        peakHeapMB: Math.round(peakHeapMB),
        peakRssMB: Math.round(peakRssMB),
      }),
    )
    process.exit(1)
  })

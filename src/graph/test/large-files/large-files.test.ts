/**
 * Large-file parser tests.
 *
 * Generates each format at each requested size, runs the production parser against it,
 * verifies counts are correct, and deletes the file. Files are written to and removed
 * from a temp subdirectory so the test leaves zero footprint behind.
 *
 * Scope is intentionally narrow: **valid files only**. The structural / malformation
 * cases are covered cheaply in the normal unit suite (parseCSVRows, parseEdgeListCSV,
 * parseGraphML, parseGEXF, etc.). What these tests actually exercise is "does the
 * parser handle multi-GB inputs without OOM or data loss" — that story only needs the
 * valid side.
 *
 * Not part of the default unit project — runs only via `npm run test:large-graphs`.
 * Each format has its own size ladder ending at the empirical ceiling (see
 * `DEFAULT_SIZES_PER_FORMAT` below). A full sweep is 30 tests and takes ~8–12
 * minutes on an M-series Mac. The wrapper sets `--max-old-space-size=4096`
 * to mirror real browser-tab conditions — ceilings found here match what
 * users will hit in production.
 *
 * Pass `--sizes=N[,N,...]` to the wrapper to override the per-format ladders
 * with one common list — useful for targeted reruns:
 *   `npm run test:large-graphs -- --sizes=15000000`    (just the ceiling row)
 *   `npm run test:large-graphs -- --sizes=10000,100000` (quick smoke)
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { GraphBuilder } from '../../lib/graphBuilder'
import { parseGraphML } from '../../lib/parseGraphML'
import { parseGEXF } from '../../lib/parseGEXF'
import {
  parseStreamingEdgeListCSV,
  parseStreamingNodeEdgeCSV,
} from '../../lib/streamingCsvGraphParser'
import { parseStreamingJsonGraph } from '../../lib/streamingJsonGraphParser'
import type { NodeInput, EdgeInput } from '../../types'
import { genJson, genCsvEdgeList, genCsvPair, genGraphML, genGexf } from './generators'

// Per-format size ladders that climb to the empirical ceiling measured at a
// browser-realistic 4 GB heap, running the FULL worker pipeline (parser →
// GraphBuilder.addNode/addEdge → finalize). That pipeline is what actually
// blows up in production — the parser alone fits far higher sizes than the
// builder does.
//
// Memory cost at ceiling per format (peak heap during finalize):
//   JSON @ 10M:          ~3 GB (4 property columns + Map + edge typed arrays)
//   CSV edge-list @ 10M: ~1.5 GB (no property columns, lighter)
//   CSV pair @ 5M:       ~1.8 GB (property columns double up over JSON's baseline)
//   GraphML @ 1M:        ~2 GB (fast-xml-parser DOM + builder)
//   GEXF @ 1.5M:         ~2 GB (same)
//
// Past these sizes we've observed "JavaScript heap out of memory" OOMs that
// kill the vitest worker process — matching the "Aw, Snap!" Chrome renderer
// crash users hit with the same file. CSV pair tops out lower than JSON
// despite the same parser because the downstream GraphBuilder has to hold
// the full property columns (~250 MB per typed property at 10M) alongside
// the Map and edge arrays.
const DEFAULT_SIZES_PER_FORMAT: Record<string, number[]> = {
  json: [10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000],
  'csv-edge-list': [10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000],
  'csv-pair': [10_000, 100_000, 500_000, 1_000_000, 5_000_000],
  graphml: [10_000, 100_000, 500_000, 1_000_000],
  gexf: [10_000, 100_000, 500_000, 1_000_000, 1_500_000],
}

const overrideSizes = process.env.SIZES
  ? process.env.SIZES.split(',').map((s) => Number(s))
  : null

const TEMP_DIR = path.join(os.tmpdir(), 'knotviz-large-file-tests')
fs.mkdirSync(TEMP_DIR, { recursive: true })

const humanSize = (n: number): string => {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

function cleanup(...files: string[]): void {
  for (const f of files) {
    try {
      fs.unlinkSync(f)
    } catch {
      // File already absent — fine.
    }
  }
}

async function* fileChunks(filePath: string): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1 << 20 })
  for await (const chunk of stream) yield chunk as string
}

/**
 * The worker feeds parsed nodes/edges into a `GraphBuilder` and then calls
 * `finalize()` to produce the typed-array payload cosmos consumes. The
 * builder is where the real memory cost lives (nodeIndexMap, edgeSrcIndices,
 * all the Float32Arrays allocated in finalize). Tests run the exact same
 * pipeline so a regression that would OOM the browser surfaces here too.
 */
async function loadJsonFull(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  const builder = new GraphBuilder()
  await parseStreamingJsonGraph(fileChunks(filePath), {
    onVersion: () => {},
    onNode: (n) => builder.addNode(n),
    onEdge: (e) => builder.addEdge(e),
    onNodePropertiesMetadata: () => {},
    onProgress: () => {},
  })
  const result = builder.finalize()
  return { nodeCount: result.nodeCount, edgeCount: result.edgeCount }
}

async function loadEdgeListFull(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  const builder = new GraphBuilder()
  await parseStreamingEdgeListCSV(fileChunks(filePath), {
    onNode: (n) => builder.addNode(n as unknown as Record<string, unknown>),
    onEdge: (e) => builder.addEdge(e as unknown as Record<string, unknown>),
  })
  const result = builder.finalize()
  return { nodeCount: result.nodeCount, edgeCount: result.edgeCount }
}

async function loadPairFull(
  nodesPath: string,
  edgesPath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  const builder = new GraphBuilder()
  await parseStreamingNodeEdgeCSV(fileChunks(nodesPath), fileChunks(edgesPath), {
    onNode: (n) => builder.addNode(n as unknown as Record<string, unknown>),
    onEdge: (e) => builder.addEdge(e as unknown as Record<string, unknown>),
  })
  const result = builder.finalize()
  return { nodeCount: result.nodeCount, edgeCount: result.edgeCount }
}

async function loadGraphMLFull(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  const text = fs.readFileSync(filePath, 'utf8')
  const g = parseGraphML(text)
  return feedBuilder(g.nodes, g.edges)
}

async function loadGexfFull(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  const text = fs.readFileSync(filePath, 'utf8')
  const g = parseGEXF(text)
  return feedBuilder(g.nodes, g.edges)
}

function feedBuilder(
  nodes: NodeInput[],
  edges: EdgeInput[],
): { nodeCount: number; edgeCount: number } {
  const builder = new GraphBuilder()
  for (const n of nodes) builder.addNode(n as unknown as Record<string, unknown>)
  for (const e of edges) builder.addEdge(e as unknown as Record<string, unknown>)
  const result = builder.finalize()
  return { nodeCount: result.nodeCount, edgeCount: result.edgeCount }
}

function sizesFor(format: string): number[] {
  if (overrideSizes) return overrideSizes
  return DEFAULT_SIZES_PER_FORMAT[format] ?? []
}

describe.sequential('json', () => {
  for (const size of sizesFor('json')) {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)
    it(
      `json — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `json-${tag}.json`)
        try {
          await genJson(file, size, false)
          const { nodeCount, edgeCount } = await loadJsonFull(file)
          expect(nodeCount).toBe(size)
          expect(edgeCount).toBe(expectedEdges)
        } finally {
          cleanup(file)
        }
      },
    )
  }
})

describe.sequential('csv-edge-list', () => {
  for (const size of sizesFor('csv-edge-list')) {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)
    it(
      `csv-edge-list — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `csv-edge-list-${tag}.csv`)
        try {
          await genCsvEdgeList(file, size, false)
          const { nodeCount, edgeCount } = await loadEdgeListFull(file)
          expect(edgeCount).toBe(expectedEdges)
          // Nodes auto-derived from the union of source+target ids — usually very
          // close to `size` with random drawing, never higher.
          expect(nodeCount).toBeGreaterThan(size * 0.9)
          expect(nodeCount).toBeLessThanOrEqual(size)
        } finally {
          cleanup(file)
        }
      },
    )
  }
})

describe.sequential('csv-pair', () => {
  for (const size of sizesFor('csv-pair')) {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)
    it(
      `csv-pair — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const nodesFile = path.join(TEMP_DIR, `csv-pair-${tag}-nodes.csv`)
        const edgesFile = path.join(TEMP_DIR, `csv-pair-${tag}-edges.csv`)
        try {
          await genCsvPair(nodesFile, edgesFile, size, false)
          const { nodeCount, edgeCount } = await loadPairFull(nodesFile, edgesFile)
          expect(nodeCount).toBe(size)
          expect(edgeCount).toBe(expectedEdges)
        } finally {
          cleanup(nodesFile, edgesFile)
        }
      },
    )
  }
})

describe.sequential('graphml', () => {
  for (const size of sizesFor('graphml')) {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)
    it(
      `graphml — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `graphml-${tag}.graphml`)
        try {
          await genGraphML(file, size, false)
          const { nodeCount, edgeCount } = await loadGraphMLFull(file)
          expect(nodeCount).toBe(size)
          expect(edgeCount).toBe(expectedEdges)
        } finally {
          cleanup(file)
        }
      },
    )
  }
})

describe.sequential('gexf', () => {
  for (const size of sizesFor('gexf')) {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)
    it(
      `gexf — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `gexf-${tag}.gexf`)
        try {
          await genGexf(file, size, false)
          const { nodeCount, edgeCount } = await loadGexfFull(file)
          expect(nodeCount).toBe(size)
          expect(edgeCount).toBe(expectedEdges)
        } finally {
          cleanup(file)
        }
      },
    )
  }
})

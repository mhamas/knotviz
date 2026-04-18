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
 * minutes on an M-series Mac with `--max-old-space-size=16384` (set by the
 * wrapper).
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
import { parseGraphML } from '../../lib/parseGraphML'
import { parseGEXF } from '../../lib/parseGEXF'
import {
  parseStreamingEdgeListCSV,
  parseStreamingNodeEdgeCSV,
} from '../../lib/streamingCsvGraphParser'
import { parseStreamingJsonGraph } from '../../lib/streamingJsonGraphParser'
import { genJson, genCsvEdgeList, genCsvPair, genGraphML, genGexf } from './generators'

// Per-format size ladders that climb to the empirical ceiling measured at a
// browser-realistic 4 GB heap:
//   JSON / CSV edge-list / CSV pair: ~15M nodes (V8 Set/Map 2^24 cap)
//   GraphML: ~1M nodes (fast-xml-parser DOM in RAM)
//   GEXF: ~1.5M nodes (same)
// The largest file per format sits right at the ceiling so regressions that
// would hurt real users surface here first.
const DEFAULT_SIZES_PER_FORMAT: Record<string, number[]> = {
  json: [10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 15_000_000],
  'csv-edge-list': [10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 15_000_000],
  'csv-pair': [10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 15_000_000],
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

async function loadJsonStreaming(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  let nodeCount = 0
  let edgeCount = 0
  await parseStreamingJsonGraph(fileChunks(filePath), {
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
  return { nodeCount, edgeCount }
}

async function loadEdgeListStreaming(
  filePath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  let nodeCount = 0
  let edgeCount = 0
  await parseStreamingEdgeListCSV(fileChunks(filePath), {
    onNode: () => {
      nodeCount++
    },
    onEdge: () => {
      edgeCount++
    },
  })
  return { nodeCount, edgeCount }
}

async function loadPairStreaming(
  nodesPath: string,
  edgesPath: string,
): Promise<{ nodeCount: number; edgeCount: number }> {
  let nodeCount = 0
  let edgeCount = 0
  await parseStreamingNodeEdgeCSV(fileChunks(nodesPath), fileChunks(edgesPath), {
    onNode: () => {
      nodeCount++
    },
    onEdge: () => {
      edgeCount++
    },
  })
  return { nodeCount, edgeCount }
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
          const { nodeCount, edgeCount } = await loadJsonStreaming(file)
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
          const { nodeCount, edgeCount } = await loadEdgeListStreaming(file)
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
          const { nodeCount, edgeCount } = await loadPairStreaming(nodesFile, edgesFile)
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
          const text = fs.readFileSync(file, 'utf8')
          const g = parseGraphML(text)
          expect(g.version).toBe('1')
          expect(g.nodes.length).toBe(size)
          expect(g.edges.length).toBe(expectedEdges)
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
          const text = fs.readFileSync(file, 'utf8')
          const g = parseGEXF(text)
          expect(g.version).toBe('1')
          expect(g.nodes.length).toBe(size)
          expect(g.edges.length).toBe(expectedEdges)
        } finally {
          cleanup(file)
        }
      },
    )
  }
})

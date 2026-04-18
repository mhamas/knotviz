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
 * A full sweep (5 sizes × 5 formats = 25 tests) takes ~10 min on an M-series Mac and
 * needs a generous Node heap (`--max-old-space-size=16384`).
 *
 * Defaults to all five sizes. Filter via the wrapper's --sizes flag, e.g.
 *   `npm run test:large-graphs -- --sizes=10000,100000`
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

const DEFAULT_SIZES = [10_000, 100_000, 500_000, 1_000_000, 3_000_000]
const sizes = process.env.SIZES
  ? process.env.SIZES.split(',').map((s) => Number(s))
  : DEFAULT_SIZES

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

for (const size of sizes) {
  describe.sequential(`${humanSize(size)} nodes`, () => {
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
  })
}

/**
 * Large-file parser tests.
 *
 * Generates each format at each requested size, runs the production parser against it,
 * verifies result (or expected error), and deletes the file. Files are written to and
 * removed from a temp subdirectory so the test leaves zero footprint behind.
 *
 * Not part of the default unit project — runs only via `npm run test:large-graphs`.
 * Expensive: a full run (5 sizes × 5 formats × 2 validities = 50 tests) takes ~20–30
 * minutes on an M-series Mac and needs ~8GB of free disk + a generous Node heap
 * (`--max-old-space-size=16384`).
 *
 * Filter sizes with SIZES env var, e.g. `SIZES=10000,100000 npm run test:large-graphs`.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseEdgeListCSV } from '../../lib/parseEdgeListCSV'
import { parseNodeEdgeCSV } from '../../lib/parseNodeEdgeCSV'
import { parseGraphML } from '../../lib/parseGraphML'
import { parseGEXF } from '../../lib/parseGEXF'
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

for (const size of sizes) {
  describe.sequential(`${humanSize(size)} nodes`, () => {
    const tag = humanSize(size)
    const expectedEdges = Math.floor(size * 1.5)

    it(
      `valid json — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `valid-json-${tag}.json`)
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
      `invalid json — ${tag}`,
      { timeout: 600_000 },
      async () => {
        // The streaming parser intentionally silently skips items whose per-item
        // JSON.parse fails (so a single bad node doesn't sink a big graph).
        // Our invalid generator breaks every node, leaving zero parseable nodes —
        // downstream code reports "Graph has no nodes to display", but the parser
        // itself doesn't throw. Accept either outcome: threw, or produced zero nodes.
        const file = path.join(TEMP_DIR, `invalid-json-${tag}.json`)
        try {
          await genJson(file, size, true)
          let threw = false
          let nodeCount = -1
          try {
            const r = await loadJsonStreaming(file)
            nodeCount = r.nodeCount
          } catch {
            threw = true
          }
          expect(threw || nodeCount === 0).toBe(true)
        } finally {
          cleanup(file)
        }
      },
    )

    it(
      `valid csv-edge-list — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `valid-csv-edge-list-${tag}.csv`)
        try {
          await genCsvEdgeList(file, size, false)
          const text = fs.readFileSync(file, 'utf8')
          const g = parseEdgeListCSV(text)
          expect(g.version).toBe('1')
          expect(g.edges.length).toBe(expectedEdges)
          // Nodes are auto-derived from the union of source+target ids;
          // it's almost always close to `size` but not guaranteed to hit exactly.
          expect(g.nodes.length).toBeGreaterThan(size * 0.9)
          expect(g.nodes.length).toBeLessThanOrEqual(size)
        } finally {
          cleanup(file)
        }
      },
    )

    it(
      `invalid csv-edge-list — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `invalid-csv-edge-list-${tag}.csv`)
        try {
          await genCsvEdgeList(file, size, true)
          const text = fs.readFileSync(file, 'utf8')
          expect(() => parseEdgeListCSV(text)).toThrow(/source/)
        } finally {
          cleanup(file)
        }
      },
    )

    it(
      `valid csv-pair — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const nodesFile = path.join(TEMP_DIR, `valid-csv-pair-${tag}-nodes.csv`)
        const edgesFile = path.join(TEMP_DIR, `valid-csv-pair-${tag}-edges.csv`)
        try {
          await genCsvPair(nodesFile, edgesFile, size, false)
          const nodesText = fs.readFileSync(nodesFile, 'utf8')
          const edgesText = fs.readFileSync(edgesFile, 'utf8')
          const g = parseNodeEdgeCSV(nodesText, edgesText)
          expect(g.version).toBe('1')
          expect(g.nodes.length).toBe(size)
          // Some edges may reference ids that happen to collide post-generation;
          // with random ids and size=N the overlap is zero so this is an exact match.
          expect(g.edges.length).toBe(expectedEdges)
        } finally {
          cleanup(nodesFile, edgesFile)
        }
      },
    )

    it(
      `invalid csv-pair — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const nodesFile = path.join(TEMP_DIR, `invalid-csv-pair-${tag}-nodes.csv`)
        const edgesFile = path.join(TEMP_DIR, `invalid-csv-pair-${tag}-edges.csv`)
        try {
          await genCsvPair(nodesFile, edgesFile, size, true)
          const nodesText = fs.readFileSync(nodesFile, 'utf8')
          const edgesText = fs.readFileSync(edgesFile, 'utf8')
          expect(() => parseNodeEdgeCSV(nodesText, edgesText)).toThrow(/id/)
        } finally {
          cleanup(nodesFile, edgesFile)
        }
      },
    )

    it(
      `valid graphml — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `valid-graphml-${tag}.graphml`)
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
      `invalid graphml — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `invalid-graphml-${tag}.graphml`)
        try {
          await genGraphML(file, size, true)
          const text = fs.readFileSync(file, 'utf8')
          expect(() => parseGraphML(text)).toThrow(/graphml/)
        } finally {
          cleanup(file)
        }
      },
    )

    it(
      `valid gexf — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `valid-gexf-${tag}.gexf`)
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

    it(
      `invalid gexf — ${tag}`,
      { timeout: 600_000 },
      async () => {
        const file = path.join(TEMP_DIR, `invalid-gexf-${tag}.gexf`)
        try {
          await genGexf(file, size, true)
          const text = fs.readFileSync(file, 'utf8')
          expect(() => parseGEXF(text)).toThrow(/gexf/)
        } finally {
          cleanup(file)
        }
      },
    )
  })
}

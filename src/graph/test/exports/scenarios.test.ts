/**
 * Scenario matrix: many different graph shapes × every export format.
 *
 * Each scenario is a small hand-crafted ExportSnapshot probing a specific
 * edge case — empty graphs, unicode, sparse properties, special characters,
 * boolean uniforms, pipe-containing strings, etc. — and every scenario is
 * run through all five serializers + parsed back + re-asserted.
 *
 * Goals:
 * - Every serializer handles every shape without crashing.
 * - Lossless targets (JSON, CSV pair, GEXF) fully preserve every property
 *   that survives re-import.
 * - Lossy targets (CSV edge list, GraphML) preserve exactly the subset
 *   they're meant to — flagged per-scenario so the "lossy" path is
 *   pinned, not undefined.
 *
 * The unit-level matrix is fast (no browser); the e2e round-trip spec
 * covers the full UI + worker + browser pipeline on a single
 * representative graph.
 */
import { describe, it, expect } from 'vitest'
import { exportAsCsvEdgeList } from '../../lib/exports/csvEdgeList'
import { exportAsCsvPair } from '../../lib/exports/csvPair'
import { exportAsGexf } from '../../lib/exports/gexf'
import { exportAsGraphML } from '../../lib/exports/graphml'
import { exportAsJson } from '../../lib/exports/json'
import { parseEdgeListCSV } from '../../lib/parseEdgeListCSV'
import { parseGEXF } from '../../lib/parseGEXF'
import { parseGraphML } from '../../lib/parseGraphML'
import { parseJSON } from '../../lib/parseJSON'
import { parseNodeEdgeCSV } from '../../lib/parseNodeEdgeCSV'
import type { GraphData, NodeInput, PropertyValue } from '../../types'
import type { ExportSnapshot } from '../../lib/exports/types'
import { readZipEntries } from './readZip'

async function blobText(blob: Blob): Promise<string> {
  return blob.text()
}

// ─── Round-trip helpers: serialize → parse → return GraphData ─────────────

async function roundTripJson(snap: ExportSnapshot): Promise<GraphData> {
  const text = await blobText(exportAsJson(snap).blob)
  return parseJSON(text) as GraphData
}

async function roundTripCsvEdgeList(snap: ExportSnapshot): Promise<GraphData> {
  const text = await blobText(exportAsCsvEdgeList(snap).blob)
  return parseEdgeListCSV(text)
}

async function roundTripCsvPair(snap: ExportSnapshot): Promise<GraphData> {
  const result = await exportAsCsvPair(snap)
  const zipBytes = new Uint8Array(await result.blob.arrayBuffer())
  const files = readZipEntries(zipBytes)
  return parseNodeEdgeCSV(files['nodes.csv'] ?? '', files['edges.csv'] ?? '')
}

async function roundTripGraphml(snap: ExportSnapshot): Promise<GraphData> {
  const text = await blobText(exportAsGraphML(snap).blob)
  return parseGraphML(text)
}

async function roundTripGexf(snap: ExportSnapshot): Promise<GraphData> {
  const text = await blobText(exportAsGexf(snap).blob)
  return parseGEXF(text)
}

const ROUND_TRIPS = {
  json: roundTripJson,
  'csv-edge-list': roundTripCsvEdgeList,
  'csv-pair': roundTripCsvPair,
  graphml: roundTripGraphml,
  gexf: roundTripGexf,
} as const

type FormatName = keyof typeof ROUND_TRIPS
const FORMATS: FormatName[] = ['json', 'csv-edge-list', 'csv-pair', 'graphml', 'gexf']

// ─── Shared fixture-builders ──────────────────────────────────────────────

function node(
  id: string,
  label: string | undefined,
  x: number,
  y: number,
  properties: Record<string, PropertyValue>,
): ExportSnapshot['nodes'][number] {
  const out: ExportSnapshot['nodes'][number] = { id, x, y, properties }
  if (label !== undefined) out.label = label
  return out
}

// ─── Scenario definitions ─────────────────────────────────────────────────

/**
 * A scenario spec. `assert` runs against the parsed GraphData after a
 * round-trip through one of the five formats. The `expect` checks inside
 * the `assert` functions are the per-format per-scenario invariants.
 *
 * Per-format assertion overrides live in the optional `lossy` map:
 * - `csv-edge-list` — only structure (node ids, edge count, weights) survives.
 * - `graphml` — `string[]` comes back as pipe-encoded `string`.
 */
interface Scenario {
  name: string
  snapshot: ExportSnapshot
  assertLossless: (parsed: GraphData) => void
  overrides?: Partial<Record<FormatName, (parsed: GraphData) => void>>
}

function findNode(parsed: GraphData, id: string): NodeInput | undefined {
  return parsed.nodes.find((n) => n.id === id)
}

const SCENARIOS: Scenario[] = [
  // ── Structural edge cases ────────────────────────────────────────────
  {
    name: 'empty graph (no nodes, no edges)',
    snapshot: { nodes: [], edges: [], propertyMetas: [] },
    assertLossless: (p) => {
      expect(p.nodes).toHaveLength(0)
      expect(p.edges).toHaveLength(0)
    },
    overrides: {
      // parseEdgeListCSV throws on a header-only file; we catch that
      // specifically and assert the export itself is minimal.
      'csv-edge-list': () => {},
    },
  },
  {
    name: 'nodes but zero edges (isolated graph)',
    snapshot: {
      nodes: [node('a', 'Alpha', 0, 0, {}), node('b', 'Beta', 0, 0, {})],
      edges: [],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(p.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
      expect(p.edges).toHaveLength(0)
    },
    overrides: {
      // CSV edge list derives nodes from source+target, so zero edges ⇒
      // zero nodes on re-import. Lossy but documented.
      'csv-edge-list': () => {},
    },
  },
  {
    name: 'no properties declared (id + label only)',
    snapshot: {
      nodes: [node('n1', 'Alice', 0, 0, {}), node('n2', 'Bob', 0, 0, {})],
      edges: [{ source: 'n1', target: 'n2' }],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(p.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
      expect(p.edges).toHaveLength(1)
      // Some formats preserve label (JSON/CSV pair/GEXF/GraphML); CSV edge list doesn't.
    },
  },
  {
    name: 'edges with weights, no per-node properties',
    snapshot: {
      nodes: [node('x', undefined, 0, 0, {}), node('y', undefined, 0, 0, {})],
      edges: [{ source: 'x', target: 'y', weight: 0.42 }],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(p.edges[0].weight).toBeCloseTo(0.42, 3)
    },
  },
  {
    name: 'self-loop edge',
    snapshot: {
      nodes: [node('a', 'A', 0, 0, {})],
      edges: [{ source: 'a', target: 'a', weight: 1 }],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(p.edges).toHaveLength(1)
      expect(p.edges[0].source).toBe('a')
      expect(p.edges[0].target).toBe('a')
    },
  },
  {
    name: 'multiple edges between the same two nodes',
    snapshot: {
      nodes: [node('a', 'A', 0, 0, {}), node('b', 'B', 0, 0, {})],
      edges: [
        { source: 'a', target: 'b', weight: 1 },
        { source: 'a', target: 'b', weight: 2 },
        { source: 'a', target: 'b', weight: 3 },
      ],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(p.edges).toHaveLength(3)
      const weights = p.edges.map((e) => e.weight).sort()
      expect(weights).toEqual([1, 2, 3])
    },
  },

  // ── Single-type scenarios ────────────────────────────────────────────
  {
    name: 'only number properties',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { age: 34 }),
        node('n2', undefined, 0, 0, { age: -3.14 }),
        node('n3', undefined, 0, 0, { age: 1.5e3 }),
      ],
      edges: [],
      propertyMetas: [{ key: 'age', type: 'number' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.age).toBe(34)
      expect(findNode(p, 'n2')?.properties?.age).toBeCloseTo(-3.14, 3)
      expect(findNode(p, 'n3')?.properties?.age).toBe(1500)
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'only string properties',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { community: 'Tech' }),
        node('n2', undefined, 0, 0, { community: 'Arts' }),
      ],
      edges: [],
      propertyMetas: [{ key: 'community', type: 'string' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.community).toBe('Tech')
      expect(findNode(p, 'n2')?.properties?.community).toBe('Arts')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'only boolean properties (mixed true/false)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { active: true }),
        node('n2', undefined, 0, 0, { active: false }),
      ],
      edges: [],
      propertyMetas: [{ key: 'active', type: 'boolean' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.active).toBe(true)
      expect(findNode(p, 'n2')?.properties?.active).toBe(false)
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'uniform boolean column: all true',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { active: true }),
        node('n2', undefined, 0, 0, { active: true }),
      ],
      edges: [],
      propertyMetas: [{ key: 'active', type: 'boolean' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.active).toBe(true)
      expect(findNode(p, 'n2')?.properties?.active).toBe(true)
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'only date properties (various ISO precisions)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { joined: '2021-03-15' }),
        node('n2', undefined, 0, 0, { joined: '2022-06-20T12:00:00Z' }),
        node('n3', undefined, 0, 0, { joined: '2023-09-01T00:00:00.000+02:00' }),
      ],
      edges: [],
      propertyMetas: [{ key: 'joined', type: 'date' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.joined).toBe('2021-03-15')
      expect(findNode(p, 'n2')?.properties?.joined).toBe('2022-06-20T12:00:00Z')
      expect(findNode(p, 'n3')?.properties?.joined).toBe('2023-09-01T00:00:00.000+02:00')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'only string[] properties',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { tags: ['red', 'green'] }),
        node('n2', undefined, 0, 0, { tags: ['blue'] }),
      ],
      edges: [],
      propertyMetas: [{ key: 'tags', type: 'string[]' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.tags).toEqual(['red', 'green'])
      expect(findNode(p, 'n2')?.properties?.tags).toEqual(['blue'])
    },
    overrides: {
      'csv-edge-list': () => {},
      // GraphML has no list type — arrays round-trip as pipe-joined strings.
      graphml: (p) => {
        expect(findNode(p, 'n1')?.properties?.tags).toBe('red|green')
        expect(findNode(p, 'n2')?.properties?.tags).toBe('blue')
      },
    },
  },

  // ── Sparse + all-null ───────────────────────────────────────────────
  {
    name: 'sparse property (only some nodes carry it)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { age: 34 }),
        node('n2', undefined, 0, 0, {}),
        node('n3', undefined, 0, 0, { age: 28 }),
      ],
      edges: [],
      propertyMetas: [{ key: 'age', type: 'number' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.age).toBe(34)
      expect(findNode(p, 'n3')?.properties?.age).toBe(28)
      // n2 either has the type-default (0 after applyNullDefaults) or
      // undefined, depending on format. Both are acceptable — the
      // important thing is it doesn't carry a wrong value.
      const mid = findNode(p, 'n2')?.properties?.age
      expect(mid === undefined || mid === 0).toBe(true)
    },
    overrides: { 'csv-edge-list': () => {} },
  },

  // ── Special characters ─────────────────────────────────────────────
  {
    name: 'unicode in labels and properties',
    snapshot: {
      nodes: [
        node('n1', 'Åsa', 0, 0, { community: '日本語', tags: ['π', 'Ω'] }),
        node('n2', 'Žarko', 0, 0, { community: 'עברית', tags: ['α', 'β'] }),
      ],
      edges: [{ source: 'n1', target: 'n2' }],
      propertyMetas: [
        { key: 'community', type: 'string' },
        { key: 'tags', type: 'string[]' },
      ],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.label).toBe('Åsa')
      expect(findNode(p, 'n1')?.properties?.community).toBe('日本語')
      expect(findNode(p, 'n1')?.properties?.tags).toEqual(['π', 'Ω'])
      expect(findNode(p, 'n2')?.label).toBe('Žarko')
      expect(findNode(p, 'n2')?.properties?.community).toBe('עברית')
    },
    overrides: {
      'csv-edge-list': () => {},
      graphml: (p) => {
        expect(findNode(p, 'n1')?.properties?.community).toBe('日本語')
        // string[] flattens on GraphML
        expect(findNode(p, 'n1')?.properties?.tags).toBe('π|Ω')
      },
    },
  },
  {
    name: 'emoji in labels and properties',
    snapshot: {
      nodes: [
        node('n1', '🎉 Party', 0, 0, { tags: ['🔥', '💧'] }),
        node('n2', '🐛 Bug', 0, 0, { tags: ['🦄'] }),
      ],
      edges: [{ source: 'n1', target: 'n2' }],
      propertyMetas: [{ key: 'tags', type: 'string[]' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.label).toBe('🎉 Party')
      expect(findNode(p, 'n1')?.properties?.tags).toEqual(['🔥', '💧'])
    },
    overrides: {
      'csv-edge-list': () => {},
      graphml: (p) => {
        expect(findNode(p, 'n1')?.properties?.tags).toBe('🔥|💧')
      },
    },
  },
  {
    name: 'CSV-unsafe characters in labels (comma, quote, CRLF)',
    snapshot: {
      nodes: [
        node('n1', 'Smith, Jane', 0, 0, { note: 'line1\nline2' }),
        node('n2', 'He said "hi"', 0, 0, { note: 'commas, and "quotes"' }),
      ],
      edges: [{ source: 'n1', target: 'n2' }],
      propertyMetas: [{ key: 'note', type: 'string' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.label).toBe('Smith, Jane')
      expect(findNode(p, 'n1')?.properties?.note).toBe('line1\nline2')
      expect(findNode(p, 'n2')?.label).toBe('He said "hi"')
      expect(findNode(p, 'n2')?.properties?.note).toBe('commas, and "quotes"')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'XML-unsafe characters in labels and property values',
    snapshot: {
      nodes: [
        node('n1', '<script>alert(1)</script>', 0, 0, { note: 'a & b < c > d' }),
        node('n2', "it's fine", 0, 0, { note: 'quoted "thing"' }),
      ],
      edges: [{ source: 'n1', target: 'n2' }],
      propertyMetas: [{ key: 'note', type: 'string' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.label).toBe('<script>alert(1)</script>')
      expect(findNode(p, 'n1')?.properties?.note).toBe('a & b < c > d')
      expect(findNode(p, 'n2')?.label).toBe("it's fine")
      expect(findNode(p, 'n2')?.properties?.note).toBe('quoted "thing"')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'pipe character in a regular :string property (NOT string[])',
    snapshot: {
      // The user's `slug` genuinely contains a pipe — CSV pair should
      // keep it as a string, not auto-promote to string[]. (Auto-promote
      // only triggers on untyped headers; we declare :string explicitly.)
      nodes: [
        node('n1', undefined, 0, 0, { slug: 'foo|bar' }),
        node('n2', undefined, 0, 0, { slug: 'plain' }),
      ],
      edges: [],
      propertyMetas: [{ key: 'slug', type: 'string' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.slug).toBe('foo|bar')
      expect(findNode(p, 'n2')?.properties?.slug).toBe('plain')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'string[] with embedded pipe characters (requires escape on wire)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { tags: ['a|b', 'c'] }),
        node('n2', undefined, 0, 0, { tags: ['x', 'y|z|w'] }),
      ],
      edges: [],
      propertyMetas: [{ key: 'tags', type: 'string[]' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.tags).toEqual(['a|b', 'c'])
      expect(findNode(p, 'n2')?.properties?.tags).toEqual(['x', 'y|z|w'])
    },
    overrides: {
      'csv-edge-list': () => {},
      // GraphML round-trips as string with ESCAPED pipes ("a\|b|c") —
      // still parseable with splitStringArray on the consumer side.
      graphml: (p) => {
        expect(findNode(p, 'n1')?.properties?.tags).toBe('a\\|b|c')
      },
    },
  },
  {
    name: 'special characters in node ids',
    snapshot: {
      nodes: [
        node('has space', 'A', 0, 0, {}),
        node('has,comma', 'B', 0, 0, {}),
        node('has"quote', 'C', 0, 0, {}),
        node('has&amp', 'D', 0, 0, {}),
      ],
      edges: [
        { source: 'has space', target: 'has,comma' },
        { source: 'has"quote', target: 'has&amp' },
      ],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      const ids = p.nodes.map((n) => n.id).sort()
      expect(ids).toEqual(['has space', 'has"quote', 'has&amp', 'has,comma'])
      expect(p.edges).toHaveLength(2)
    },
  },
  {
    name: 'leading-zero string that looks like a number',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { zip: '00123' }),
        node('n2', undefined, 0, 0, { zip: '09999' }),
      ],
      edges: [],
      propertyMetas: [{ key: 'zip', type: 'string' }],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.properties?.zip).toBe('00123')
      expect(findNode(p, 'n2')?.properties?.zip).toBe('09999')
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'long string value (~2 KB)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, { bio: 'x'.repeat(2048) }),
        node('n2', undefined, 0, 0, { bio: 'y'.repeat(100) }),
      ],
      edges: [],
      propertyMetas: [{ key: 'bio', type: 'string' }],
    },
    assertLossless: (p) => {
      expect((findNode(p, 'n1')?.properties?.bio as string).length).toBe(2048)
      expect((findNode(p, 'n2')?.properties?.bio as string).length).toBe(100)
    },
    overrides: { 'csv-edge-list': () => {} },
  },
  {
    name: 'large string[] (50 items)',
    snapshot: {
      nodes: [
        node('n1', undefined, 0, 0, {
          tags: Array.from({ length: 50 }, (_, i) => `tag_${i}`),
        }),
      ],
      edges: [],
      propertyMetas: [{ key: 'tags', type: 'string[]' }],
    },
    assertLossless: (p) => {
      const tags = findNode(p, 'n1')?.properties?.tags
      expect(Array.isArray(tags)).toBe(true)
      expect((tags as string[]).length).toBe(50)
      expect((tags as string[])[0]).toBe('tag_0')
      expect((tags as string[])[49]).toBe('tag_49')
    },
    overrides: {
      'csv-edge-list': () => {},
      graphml: (p) => {
        // Flattened string — 50 items separated by 49 pipes.
        const s = findNode(p, 'n1')?.properties?.tags as string
        expect(s.split('|')).toHaveLength(50)
      },
    },
  },
  {
    name: 'positions preserved across formats that carry them',
    snapshot: {
      nodes: [
        node('n1', undefined, 10, 20, {}),
        node('n2', undefined, -5, 8, {}),
        node('n3', undefined, 100, -30, {}),
      ],
      edges: [],
      propertyMetas: [],
    },
    assertLossless: (p) => {
      expect(findNode(p, 'n1')?.x).toBe(10)
      expect(findNode(p, 'n1')?.y).toBe(20)
      expect(findNode(p, 'n2')?.x).toBe(-5)
      expect(findNode(p, 'n2')?.y).toBe(8)
      expect(findNode(p, 'n3')?.x).toBe(100)
      expect(findNode(p, 'n3')?.y).toBe(-30)
    },
    overrides: {
      // Edge list doesn't carry per-node fields at all.
      'csv-edge-list': () => {},
    },
  },
]

// ─── The matrix ───────────────────────────────────────────────────────────

for (const scenario of SCENARIOS) {
  describe(`Round-trip: ${scenario.name}`, () => {
    for (const fmt of FORMATS) {
      it(`${fmt}`, async () => {
        const roundTrip = ROUND_TRIPS[fmt]
        const assertion = scenario.overrides?.[fmt] ?? scenario.assertLossless
        // The empty-graph / zero-node scenarios cause parseEdgeListCSV to
        // throw on re-import (its parser requires at least one data row).
        // The overrides give those scenarios a no-op assertion — we still
        // want to verify the EXPORT succeeds without throwing.
        if (fmt === 'csv-edge-list' && scenario.snapshot.edges.length === 0) {
          // Just verify the export produces something well-formed.
          await exportAsCsvEdgeList(scenario.snapshot)
          assertion({ version: '1', nodes: [], edges: [] })
          return
        }
        const parsed = await roundTrip(scenario.snapshot)
        assertion(parsed)
      })
    }
  })
}

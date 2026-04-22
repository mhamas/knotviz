import { describe, expect, it } from 'vitest'
import { exportAsGraphML } from '../../lib/exports/graphml'
import { parseGraphML } from '../../lib/parseGraphML'
import { sampleSnapshot } from './fixtures'

async function readBlob(blob: Blob): Promise<string> {
  return blob.text()
}

describe('exportAsGraphML', () => {
  it('produces well-formed XML that parses back through parseGraphML', async () => {
    const text = await readBlob(exportAsGraphML(sampleSnapshot()).blob)
    expect(() => parseGraphML(text)).not.toThrow()
    const parsed = parseGraphML(text)
    expect(parsed.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
    expect(parsed.edges).toHaveLength(2)
  })

  it('preserves numbers, booleans, and dates (as ISO strings) round-trip', async () => {
    const text = await readBlob(exportAsGraphML(sampleSnapshot()).blob)
    const parsed = parseGraphML(text)
    const n1 = parsed.nodes.find((n) => n.id === 'n1')!
    expect(n1.properties?.age).toBe(34)
    expect(n1.properties?.active).toBe(true)
    expect(n1.properties?.joined).toBe('2021-03-15')
    expect(n1.properties?.community).toBe('Tech')
  })

  it('flattens string[] into pipe-encoded strings on the wire', async () => {
    const text = await readBlob(exportAsGraphML(sampleSnapshot()).blob)
    // Property keys are assigned sequential p0/p1/... ids so the wire text
    // doesn't depend on user input. tags is the 5th property in the
    // sample snapshot (age, active, joined, community, tags) → p4.
    expect(text).toContain('<data key="p4">engineer|founder</data>')
  })

  it('emits label / x / y as structural keys only when any node has them', async () => {
    const text = await readBlob(exportAsGraphML(sampleSnapshot()).blob)
    expect(text).toContain('<key id="label"')
    expect(text).toContain('<key id="x"')
    expect(text).toContain('<key id="y"')
  })

  it('does NOT emit weight key when no edge carries a weight', async () => {
    const snap = sampleSnapshot()
    snap.edges = snap.edges.map((e) => ({ source: e.source, target: e.target }))
    const text = await readBlob(exportAsGraphML(snap).blob)
    expect(text).not.toContain('attr.name="weight"')
  })

  it('XML-escapes id and property values with special characters', async () => {
    const snap = sampleSnapshot()
    snap.nodes[0].id = 'a<b&c"d'
    snap.nodes[0].properties.community = '<script>'
    const text = await readBlob(exportAsGraphML(snap).blob)
    expect(text).toContain('<node id="a&lt;b&amp;c&quot;d">')
    expect(text).toContain('&lt;script&gt;')
  })

  it('survives property keys that are not valid XML NCNames (spaces, colons, leading digits)', async () => {
    // GraphML <key id="..."> requires a valid NCName, but the user's
    // property keys can be arbitrary strings. The exporter assigns
    // sequential p0/p1/… ids and carries the human-friendly key in
    // attr.name, so "first name" / "user:id" / "42-things" all round-trip.
    const snap = sampleSnapshot()
    snap.propertyMetas = [
      { key: 'first name', type: 'string' },
      { key: 'user:id', type: 'string' },
      { key: '42-things', type: 'number' },
    ]
    for (const n of snap.nodes) {
      n.properties = { 'first name': n.label ?? '', 'user:id': `u${n.id}`, '42-things': 7 }
    }
    const text = await readBlob(exportAsGraphML(snap).blob)
    const parsed = parseGraphML(text)
    const n1 = parsed.nodes.find((n) => n.id === 'n1')!
    expect(n1.properties?.['first name']).toBe('Alice')
    expect(n1.properties?.['user:id']).toBe('un1')
    expect(n1.properties?.['42-things']).toBe(7)
  })

  it('handles an empty-graph snapshot (declarations only, no <node>/<edge>)', async () => {
    const empty = { nodes: [], edges: [], propertyMetas: [] }
    const text = await readBlob(exportAsGraphML(empty).blob)
    const parsed = parseGraphML(text)
    expect(parsed.nodes).toHaveLength(0)
    expect(parsed.edges).toHaveLength(0)
  })
})

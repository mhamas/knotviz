import { describe, expect, it } from 'vitest'
import { exportAsGexf } from '../../lib/exports/gexf'
import { parseGEXF } from '../../lib/parseGEXF'
import { sampleSnapshot } from './fixtures'

async function readBlob(blob: Blob): Promise<string> {
  return blob.text()
}

describe('exportAsGexf', () => {
  it('produces well-formed XML that parses back through parseGEXF', async () => {
    const text = await readBlob(exportAsGexf(sampleSnapshot()).blob)
    expect(() => parseGEXF(text)).not.toThrow()
    const parsed = parseGEXF(text)
    expect(parsed.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
    expect(parsed.edges).toHaveLength(2)
  })

  it('preserves every property type round-trip, including string[] via liststring', async () => {
    const text = await readBlob(exportAsGexf(sampleSnapshot()).blob)
    const parsed = parseGEXF(text)
    const n1 = parsed.nodes.find((n) => n.id === 'n1')!
    expect(n1.properties?.age).toBe(34)
    expect(n1.properties?.active).toBe(true)
    expect(n1.properties?.joined).toBe('2021-03-15')
    expect(n1.properties?.community).toBe('Tech')
    expect(n1.properties?.tags).toEqual(['engineer', 'founder'])
  })

  it('emits <viz:position> when any node has non-zero coords', async () => {
    const text = await readBlob(exportAsGexf(sampleSnapshot()).blob)
    expect(text).toContain('<viz:position x="10" y="20"/>')
  })

  it('preserves positions through parseGEXF round-trip', async () => {
    const parsed = parseGEXF(await readBlob(exportAsGexf(sampleSnapshot()).blob))
    const n1 = parsed.nodes.find((n) => n.id === 'n1')!
    expect(n1.x).toBe(10)
    expect(n1.y).toBe(20)
  })

  it('emits node label from the element attribute (GEXF native)', async () => {
    const text = await readBlob(exportAsGexf(sampleSnapshot()).blob)
    expect(text).toContain('<node id="n1" label="Alice">')
  })

  it('XML-escapes ids and attribute values containing special characters', async () => {
    const snap = sampleSnapshot()
    snap.nodes[0].id = 'a<b&c"d'
    const text = await readBlob(exportAsGexf(snap).blob)
    expect(text).toContain('a&lt;b&amp;c&quot;d')
  })
})

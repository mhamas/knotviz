import { describe, expect, it } from 'vitest'
import { exportAsJson } from '../../lib/exports/json'
import { sampleSnapshot } from './fixtures'

async function readBlob(blob: Blob): Promise<string> {
  return blob.text()
}

describe('exportAsJson', () => {
  it('emits a valid Knotviz JSON document', async () => {
    const result = exportAsJson(sampleSnapshot())
    const text = await readBlob(result.blob)
    const parsed = JSON.parse(text)
    expect(parsed.version).toBe('1')
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.edges).toHaveLength(2)
    expect(result.extension).toBe('json')
  })

  it('preserves every property type unchanged (round-trip fidelity)', async () => {
    const text = await readBlob(exportAsJson(sampleSnapshot()).blob)
    const parsed = JSON.parse(text)
    expect(parsed.nodes[0]).toMatchObject({
      id: 'n1',
      x: 10,
      y: 20,
      label: 'Alice',
      properties: {
        age: 34,
        active: true,
        joined: '2021-03-15',
        community: 'Tech',
        tags: ['engineer', 'founder'],
      },
    })
  })

  it('omits label when the node has none', async () => {
    const text = await readBlob(exportAsJson(sampleSnapshot()).blob)
    const parsed = JSON.parse(text)
    expect(parsed.nodes[2].label).toBeUndefined()
  })

  it('omits properties object when the node has none', async () => {
    const text = await readBlob(exportAsJson(sampleSnapshot()).blob)
    const parsed = JSON.parse(text)
    expect(parsed.nodes[2].properties).toBeUndefined()
  })

  it('does not emit edge labels (Knotviz never renders them)', async () => {
    const text = await readBlob(exportAsJson(sampleSnapshot()).blob)
    const parsed = JSON.parse(text)
    for (const edge of parsed.edges) {
      expect(edge.label).toBeUndefined()
    }
  })

  it('omits edge weight when undefined', async () => {
    const text = await readBlob(exportAsJson(sampleSnapshot()).blob)
    const parsed = JSON.parse(text)
    expect(parsed.edges[0].weight).toBe(0.8)
    expect(parsed.edges[1].weight).toBeUndefined()
  })
})

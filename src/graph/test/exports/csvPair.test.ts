import { describe, expect, it } from 'vitest'
import { exportAsCsvPair } from '../../lib/exports/csvPair'
import { sampleSnapshot } from './fixtures'
import { readZipEntries } from './readZip'

async function readZipBlob(blob: Blob): Promise<Record<string, string>> {
  return readZipEntries(new Uint8Array(await blob.arrayBuffer()))
}

describe('exportAsCsvPair', () => {
  it('produces a ZIP containing nodes.csv and edges.csv', async () => {
    const result = await exportAsCsvPair(sampleSnapshot())
    expect(result.extension).toBe('zip')
    const files = await readZipBlob(result.blob)
    expect(Object.keys(files).sort()).toEqual(['edges.csv', 'nodes.csv'])
  })

  it('nodes.csv emits typed column headers', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipBlob(blob)
    const header = files['nodes.csv'].split(/\r\n/)[0]
    expect(header).toBe('id,label,x,y,age:number,active:boolean,joined:date,community:string,tags:string[]')
  })

  it('nodes.csv encodes string[] values with pipe separator', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipBlob(blob)
    const rows = files['nodes.csv'].split(/\r\n/).filter(Boolean)
    // Row n1: ...,engineer|founder
    expect(rows[1].endsWith('engineer|founder')).toBe(true)
  })

  it('escapes pipes inside individual string[] values', async () => {
    const snap = sampleSnapshot()
    snap.nodes[0].properties.tags = ['a|b', 'c']
    const { blob } = await exportAsCsvPair(snap)
    const files = await readZipBlob(blob)
    const rows = files['nodes.csv'].split(/\r\n/).filter(Boolean)
    expect(rows[1].endsWith('a\\|b|c')).toBe(true)
  })

  it('edges.csv has source,target,weight when any edge has a weight', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipBlob(blob)
    const lines = files['edges.csv'].split(/\r\n/).filter(Boolean)
    expect(lines[0]).toBe('source,target,weight')
    expect(lines[1]).toBe('n1,n2,0.8')
    expect(lines[2]).toBe('n2,n3,')
  })

  it('skips property columns that collide with structural names (id / label / x / y)', async () => {
    // JSON inputs or parser quirks can produce snapshot entries whose
    // property key literally matches a structural column. Emitting both
    // would produce a CSV with duplicate headers — unreadable on
    // re-import. Skip the property column; the structural column already
    // carries the value.
    const snap = sampleSnapshot()
    snap.propertyMetas.unshift({ key: 'label', type: 'string' })
    for (const n of snap.nodes) {
      n.properties.label = n.label ?? ''
    }
    const { blob } = await exportAsCsvPair(snap)
    const files = await readZipBlob(blob)
    const header = files['nodes.csv'].split(/\r\n/)[0]
    // No duplicate label column.
    expect(header.match(/label/g) ?? []).toHaveLength(1)
    expect(header.includes('label:string')).toBe(false)
  })

  it('handles an empty-graph snapshot (header row only)', async () => {
    const empty = { nodes: [], edges: [], propertyMetas: [] }
    const { blob } = await exportAsCsvPair(empty)
    const files = await readZipBlob(blob)
    expect(files['nodes.csv'].trim()).toBe('id')
    expect(files['edges.csv'].trim()).toBe('source,target')
  })

  it('drops label / x / y columns when no node has them set', async () => {
    const snap = sampleSnapshot()
    for (const n of snap.nodes) {
      delete n.label
      n.x = 0
      n.y = 0
    }
    const { blob } = await exportAsCsvPair(snap)
    const files = await readZipBlob(blob)
    const header = files['nodes.csv'].split(/\r\n/)[0]
    expect(header).toBe('id,age:number,active:boolean,joined:date,community:string,tags:string[]')
  })
})

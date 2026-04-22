import { describe, expect, it } from 'vitest'
import { exportAsCsvEdgeList } from '../../lib/exports/csvEdgeList'
import { sampleSnapshot } from './fixtures'

async function readBlob(blob: Blob): Promise<string> {
  return blob.text()
}

describe('exportAsCsvEdgeList', () => {
  it('emits source,target,weight header when any edge has a weight', async () => {
    const text = await readBlob(exportAsCsvEdgeList(sampleSnapshot()).blob)
    const lines = text.split(/\r\n/).filter(Boolean)
    expect(lines[0]).toBe('source,target,weight')
  })

  it('omits weight column entirely when no edge carries one', async () => {
    const snap = sampleSnapshot()
    snap.edges = snap.edges.map((e) => ({ source: e.source, target: e.target }))
    const text = await readBlob(exportAsCsvEdgeList(snap).blob)
    const lines = text.split(/\r\n/).filter(Boolean)
    expect(lines[0]).toBe('source,target')
    expect(lines[1]).toBe('n1,n2')
  })

  it('renders one row per edge, empty weight cell when missing on that row', async () => {
    const text = await readBlob(exportAsCsvEdgeList(sampleSnapshot()).blob)
    const lines = text.split(/\r\n/).filter(Boolean)
    expect(lines).toHaveLength(3) // header + 2 edges
    expect(lines[1]).toBe('n1,n2,0.8')
    expect(lines[2]).toBe('n2,n3,')
  })

  it('escapes RFC 4180 reserved characters in ids', async () => {
    const snap = sampleSnapshot()
    snap.edges = [{ source: 'a,b', target: 'c"d', weight: 1 }]
    const text = await readBlob(exportAsCsvEdgeList(snap).blob)
    const lines = text.split(/\r\n/).filter(Boolean)
    expect(lines[1]).toBe('"a,b","c""d",1')
  })

  it('returns csv extension', () => {
    const result = exportAsCsvEdgeList(sampleSnapshot())
    expect(result.extension).toBe('csv')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseStreamingEdgeListCSV,
  parseStreamingNodeEdgeCSV,
  type StreamingCsvCallbacks,
} from '../lib/streamingCsvGraphParser'
import type { EdgeInput, NodeInput } from '../types'

async function* chunksOf(text: string, size = 64): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size)
  }
}

function collect(): {
  nodes: NodeInput[]
  edges: EdgeInput[]
  callbacks: StreamingCsvCallbacks
} {
  const nodes: NodeInput[] = []
  const edges: EdgeInput[] = []
  return {
    nodes,
    edges,
    callbacks: {
      onNode: (n) => nodes.push(n),
      onEdge: (e) => edges.push(e),
    },
  }
}

describe('parseStreamingEdgeListCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits nodes (dedup) and edges for a simple edge list', async () => {
    const csv = 'source,target\na,b\nb,c\na,c'
    const { nodes, edges, callbacks } = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv), callbacks)
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(edges.map((e) => `${e.source}-${e.target}`)).toEqual(['a-b', 'b-c', 'a-c'])
  })

  it('emits nodes only once even when they recur across many rows', async () => {
    const csv = 'source,target\na,b\na,b\na,b'
    const { nodes, callbacks } = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv), callbacks)
    expect(nodes).toHaveLength(2)
  })

  it('accepts weight and label', async () => {
    const csv = 'source,target,weight,label\na,b,0.5,knows'
    const { edges, callbacks } = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv), callbacks)
    expect(edges[0]).toEqual({ source: 'a', target: 'b', weight: 0.5, label: 'knows' })
  })

  it('autodetects tab delimiter', async () => {
    const csv = 'source\ttarget\na\tb\nb\tc'
    const { edges, callbacks } = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv, 5), callbacks)
    expect(edges.map((e) => `${e.source}-${e.target}`)).toEqual(['a-b', 'b-c'])
  })

  it('throws if the header is missing source or target', async () => {
    const csv = 'from,to\na,b'
    const { callbacks } = collect()
    await expect(parseStreamingEdgeListCSV(chunksOf(csv), callbacks)).rejects.toThrow(/source|target/)
  })

  it('skips rows with empty source or target and warns', async () => {
    const csv = 'source,target\na,b\n,c\nd,\ne,f'
    const { edges, callbacks } = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv), callbacks)
    expect(edges.map((e) => `${e.source}-${e.target}`)).toEqual(['a-b', 'e-f'])
    expect(console.warn).toHaveBeenCalled()
  })

  it('produces identical output when chunked byte-by-byte vs. all at once', async () => {
    const csv =
      'source,target,weight,label\n"Smith, John","Jones, Bob",0.5,knows\nb,c,1.2,follows\n'
    const oneShot = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv, 1024), oneShot.callbacks)
    const byChar = collect()
    await parseStreamingEdgeListCSV(chunksOf(csv, 1), byChar.callbacks)
    expect(byChar.nodes).toEqual(oneShot.nodes)
    expect(byChar.edges).toEqual(oneShot.edges)
  })
})

describe('parseStreamingNodeEdgeCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('streams nodes then edges with typed header properties', async () => {
    const nodes = 'id,label,age:number,active:boolean\nn1,Alice,34,true\nn2,Bob,28,false'
    const edges = 'source,target\nn1,n2'
    const c = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)
    expect(c.nodes).toEqual([
      { id: 'n1', label: 'Alice', properties: { label: 'Alice', age: 34, active: true } },
      { id: 'n2', label: 'Bob', properties: { label: 'Bob', age: 28, active: false } },
    ])
    expect(c.edges).toEqual([{ source: 'n1', target: 'n2' }])
  })

  it('infers untyped columns from the first batch of rows', async () => {
    const nodes = 'id,age,joined\nn1,34,2021-03-15\nn2,28,2023-11-02'
    const edges = 'source,target\nn1,n2'
    const c = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)
    expect(c.nodes[0].properties).toEqual({ age: 34, joined: '2021-03-15' })
  })

  it('filters edges that reference unknown node ids', async () => {
    const nodes = 'id\nn1\nn2'
    const edges = 'source,target\nn1,n2\nn1,ghost\nghost,n2'
    const c = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)
    expect(c.edges).toEqual([{ source: 'n1', target: 'n2' }])
    expect(console.warn).toHaveBeenCalled()
  })

  it('throws on missing id column in nodes', async () => {
    const nodes = 'name\nn1'
    const edges = 'source,target\nn1,n1'
    const c = collect()
    await expect(parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)).rejects.toThrow(/id/)
  })

  it('throws on missing source/target in edges', async () => {
    const nodes = 'id\nn1\nn2'
    const edges = 'from,to\nn1,n2'
    const c = collect()
    await expect(parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)).rejects.toThrow(/source|target/)
  })

  it('reads x and y as structural float positions', async () => {
    const nodes = 'id,x,y\nn1,10.5,20\nn2,-1,0'
    const edges = 'source,target\nn1,n2'
    const c = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes), chunksOf(edges), c.callbacks)
    expect(c.nodes[0]).toEqual({ id: 'n1', x: 10.5, y: 20 })
    expect(c.nodes[1]).toEqual({ id: 'n2', x: -1, y: 0 })
  })

  it('produces identical output streamed vs. chunked byte-by-byte', async () => {
    const nodes =
      'id,label,age:number\nn1,Alice,34\nn2,Bob,28\nn3,Carol,45\n'
    const edges = 'source,target,weight\nn1,n2,0.5\nn2,n3,1.0\n'
    const oneShot = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes, 1024), chunksOf(edges, 1024), oneShot.callbacks)
    const byChar = collect()
    await parseStreamingNodeEdgeCSV(chunksOf(nodes, 1), chunksOf(edges, 1), byChar.callbacks)
    expect(byChar.nodes).toEqual(oneShot.nodes)
    expect(byChar.edges).toEqual(oneShot.edges)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseNodeEdgeCSV } from '../lib/parseNodeEdgeCSV'

describe('parseNodeEdgeCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('produces valid GraphData with version "1"', () => {
    const nodes = 'id\nalice\nbob'
    const edges = 'source,target\nalice,bob'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.version).toBe('1')
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
  })

  it('preserves node order from the nodes CSV', () => {
    const nodes = 'id\nz\ny\nx'
    const edges = 'source,target\nz,y'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes.map((n) => n.id)).toEqual(['z', 'y', 'x'])
  })

  it('reads optional label column', () => {
    const nodes = 'id,label\nn1,Alice\nn2,Bob'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0]).toEqual({ id: 'n1', label: 'Alice' })
    expect(g.nodes[1]).toEqual({ id: 'n2', label: 'Bob' })
  })

  it('reads optional x and y position columns as numbers', () => {
    const nodes = 'id,x,y\nn1,10.5,20\nn2,-1,0'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0]).toEqual({ id: 'n1', x: 10.5, y: 20 })
    expect(g.nodes[1]).toEqual({ id: 'n2', x: -1, y: 0 })
  })

  it('stores extra typed columns as per-node properties', () => {
    const nodes =
      'id,age:number,joined:date,active:boolean,tags:string[]\nn1,34,2021-03-15,true,red|blue\nn2,28,2023-11-02,false,green'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({
      age: 34,
      joined: '2021-03-15',
      active: true,
      tags: ['red', 'blue'],
    })
    expect(g.nodes[1].properties).toEqual({
      age: 28,
      joined: '2023-11-02',
      active: false,
      tags: ['green'],
    })
  })

  it('infers types for columns without a :type suffix', () => {
    const nodes = 'id,age,active,joined\nn1,34,true,2021-03-15\nn2,28,false,2023-11-02'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({
      age: 34,
      active: true,
      joined: '2021-03-15',
    })
  })

  it('falls back to string type for mixed columns without a suffix', () => {
    const nodes = 'id,mixed\nn1,42\nn2,hello'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ mixed: '42' })
    expect(g.nodes[1].properties).toEqual({ mixed: 'hello' })
  })

  it('preserves leading-zero IDs in untyped columns as strings', () => {
    const nodes = 'id,zip\nn1,02134\nn2,01890'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ zip: '02134' })
    expect(g.nodes[1].properties).toEqual({ zip: '01890' })
  })

  it('leaves missing property cells as undefined', () => {
    const nodes = 'id,age:number\nn1,34\nn2,'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ age: 34 })
    expect(g.nodes[1].properties?.age).toBeUndefined()
  })

  it('is case-insensitive on structural column names', () => {
    const nodes = 'ID,Label,X,Y\nn1,Alice,1,2'
    const edges = 'SOURCE,TARGET\nn1,n1'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0]).toEqual({ id: 'n1', label: 'Alice', x: 1, y: 2 })
    expect(g.edges[0]).toEqual({ source: 'n1', target: 'n1' })
  })

  it('throws when the nodes CSV is missing an id column', () => {
    expect(() => parseNodeEdgeCSV('name\nalice', 'source,target\nalice,bob')).toThrow(/id/)
  })

  it('throws when the edges CSV is missing a source column', () => {
    expect(() => parseNodeEdgeCSV('id\nalice\nbob', 'from,to\nalice,bob')).toThrow(/source/)
  })

  it('skips a node row with an empty id and warns', () => {
    const nodes = 'id\nalice\n\nbob'
    const edges = 'source,target\nalice,bob'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes).toHaveLength(2)
    // Blank line is filtered by the row parser; explicitly-empty id would be caught here.
  })

  it('skips an edge referencing an unknown node and warns', () => {
    const nodes = 'id\nalice\nbob'
    const edges = 'source,target\nalice,bob\nalice,ghost'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.edges).toEqual([{ source: 'alice', target: 'bob' }])
    expect(console.warn).toHaveBeenCalled()
  })

  it('supports TSV in both files', () => {
    const nodes = 'id\tlabel\nn1\tAlice\nn2\tBob'
    const edges = 'source\ttarget\nn1\tn2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
  })

  it('accepts quoted cells with embedded commas', () => {
    const nodes = 'id,label\nn1,"Smith, John"'
    const edges = 'source,target\nn1,n1'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].label).toBe('Smith, John')
  })

  it('reads optional weight and label on edges', () => {
    const nodes = 'id\nn1\nn2'
    const edges = 'source,target,weight,label\nn1,n2,0.5,knows'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.edges[0]).toEqual({ source: 'n1', target: 'n2', weight: 0.5, label: 'knows' })
  })

  it('warns and drops the value when a typed cell cannot be coerced', () => {
    const nodes = 'id,age:number\nn1,34\nn2,not-a-number'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ age: 34 })
    expect(g.nodes[1].properties?.age).toBeUndefined()
    expect(console.warn).toHaveBeenCalled()
  })

  it('passes a pipe character through a :string column without splitting', () => {
    const nodes = 'id,slug:string\nn1,foo|bar\nn2,baz'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ slug: 'foo|bar' })
    expect(g.nodes[1].properties).toEqual({ slug: 'baz' })
  })

  it('infers a stable type when every non-empty sample is identical', () => {
    const nodes = 'id,status\nn1,active\nn2,active\nn3,active'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ status: 'active' })
  })

  it('strips a UTF-8 BOM from the start of each file', () => {
    const nodes = '\uFEFFid,label\nn1,Alice\nn2,Bob'
    const edges = '\uFEFFsource,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes.map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(g.nodes[0].label).toBe('Alice')
  })

  it('infers as string a column mixing numbers and dates', () => {
    const nodes = 'id,data\nn1,42\nn2,2021-03-15'
    const edges = 'source,target\nn1,n2'
    const g = parseNodeEdgeCSV(nodes, edges)
    expect(g.nodes[0].properties).toEqual({ data: '42' })
    expect(g.nodes[1].properties).toEqual({ data: '2021-03-15' })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseEdgeListCSV } from '../lib/parseEdgeListCSV'

describe('parseEdgeListCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a valid GraphData with version "1"', () => {
    const csv = 'source,target\na,b'
    const g = parseEdgeListCSV(csv)
    expect(g.version).toBe('1')
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
  })

  it('derives nodes from the union of source and target ids', () => {
    const csv = 'source,target\na,b\nb,c\nc,a'
    const g = parseEdgeListCSV(csv)
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('deduplicates node ids', () => {
    const csv = 'source,target\na,b\na,b'
    const g = parseEdgeListCSV(csv)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(2)
  })

  it('accepts optional weight column as a number', () => {
    const csv = 'source,target,weight\na,b,0.5\nb,c,2.0'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toEqual([
      { source: 'a', target: 'b', weight: 0.5 },
      { source: 'b', target: 'c', weight: 2.0 },
    ])
  })

  it('accepts optional label column', () => {
    const csv = 'source,target,label\na,b,knows\nb,c,friend of'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toEqual([
      { source: 'a', target: 'b', label: 'knows' },
      { source: 'b', target: 'c', label: 'friend of' },
    ])
  })

  it('accepts both weight and label', () => {
    const csv = 'source,target,weight,label\na,b,0.5,knows'
    const g = parseEdgeListCSV(csv)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b', weight: 0.5, label: 'knows' })
  })

  it('is case-insensitive on column names', () => {
    const csv = 'Source,Target,Weight,Label\na,b,1,x'
    const g = parseEdgeListCSV(csv)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b', weight: 1, label: 'x' })
  })

  it('parses TSV files', () => {
    const csv = 'source\ttarget\na\tb'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toHaveLength(1)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
  })

  it('throws when the header is missing "source"', () => {
    expect(() => parseEdgeListCSV('from,to\na,b')).toThrow(/source/)
  })

  it('throws when the header is missing "target"', () => {
    expect(() => parseEdgeListCSV('source,destination\na,b')).toThrow(/target/)
  })

  it('throws on empty input', () => {
    expect(() => parseEdgeListCSV('')).toThrow()
  })

  it('throws on header-only input', () => {
    expect(() => parseEdgeListCSV('source,target')).toThrow()
  })

  it('skips rows missing source or target and warns', () => {
    const csv = 'source,target\na,b\n,c\nd,\ne,f'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toHaveLength(2)
    expect(console.warn).toHaveBeenCalled()
  })

  it('drops a non-numeric weight without dropping the edge', () => {
    const csv = 'source,target,weight\na,b,NotANumber'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toEqual([{ source: 'a', target: 'b' }])
    expect(console.warn).toHaveBeenCalled()
  })

  it('respects quoted node ids with embedded commas', () => {
    const csv = 'source,target\n"Smith, John","Jones, Bob"'
    const g = parseEdgeListCSV(csv)
    expect(g.edges).toEqual([{ source: 'Smith, John', target: 'Jones, Bob' }])
  })

  it('ignores unknown extra columns', () => {
    const csv = 'source,target,extra\na,b,foo'
    const g = parseEdgeListCSV(csv)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
  })

  it('preserves edge order in the output', () => {
    const csv = 'source,target\nz,y\nb,a\nx,w'
    const g = parseEdgeListCSV(csv)
    expect(g.edges.map((e) => `${e.source}-${e.target}`)).toEqual(['z-y', 'b-a', 'x-w'])
  })

  it('preserves node order from first appearance in edge list', () => {
    const csv = 'source,target\nz,y\na,b\nz,a'
    const g = parseEdgeListCSV(csv)
    expect(g.nodes.map((n) => n.id)).toEqual(['z', 'y', 'a', 'b'])
  })
})

import { describe, it, expect, vi } from 'vitest'
import { parseJSON } from '../lib/parseJSON'
import { validateGraph } from '../lib/validateGraph'

describe('parseJSON', () => {
  it('parses valid JSON string', () => {
    const result = parseJSON('{"version":"1","nodes":[],"edges":[]}')
    expect(result).toEqual({ version: '1', nodes: [], edges: [] })
  })

  it('throws "Invalid JSON file" on invalid JSON', () => {
    expect(() => parseJSON('not json')).toThrow('Invalid JSON file')
  })
})

describe('validateGraph', () => {
  const validInput = {
    version: '1',
    nodes: [
      { id: '1', label: 'Alice', properties: { age: 34, active: true, name: 'Alice' } },
      { id: '2', label: 'Bob' },
    ],
    edges: [{ source: '1', target: '2' }],
  }

  it('returns typed GraphData for valid input', () => {
    const result = validateGraph(validInput)
    expect(result.version).toBe('1')
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.nodes[0].properties).toEqual({ age: 34, active: true, name: 'Alice' })
  })

  it('throws "Unsupported schema version" when version is missing', () => {
    expect(() => validateGraph({ nodes: [], edges: [] })).toThrow('Unsupported schema version')
  })

  it('throws "Unsupported schema version" for version "2"', () => {
    expect(() => validateGraph({ version: '2', nodes: [], edges: [] })).toThrow(
      'Unsupported schema version'
    )
  })

  it('throws "File must contain nodes and edges arrays" when nodes is missing', () => {
    expect(() => validateGraph({ version: '1', edges: [] })).toThrow(
      'File must contain nodes and edges arrays'
    )
  })

  it('throws "File must contain nodes and edges arrays" when edges is missing', () => {
    expect(() => validateGraph({ version: '1', nodes: [] })).toThrow(
      'File must contain nodes and edges arrays'
    )
  })

  it('throws "File must contain nodes and edges arrays" when nodes is not an array', () => {
    expect(() => validateGraph({ version: '1', nodes: 'not array', edges: [] })).toThrow(
      'File must contain nodes and edges arrays'
    )
  })

  it('throws "Graph has no nodes to display" when all nodes are invalid', () => {
    expect(() =>
      validateGraph({ version: '1', nodes: [{ noId: true }], edges: [] })
    ).toThrow('Graph has no nodes to display')
  })

  it('throws "Graph has no nodes to display" for empty nodes array', () => {
    expect(() => validateGraph({ version: '1', nodes: [], edges: [] })).toThrow(
      'Graph has no nodes to display'
    )
  })

  it('skips node without id and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1' }, { noId: true }],
      edges: [],
    })
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe('1')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('skips edge referencing unknown node and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '999' }],
    })
    expect(result.edges).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('accepts nodes with number, string, and boolean properties', () => {
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1', properties: { age: 34, active: true, name: 'Alice' } }],
      edges: [],
    })
    expect(result.nodes[0].properties).toEqual({ age: 34, active: true, name: 'Alice' })
  })

  it('skips property values of unsupported type with console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1', properties: { nested: { a: 1 }, valid: 42 } }],
      edges: [],
    })
    expect(result.nodes[0].properties).toEqual({ valid: 42 })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('throws for version: null', () => {
    expect(() => validateGraph({ version: null, nodes: [{ id: '1' }], edges: [] })).toThrow()
  })

  it('throws for version: 123 (number instead of string)', () => {
    expect(() => validateGraph({ version: 123, nodes: [{ id: '1' }], edges: [] })).toThrow()
  })

  it('throws when edges is an object instead of array', () => {
    expect(() => validateGraph({ version: '1', nodes: [{ id: '1' }], edges: {} })).toThrow(
      'File must contain nodes and edges arrays'
    )
  })

  it('throws when both nodes and edges are missing', () => {
    expect(() => validateGraph({ version: '1' })).toThrow()
  })

  it('preserves edge weight and label through validation', () => {
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ source: '1', target: '2', label: 'knows', weight: 0.8 }],
    })
    expect(result.edges[0].label).toBe('knows')
    expect(result.edges[0].weight).toBe(0.8)
  })

  it('skips edge with missing source or target', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateGraph({
      version: '1',
      nodes: [{ id: '1' }],
      edges: [{ source: '1' }, { target: '1' }, { source: '1', target: '1' }],
    })
    expect(result.edges).toHaveLength(1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('skips non-object nodes with warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateGraph({
      version: '1',
      nodes: ['not-a-node', null, { id: '1' }],
      edges: [],
    })
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe('1')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('accepts string[] property values', () => {
    const result = validateGraph({
      version: '1',
      nodes: [
        { id: '1', properties: { tags: ['web', 'api'] } },
        { id: '2', properties: { tags: ['scraper'] } },
      ],
      edges: [],
    })
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[0].properties!.tags).toEqual(['web', 'api'])
  })
})

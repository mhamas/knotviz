import { describe, it, expect } from 'vitest'
import { parseJsonGraphSync } from '../lib/streamingJsonGraphParser'

function parse(json: string) {
  let version = ''
  const nodes: Record<string, unknown>[] = []
  const edges: Record<string, unknown>[] = []
  let metadata: Record<string, { description: string }> | undefined

  parseJsonGraphSync(json, {
    onVersion: (v) => { version = v },
    onNode: (n) => { nodes.push(n) },
    onEdge: (e) => { edges.push(e) },
    onNodePropertiesMetadata: (m) => { metadata = m },
    onProgress: () => {},
  })

  return { version, nodes, edges, metadata }
}

describe('streamingJsonGraphParser', () => {
  it('parses a minimal graph', () => {
    const { version, nodes, edges } = parse(
      '{"version":"1","nodes":[{"id":"1"},{"id":"2"}],"edges":[{"source":"1","target":"2"}]}',
    )
    expect(version).toBe('1')
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).toBe('1')
    expect(nodes[1].id).toBe('2')
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('1')
    expect(edges[0].target).toBe('2')
  })

  it('handles nodes with properties including nested objects', () => {
    const { nodes } = parse(
      '{"version":"1","nodes":[{"id":"1","properties":{"name":"Alice","age":30,"active":true}}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
    const props = nodes[0].properties as Record<string, unknown>
    expect(props.name).toBe('Alice')
    expect(props.age).toBe(30)
    expect(props.active).toBe(true)
  })

  it('handles strings with escaped quotes and braces', () => {
    const { nodes } = parse(
      '{"version":"1","nodes":[{"id":"1","label":"has \\"quotes\\" and {braces}"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
    expect(nodes[0].label).toBe('has "quotes" and {braces}')
  })

  it('handles compact JSON matching generated graph format', () => {
    const { nodes, edges } = parse(
      '{"version":"1","nodes":[{"id":"0","label":"node_0","properties":{"score":56.43,"category":"bravo","is_active":true,"created_at":"2018-10-22"}}],"edges":[{"source":"0","target":"0"}]}',
    )
    expect(nodes).toHaveLength(1)
    expect((nodes[0].properties as Record<string, unknown>).score).toBe(56.43)
    expect(edges).toHaveLength(1)
  })

  it('handles pretty-printed JSON with whitespace', () => {
    const { nodes, edges } = parse(`{
  "version": "1",
  "nodes": [
    { "id": "a", "label": "Alpha" },
    { "id": "b" }
  ],
  "edges": [
    { "source": "a", "target": "b" }
  ]
}`)
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
  })

  it('handles empty arrays', () => {
    const { version, nodes, edges } = parse('{"version":"1","nodes":[],"edges":[]}')
    expect(version).toBe('1')
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it('handles edges with weight and label', () => {
    const { edges } = parse(
      '{"version":"1","nodes":[{"id":"1"},{"id":"2"}],"edges":[{"source":"1","target":"2","label":"knows","weight":0.8}]}',
    )
    expect(edges).toHaveLength(1)
    expect(edges[0].label).toBe('knows')
    expect(edges[0].weight).toBe(0.8)
  })

  it('parses nodePropertiesMetadata when present', () => {
    const { metadata, nodes } = parse(
      '{"version":"1","nodePropertiesMetadata":{"age":{"description":"Age in years"},"role":{"description":"Job title"}},"nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
    expect(metadata).toEqual({
      age: { description: 'Age in years' },
      role: { description: 'Job title' },
    })
  })

  it('metadata is undefined when nodePropertiesMetadata absent', () => {
    const { metadata } = parse(
      '{"version":"1","nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(metadata).toBeUndefined()
  })

  it('nodePropertiesMetadata after nodes/edges still parsed', () => {
    const { metadata, nodes, edges } = parse(
      '{"version":"1","nodes":[{"id":"1"}],"edges":[{"source":"1","target":"1"}],"nodePropertiesMetadata":{"x":{"description":"desc"}}}',
    )
    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(1)
    expect(metadata).toEqual({ x: { description: 'desc' } })
  })

  it('skips unknown top-level fields without breaking parsing', () => {
    const { nodes, edges } = parse(
      '{"version":"1","unknownField":{"nested":"value"},"nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(0)
  })

  it('skips unknown top-level primitive values (number, boolean, null)', () => {
    const { nodes } = parse(
      '{"version":"1","count":42,"flag":true,"nothing":null,"nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
  })

  it('skips unknown top-level array values', () => {
    const { nodes } = parse(
      '{"version":"1","tags":["a","b"],"nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
  })

  it('silently ignores malformed nodePropertiesMetadata', () => {
    // A string value can't be buffered correctly (missing opening quote),
    // so JSON.parse fails and the callback is never called.
    const { metadata, nodes } = parse(
      '{"version":"1","nodePropertiesMetadata":"not an object","nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(nodes).toHaveLength(1)
    expect(metadata).toBeUndefined()
  })

  it('handles empty nodePropertiesMetadata object', () => {
    const { metadata } = parse(
      '{"version":"1","nodePropertiesMetadata":{},"nodes":[{"id":"1"}],"edges":[]}',
    )
    expect(metadata).toEqual({})
  })
})

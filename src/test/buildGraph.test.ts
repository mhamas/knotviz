import { describe, it, expect, vi } from 'vitest'
import { buildGraph } from '../lib/buildGraph'
import type { NullDefaultResult, GraphData } from '../types'

function makeResult(data: GraphData, defaultedByNode?: Map<string, string[]>): NullDefaultResult {
  return {
    data,
    replacementCount: defaultedByNode ? Array.from(defaultedByNode.values()).flat().length : 0,
    defaultedByNode: defaultedByNode ?? new Map(),
  }
}

describe('buildGraph', () => {
  it('returns positionMode "all" when all nodes have x+y, positions preserved', () => {
    const result = makeResult({
      version: '1',
      nodes: [
        { id: '1', x: 10, y: 20 },
        { id: '2', x: 30, y: 40 },
      ],
      edges: [],
    })
    const { graph, positionMode } = buildGraph(result)
    expect(positionMode).toBe('all')
    expect(graph.getNodeAttribute('1', 'x')).toBe(10)
    expect(graph.getNodeAttribute('1', 'y')).toBe(20)
    expect(graph.getNodeAttribute('2', 'x')).toBe(30)
    expect(graph.getNodeAttribute('2', 'y')).toBe(40)
  })

  it('returns positionMode "partial" when some nodes have x+y, all positions randomised', () => {
    const result = makeResult({
      version: '1',
      nodes: [
        { id: '1', x: 10, y: 20 },
        { id: '2' },
      ],
      edges: [],
    })
    const { graph, positionMode } = buildGraph(result)
    expect(positionMode).toBe('partial')
    // Positions should NOT be the original input values
    const x1 = graph.getNodeAttribute('1', 'x') as number
    const y1 = graph.getNodeAttribute('1', 'y') as number
    // Random positions are in [-0.5, 0.5] range, not 10/20
    expect(x1).not.toBe(10)
    expect(y1).not.toBe(20)
  })

  it('returns positionMode "none" when no nodes have x+y, all positions randomised', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [],
    })
    const { graph, positionMode } = buildGraph(result)
    expect(positionMode).toBe('none')
    expect(typeof graph.getNodeAttribute('1', 'x')).toBe('number')
    expect(typeof graph.getNodeAttribute('1', 'y')).toBe('number')
  })

  it('returns correct node and edge counts', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    })
    const { graph } = buildGraph(result)
    expect(graph.order).toBe(3)
    expect(graph.size).toBe(2)
  })

  it('skips edge to unknown node with console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '999' }],
    })
    const { graph } = buildGraph(result)
    expect(graph.size).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('stores node label as Graphology attribute', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', label: 'Alice' }],
      edges: [],
    })
    const { graph } = buildGraph(result)
    expect(graph.getNodeAttribute('1', 'label')).toBe('Alice')
  })

  it('falls back to id when label is missing', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }],
      edges: [],
    })
    const { graph } = buildGraph(result)
    expect(graph.getNodeAttribute('1', 'label')).toBe('1')
  })

  it('stores node properties as Graphology attributes', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', properties: { age: 34, name: 'Alice' } }],
      edges: [],
    })
    const { graph } = buildGraph(result)
    expect(graph.getNodeAttribute('1', 'age')).toBe(34)
    expect(graph.getNodeAttribute('1', 'name')).toBe('Alice')
  })

  it('sets _defaultedProperties from defaultedByNode', () => {
    const defaultedByNode = new Map([['1', ['age', 'name']]])
    const result = makeResult(
      {
        version: '1',
        nodes: [{ id: '1', properties: { age: 0, name: '' } }],
        edges: [],
      },
      defaultedByNode
    )
    const { graph } = buildGraph(result)
    expect(graph.getNodeAttribute('1', '_defaultedProperties')).toEqual(['age', 'name'])
  })

  it('sets _defaultedProperties to empty array for non-defaulted nodes', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', properties: { age: 34 } }],
      edges: [],
    })
    const { graph } = buildGraph(result)
    expect(graph.getNodeAttribute('1', '_defaultedProperties')).toEqual([])
  })
})

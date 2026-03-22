import { describe, it, expect, vi } from 'vitest'
import { buildGraph } from '../lib/buildGraph'
import type { NullDefaultResult, GraphData } from '../types'

function makeResult(data: GraphData): NullDefaultResult {
  return { data, replacementCount: 0 }
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
    const cosmosData = buildGraph(result)
    expect(cosmosData.positionMode).toBe('all')
    expect(cosmosData.initialPositions).toBeDefined()
    expect(cosmosData.initialPositions![0]).toBe(10)
    expect(cosmosData.initialPositions![1]).toBe(20)
    expect(cosmosData.initialPositions![2]).toBe(30)
    expect(cosmosData.initialPositions![3]).toBe(40)
  })

  it('returns positionMode "partial" when some nodes have x+y, positions undefined', () => {
    const result = makeResult({
      version: '1',
      nodes: [
        { id: '1', x: 10, y: 20 },
        { id: '2' },
      ],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.positionMode).toBe('partial')
    // Cosmos will randomize positions itself when initialPositions is undefined
    expect(cosmosData.initialPositions).toBeUndefined()
  })

  it('returns positionMode "none" when no nodes have x+y', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.positionMode).toBe('none')
    expect(cosmosData.initialPositions).toBeUndefined()
  })

  it('returns correct node count and link indices', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.nodes.length).toBe(3)
    expect(cosmosData.linkIndices.length).toBe(4) // 2 edges × 2
    expect(cosmosData.linkIndices[0]).toBe(0) // node '1' index
    expect(cosmosData.linkIndices[1]).toBe(1) // node '2' index
    expect(cosmosData.linkIndices[2]).toBe(1) // node '2' index
    expect(cosmosData.linkIndices[3]).toBe(2) // node '3' index
  })

  it('skips edge to unknown node with console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '999' }],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.linkIndices.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('preserves node labels on original node objects', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', label: 'Alice' }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.nodes[0].label).toBe('Alice')
  })

  it('preserves node properties on original node objects', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', properties: { age: 34, name: 'Alice' } }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.nodes[0].properties?.age).toBe(34)
    expect(cosmosData.nodes[0].properties?.name).toBe('Alice')
  })

  it('builds nodeIndexMap correctly', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.nodeIndexMap.get('a')).toBe(0)
    expect(cosmosData.nodeIndexMap.get('b')).toBe(1)
    expect(cosmosData.nodeIndexMap.get('c')).toBe(2)
  })

  it('preserves edge weight on original edge objects', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ source: '1', target: '2', weight: 0.8 }],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edges[0].weight).toBe(0.8)
  })

  it('preserves edge label on original edge objects', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ source: '1', target: '2', label: 'knows', weight: 1.5 }],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edges[0].label).toBe('knows')
    expect(cosmosData.edges[0].weight).toBe(1.5)
  })
})

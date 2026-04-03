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
    expect(cosmosData.nodeCount).toBe(3)
    expect(cosmosData.linkIndices.length).toBe(4)
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

  it('preserves node labels in compact store', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1', label: 'Alice' }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.nodeLabels[0]).toBe('Alice')
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

  it('preserves edge weight in compact store', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ source: '1', target: '2', weight: 0.8 }],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edgeWeights).toBeDefined()
    expect(cosmosData.edgeWeights![0]).toBeCloseTo(0.8)
  })

  it('preserves edge label in compact store', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ source: '1', target: '2', label: 'knows' }],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edgeLabels[0]).toBe('knows')
  })

  it('computes edgeSortOrder sorted by weight descending', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }],
      edges: [
        { source: '1', target: '2', weight: 0.3 },
        { source: '2', target: '3', weight: 0.9 },
        { source: '3', target: '1', weight: 0.6 },
      ],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edgeSortOrder).toBeDefined()
    expect(cosmosData.edgeSortOrder.length).toBe(3)
    // Highest weight first: edge1 (0.9), edge2 (0.6), edge0 (0.3)
    expect(cosmosData.edgeSortOrder[0]).toBe(1)
    expect(cosmosData.edgeSortOrder[1]).toBe(2)
    expect(cosmosData.edgeSortOrder[2]).toBe(0)
  })

  it('edgeSortOrder is identity when no edges have weights', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.edgeSortOrder.length).toBe(2)
    // No weights → sort is stable identity
    expect(cosmosData.edgeSortOrder[0]).toBe(0)
    expect(cosmosData.edgeSortOrder[1]).toBe(1)
  })

  it('computes maxOutgoingDegree correctly', () => {
    // Star graph: node 1 is source to 2,3,4 → outgoing degree 3
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
      edges: [
        { source: '1', target: '2' },
        { source: '1', target: '3' },
        { source: '1', target: '4' },
      ],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.maxOutgoingDegree).toBe(3)
  })

  it('maxOutgoingDegree counts only outgoing edges', () => {
    // Fan-in: nodes 2,3,4 all point to node 1 → node 1 has 0 outgoing
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
      edges: [
        { source: '2', target: '1' },
        { source: '3', target: '1' },
        { source: '4', target: '1' },
      ],
    })
    const cosmosData = buildGraph(result)
    // Each source node has 1 outgoing edge
    expect(cosmosData.maxOutgoingDegree).toBe(1)
  })

  it('maxOutgoingDegree is 0 for graph with no edges', () => {
    const result = makeResult({
      version: '1',
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [],
    })
    const cosmosData = buildGraph(result)
    expect(cosmosData.maxOutgoingDegree).toBe(0)
  })
})

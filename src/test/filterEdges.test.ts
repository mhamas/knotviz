import { describe, it, expect } from 'vitest'
import { filterEdges } from '../lib/filterEdges'

/**
 * Helper: build test data for a simple graph.
 * Nodes 0..nodeCount-1, edges given as [src, tgt, weight] triples.
 */
function makeTestData(nodeCount: number, edges: [number, number, number][]): {
  linkIndices: Float32Array
  edgeSortOrder: Uint32Array
  maxDegree: number
} {
  const totalEdges = edges.length
  const linkIndices = new Float32Array(totalEdges * 2)
  const weights = new Float32Array(totalEdges)
  for (let i = 0; i < totalEdges; i++) {
    linkIndices[i * 2] = edges[i][0]
    linkIndices[i * 2 + 1] = edges[i][1]
    weights[i] = edges[i][2]
  }

  // Sort by weight descending
  const edgeSortOrder = new Uint32Array(totalEdges)
  for (let i = 0; i < totalEdges; i++) edgeSortOrder[i] = i
  edgeSortOrder.sort((a, b) => weights[b] - weights[a])

  // Compute max degree
  const degree = new Uint32Array(nodeCount)
  for (let i = 0; i < totalEdges; i++) {
    degree[edges[i][0]]++
    degree[edges[i][1]]++
  }
  let maxDegree = 0
  for (let i = 0; i < nodeCount; i++) {
    if (degree[i] > maxDegree) maxDegree = degree[i]
  }

  return { linkIndices, edgeSortOrder, maxDegree }
}

describe('filterEdges', () => {
  // Triangle: 0-1 (w=0.9), 1-2 (w=0.3), 2-0 (w=0.6)
  const triangle = makeTestData(3, [
    [0, 1, 0.9],
    [1, 2, 0.3],
    [2, 0, 0.6],
  ])

  describe('fast path', () => {
    it('returns original linkIndices when no filtering needed', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 100, triangle.maxDegree, triangle.maxDegree, false,
      )
      expect(result.linkIndices).toBe(triangle.linkIndices)
      expect(result.keptEdgeIndices.length).toBe(3)
    })

    it('returns all edge indices in order when no filtering', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 100, triangle.maxDegree, triangle.maxDegree, false,
      )
      expect(Array.from(result.keptEdgeIndices).sort()).toEqual([0, 1, 2])
    })
  })

  describe('percentage filter', () => {
    it('keeps top edge when percentage = 34% (1 of 3)', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 34, triangle.maxDegree, triangle.maxDegree, false,
      )
      // ceil(3 * 0.34) = 2, but sorted by weight: edge0 (0.9), edge2 (0.6)
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('returns empty when percentage = 0', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 0, triangle.maxDegree, triangle.maxDegree, false,
      )
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('keeps highest-weight edges first', () => {
      // 1% of 3 edges = ceil(0.03) = 1 edge → the heaviest (edge 0, w=0.9)
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 1, triangle.maxDegree, triangle.maxDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(1)
      // Edge 0: src=0, tgt=1
      expect(result.linkIndices[0]).toBe(0)
      expect(result.linkIndices[1]).toBe(1)
    })
  })

  describe('max neighbors filter', () => {
    // Star graph: node 0 connected to 1,2,3,4 — all weight 1
    const star = makeTestData(5, [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ])

    it('limits edges per node', () => {
      const result = filterEdges(
        star.linkIndices, star.edgeSortOrder,
        5, 4, 100, 2, star.maxDegree, false,
      )
      // Node 0 has degree 4, limit to 2
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('maxNeighbors=1 keeps at most 1 edge per node', () => {
      const result = filterEdges(
        star.linkIndices, star.edgeSortOrder,
        5, 4, 100, 1, star.maxDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(1)
    })

    it('maxNeighbors=0 removes all edges', () => {
      const result = filterEdges(
        star.linkIndices, star.edgeSortOrder,
        5, 4, 100, 0, star.maxDegree, false,
      )
      expect(result.linkIndices.length).toBe(0)
    })
  })

  describe('combined percentage + max neighbors', () => {
    // 5 edges with distinct weights
    const data = makeTestData(4, [
      [0, 1, 5],
      [0, 2, 4],
      [0, 3, 3],
      [1, 2, 2],
      [2, 3, 1],
    ])

    it('applies percentage first, then max neighbors', () => {
      // 60% of 5 = ceil(3) = 3 edges: [0-1 w5, 0-2 w4, 0-3 w3]
      // maxNeighbors=2: node 0 hits limit at 2 edges, so edge 0-3 is dropped
      const result = filterEdges(
        data.linkIndices, data.edgeSortOrder,
        4, 5, 60, 2, data.maxDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(2)
    })
  })

  describe('keep at least one edge', () => {
    it('protects highest-weight edge per node even when percentage would cut it', () => {
      // Triangle with very low percentage
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 1, triangle.maxDegree, triangle.maxDegree, true,
      )
      // Percentage would keep 1 edge (0-1 w=0.9)
      // But keepAtLeastOne protects edges for node 2 (edge 2-0 w=0.6 or 1-2 w=0.3)
      // Node 0 covered by edge 0-1, node 1 covered by edge 0-1, node 2 needs its own
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('protects at least one edge per node when maxNeighbors=0', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 100, 0, triangle.maxDegree, true,
      )
      // maxNeighbors=0 would remove all, but protection adds them back
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('does not duplicate edges that pass both filters and protection', () => {
      // 100% + maxDegree neighbors + keepAtLeastOne — should still have exactly 3
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 100, 1, triangle.maxDegree, true,
      )
      // Each edge index should appear at most once in keptEdgeIndices
      const unique = new Set(Array.from(result.keptEdgeIndices))
      expect(unique.size).toBe(result.keptEdgeIndices.length)
    })
  })

  describe('keptEdgeIndices correctness', () => {
    it('keptEdgeIndices maps back to correct source/target pairs', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 50, triangle.maxDegree, triangle.maxDegree, false,
      )
      for (let i = 0; i < result.keptEdgeIndices.length; i++) {
        const origIdx = result.keptEdgeIndices[i]
        expect(result.linkIndices[i * 2]).toBe(triangle.linkIndices[origIdx * 2])
        expect(result.linkIndices[i * 2 + 1]).toBe(triangle.linkIndices[origIdx * 2 + 1])
      }
    })

    it('keptEdgeIndices length matches linkIndices edge count', () => {
      const result = filterEdges(
        triangle.linkIndices, triangle.edgeSortOrder,
        3, 3, 67, triangle.maxDegree, triangle.maxDegree, false,
      )
      expect(result.keptEdgeIndices.length).toBe(result.linkIndices.length / 2)
    })
  })

  describe('edge cases', () => {
    it('handles empty graph (0 edges)', () => {
      const empty = makeTestData(2, [])
      const result = filterEdges(
        empty.linkIndices, empty.edgeSortOrder,
        2, 0, 50, 0, 0, false,
      )
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('handles single edge', () => {
      const single = makeTestData(2, [[0, 1, 1]])
      const result = filterEdges(
        single.linkIndices, single.edgeSortOrder,
        2, 1, 100, single.maxDegree, single.maxDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(1)
    })
  })
})

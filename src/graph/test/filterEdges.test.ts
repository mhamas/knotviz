import { describe, it, expect } from 'vitest'
import { filterEdges } from '../lib/filterEdges'

/**
 * Helper: build test data for a simple graph.
 * Edges given as [src, tgt, weight] triples.
 */
function makeTestData(edges: [number, number, number][]): {
  linkIndices: Float32Array
  edgeSortOrder: Uint32Array
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

  return { linkIndices, edgeSortOrder }
}

describe('filterEdges', () => {
  // Triangle: 0-1 (w=0.9), 1-2 (w=0.3), 2-0 (w=0.6)
  const triangle = makeTestData([
    [0, 1, 0.9],
    [1, 2, 0.3],
    [2, 0, 0.6],
  ])

  describe('fast path', () => {
    it('returns original linkIndices when no filtering needed', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 100, false)
      expect(result.linkIndices).toBe(triangle.linkIndices)
      expect(result.keptEdgeIndices.length).toBe(3)
    })

    it('returns all edge indices in order when no filtering', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 100, false)
      expect(Array.from(result.keptEdgeIndices).sort()).toEqual([0, 1, 2])
    })
  })

  describe('percentage filter', () => {
    it('keeps top edges when percentage = 34% (ceil of 3*0.34 = 2)', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 34, false)
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('returns empty when percentage = 0', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 0, false)
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('keeps highest-weight edges first', () => {
      // 1% of 3 edges = ceil(0.03) = 1 edge → the heaviest (edge 0, w=0.9)
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 1, false)
      expect(result.linkIndices.length / 2).toBe(1)
      // Edge 0: src=0, tgt=1
      expect(result.linkIndices[0]).toBe(0)
      expect(result.linkIndices[1]).toBe(1)
    })

    it('keeps 50% of edges', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 50, false)
      // ceil(3 * 0.50) = 2 edges
      expect(result.linkIndices.length / 2).toBe(2)
    })
  })

  describe('keep at least one edge', () => {
    it('protects highest-weight edge per node even when percentage would cut it', () => {
      // Triangle with very low percentage
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 1, true)
      // Percentage would keep 1 edge (0-1 w=0.9)
      // But keepAtLeastOne protects edges for node 2 (edge 2-0 w=0.6 or 1-2 w=0.3)
      // Node 0 covered by edge 0-1, node 1 covered by edge 0-1, node 2 needs its own
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('protects edges when percentage = 0', () => {
      // 0% would remove all, but protection keeps at least one edge per node
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 0, true)
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('does not duplicate edges that pass both filters and protection', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 100, true)
      // Each edge index should appear at most once in keptEdgeIndices
      const unique = new Set(Array.from(result.keptEdgeIndices))
      expect(unique.size).toBe(result.keptEdgeIndices.length)
    })
  })

  describe('keptEdgeIndices correctness', () => {
    it('keptEdgeIndices maps back to correct source/target pairs', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 50, false)
      for (let i = 0; i < result.keptEdgeIndices.length; i++) {
        const origIdx = result.keptEdgeIndices[i]
        expect(result.linkIndices[i * 2]).toBe(triangle.linkIndices[origIdx * 2])
        expect(result.linkIndices[i * 2 + 1]).toBe(triangle.linkIndices[origIdx * 2 + 1])
      }
    })

    it('keptEdgeIndices length matches linkIndices edge count', () => {
      const result = filterEdges(triangle.linkIndices, triangle.edgeSortOrder, 3, 3, 67, false)
      expect(result.keptEdgeIndices.length).toBe(result.linkIndices.length / 2)
    })
  })

  describe('edge cases', () => {
    it('handles empty graph (0 edges)', () => {
      const empty = makeTestData([])
      const result = filterEdges(empty.linkIndices, empty.edgeSortOrder, 2, 0, 50, false)
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('handles single edge', () => {
      const single = makeTestData([[0, 1, 1]])
      const result = filterEdges(single.linkIndices, single.edgeSortOrder, 2, 1, 100, false)
      expect(result.linkIndices.length / 2).toBe(1)
    })

    it('percentage = 100 on star graph keeps all edges', () => {
      const star = makeTestData([
        [0, 1, 4],
        [0, 2, 3],
        [0, 3, 2],
        [0, 4, 1],
      ])
      const result = filterEdges(star.linkIndices, star.edgeSortOrder, 5, 4, 100, false)
      expect(result.linkIndices).toBe(star.linkIndices)
      expect(result.keptEdgeIndices.length).toBe(4)
    })
  })
})

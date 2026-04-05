import { describe, it, expect } from 'vitest'
import { filterEdges } from '../lib/filterEdges'

/**
 * Helper: build test data for a simple graph.
 * Nodes 0..nodeCount-1, edges given as [src, tgt, weight] triples.
 */
function makeTestData(nodeCount: number, edges: [number, number, number][]): {
  linkIndices: Float32Array
  edgeSortOrder: Uint32Array
  maxOutgoingDegree: number
  maxIncomingDegree: number
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

  // Compute max outgoing degree (source only)
  const outDegree = new Uint32Array(nodeCount)
  for (let i = 0; i < totalEdges; i++) {
    outDegree[edges[i][0]]++
  }
  let maxOutgoingDegree = 0
  for (let i = 0; i < nodeCount; i++) {
    if (outDegree[i] > maxOutgoingDegree) maxOutgoingDegree = outDegree[i]
  }

  // Compute max incoming degree (target only)
  const inDegree = new Uint32Array(nodeCount)
  for (let i = 0; i < totalEdges; i++) {
    inDegree[edges[i][1]]++
  }
  let maxIncomingDegree = 0
  for (let i = 0; i < nodeCount; i++) {
    if (inDegree[i] > maxIncomingDegree) maxIncomingDegree = inDegree[i]
  }

  return { linkIndices, edgeSortOrder, maxOutgoingDegree, maxIncomingDegree }
}

/** Shorthand: call filterEdges with no incoming limit (pass maxIncomingDegree for both). */
function filterNoIncoming(
  data: ReturnType<typeof makeTestData>,
  nodeCount: number,
  edgePercentage: number,
  maxOutgoing: number,
  isKeepAtLeastOne: boolean,
) {
  return filterEdges(
    data.linkIndices, data.edgeSortOrder,
    nodeCount, data.linkIndices.length / 2,
    edgePercentage, maxOutgoing, data.maxOutgoingDegree,
    data.maxIncomingDegree, data.maxIncomingDegree,
    isKeepAtLeastOne,
  )
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
      const result = filterNoIncoming(triangle, 3, 100, triangle.maxOutgoingDegree, false)
      expect(result.linkIndices).toBe(triangle.linkIndices)
      expect(result.keptEdgeIndices.length).toBe(3)
    })

    it('returns all edge indices in order when no filtering', () => {
      const result = filterNoIncoming(triangle, 3, 100, triangle.maxOutgoingDegree, false)
      expect(Array.from(result.keptEdgeIndices).sort()).toEqual([0, 1, 2])
    })

    it('returns correct sliderMax values on fast path', () => {
      const result = filterNoIncoming(triangle, 3, 100, triangle.maxOutgoingDegree, false)
      expect(result.sliderMaxOutgoing).toBe(triangle.maxOutgoingDegree)
      expect(result.sliderMaxIncoming).toBe(triangle.maxIncomingDegree)
    })
  })

  describe('percentage filter', () => {
    it('keeps top edge when percentage = 34% (1 of 3)', () => {
      const result = filterNoIncoming(triangle, 3, 34, triangle.maxOutgoingDegree, false)
      // ceil(3 * 0.34) = 2, but sorted by weight: edge0 (0.9), edge2 (0.6)
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('returns empty when percentage = 0', () => {
      const result = filterNoIncoming(triangle, 3, 0, triangle.maxOutgoingDegree, false)
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('keeps highest-weight edges first', () => {
      // 1% of 3 edges = ceil(0.03) = 1 edge → the heaviest (edge 0, w=0.9)
      const result = filterNoIncoming(triangle, 3, 1, triangle.maxOutgoingDegree, false)
      expect(result.linkIndices.length / 2).toBe(1)
      // Edge 0: src=0, tgt=1
      expect(result.linkIndices[0]).toBe(0)
      expect(result.linkIndices[1]).toBe(1)
    })
  })

  describe('max outgoing filter', () => {
    // Star graph: node 0 is source to 1,2,3,4 — all weight 1
    const star = makeTestData(5, [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ])

    it('limits outgoing edges per source node', () => {
      const result = filterNoIncoming(star, 5, 100, 2, false)
      // Node 0 has 4 outgoing edges, limit to 2
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('maxOutgoing=1 keeps at most 1 outgoing edge per node', () => {
      const result = filterNoIncoming(star, 5, 100, 1, false)
      expect(result.linkIndices.length / 2).toBe(1)
    })

    it('maxOutgoing=0 removes all edges', () => {
      const result = filterNoIncoming(star, 5, 100, 0, false)
      expect(result.linkIndices.length).toBe(0)
    })

    it('does not cap target nodes (incoming edges are not limited)', () => {
      // Fan-in: nodes 1,2,3 all point to node 0
      const fanIn = makeTestData(4, [
        [1, 0, 1],
        [2, 0, 1],
        [3, 0, 1],
      ])
      // maxOutgoing=1: each source has 1 outgoing, so all edges pass
      const result = filterNoIncoming(fanIn, 4, 100, 1, false)
      expect(result.linkIndices.length / 2).toBe(3)
    })
  })

  describe('max incoming filter', () => {
    // Fan-in: nodes 1,2,3,4 all point to node 0
    const fanIn = makeTestData(5, [
      [1, 0, 4],
      [2, 0, 3],
      [3, 0, 2],
      [4, 0, 1],
    ])

    it('limits incoming edges per target node', () => {
      const result = filterEdges(
        fanIn.linkIndices, fanIn.edgeSortOrder,
        5, 4, 100, fanIn.maxOutgoingDegree, fanIn.maxOutgoingDegree,
        2, fanIn.maxIncomingDegree, false,
      )
      // Node 0 has 4 incoming edges, limit to 2 (highest weight: w=4, w=3)
      expect(result.linkIndices.length / 2).toBe(2)
    })

    it('maxIncoming=1 keeps at most 1 incoming edge per node', () => {
      const result = filterEdges(
        fanIn.linkIndices, fanIn.edgeSortOrder,
        5, 4, 100, fanIn.maxOutgoingDegree, fanIn.maxOutgoingDegree,
        1, fanIn.maxIncomingDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(1)
      // Highest weight edge: 1→0 (w=4)
      expect(result.linkIndices[0]).toBe(1)
      expect(result.linkIndices[1]).toBe(0)
    })

    it('maxIncoming=0 removes all edges', () => {
      const result = filterEdges(
        fanIn.linkIndices, fanIn.edgeSortOrder,
        5, 4, 100, fanIn.maxOutgoingDegree, fanIn.maxOutgoingDegree,
        0, fanIn.maxIncomingDegree, false,
      )
      expect(result.linkIndices.length).toBe(0)
    })

    it('does not cap source nodes (outgoing edges are not limited by incoming filter)', () => {
      // Star-out: node 0 sends to 1,2,3
      const starOut = makeTestData(4, [
        [0, 1, 1],
        [0, 2, 1],
        [0, 3, 1],
      ])
      // maxIncoming=1: each target has 1 incoming, so all edges pass
      const result = filterEdges(
        starOut.linkIndices, starOut.edgeSortOrder,
        4, 3, 100, starOut.maxOutgoingDegree, starOut.maxOutgoingDegree,
        1, starOut.maxIncomingDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(3)
    })
  })

  describe('combined percentage + max outgoing', () => {
    // 5 edges with distinct weights
    const data = makeTestData(4, [
      [0, 1, 5],
      [0, 2, 4],
      [0, 3, 3],
      [1, 2, 2],
      [2, 3, 1],
    ])

    it('applies percentage first, then max outgoing', () => {
      // 60% of 5 = ceil(3) = 3 edges: [0-1 w5, 0-2 w4, 0-3 w3]
      // maxOutgoing=2: node 0 hits limit at 2 outgoing edges, so edge 0-3 is dropped
      const result = filterNoIncoming(data, 4, 60, 2, false)
      expect(result.linkIndices.length / 2).toBe(2)
    })
  })

  describe('combined percentage + outgoing + incoming', () => {
    // 6 edges with distinct weights
    const data = makeTestData(4, [
      [0, 1, 6], // 0→1
      [0, 2, 5], // 0→2
      [0, 3, 4], // 0→3
      [1, 3, 3], // 1→3
      [2, 3, 2], // 2→3
      [3, 1, 1], // 3→1
    ])

    it('applies all three filters in order: pct → outgoing → incoming', () => {
      // 100% keeps all 6 edges
      // maxOutgoing=2: node 0 has 3 outgoing, capped to 2 → keeps 0→1(w6), 0→2(w5), drops 0→3(w4)
      //   Remaining: 0→1, 0→2, 1→3, 2→3, 3→1
      // maxIncoming=1: node 3 has 2 incoming (1→3, 2→3), capped to 1 → keeps 1→3(w3), drops 2→3(w2)
      //   node 1 has 2 incoming (0→1, 3→1), capped to 1 → keeps 0→1(w6), drops 3→1(w1)
      //   Final: 0→1, 0→2, 1→3 = 3 edges
      const result = filterEdges(
        data.linkIndices, data.edgeSortOrder,
        4, 6, 100, 2, data.maxOutgoingDegree,
        1, data.maxIncomingDegree, false,
      )
      expect(result.linkIndices.length / 2).toBe(3)
    })
  })

  describe('slider max values', () => {
    // Star-out: node 0 → 1,2,3,4 (weights 4,3,2,1)
    const star = makeTestData(5, [
      [0, 1, 4],
      [0, 2, 3],
      [0, 3, 2],
      [0, 4, 1],
    ])

    it('sliderMaxOutgoing reflects max outgoing after percentage filter', () => {
      // 50% of 4 = ceil(2) = 2 edges: node 0 has 2 outgoing after pct
      const result = filterEdges(
        star.linkIndices, star.edgeSortOrder,
        5, 4, 50, star.maxOutgoingDegree, star.maxOutgoingDegree,
        star.maxIncomingDegree, star.maxIncomingDegree, false,
      )
      expect(result.sliderMaxOutgoing).toBe(2)
    })

    it('sliderMaxIncoming reflects max incoming after pct + outgoing filter', () => {
      // Fan-in: 1→0(w4), 2→0(w3), 3→0(w2), 4→0(w1)
      const fanIn = makeTestData(5, [
        [1, 0, 4],
        [2, 0, 3],
        [3, 0, 2],
        [4, 0, 1],
      ])
      // 100%, maxOutgoing=1 (each source has 1 outgoing so all pass)
      // After outgoing filter: node 0 has 4 incoming → sliderMaxIncoming = 4
      const result = filterEdges(
        fanIn.linkIndices, fanIn.edgeSortOrder,
        5, 4, 100, 1, fanIn.maxOutgoingDegree,
        fanIn.maxIncomingDegree, fanIn.maxIncomingDegree, false,
      )
      expect(result.sliderMaxIncoming).toBe(4)

      // Now 50%: only top 2 edges survive pct → node 0 has 2 incoming
      const result2 = filterEdges(
        fanIn.linkIndices, fanIn.edgeSortOrder,
        5, 4, 50, fanIn.maxOutgoingDegree, fanIn.maxOutgoingDegree,
        fanIn.maxIncomingDegree, fanIn.maxIncomingDegree, false,
      )
      expect(result2.sliderMaxIncoming).toBe(2)
    })
  })

  describe('keep at least one edge', () => {
    it('protects highest-weight edge per node even when percentage would cut it', () => {
      // Triangle with very low percentage
      const result = filterNoIncoming(triangle, 3, 1, triangle.maxOutgoingDegree, true)
      // Percentage would keep 1 edge (0-1 w=0.9)
      // But keepAtLeastOne protects edges for node 2 (edge 2-0 w=0.6 or 1-2 w=0.3)
      // Node 0 covered by edge 0-1, node 1 covered by edge 0-1, node 2 needs its own
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('protects at least one edge per node when maxOutgoing=0', () => {
      const result = filterNoIncoming(triangle, 3, 100, 0, true)
      // maxOutgoing=0 would remove all, but protection adds them back
      expect(result.linkIndices.length / 2).toBeGreaterThanOrEqual(2)
    })

    it('does not duplicate edges that pass both filters and protection', () => {
      const result = filterNoIncoming(triangle, 3, 100, 1, true)
      // Each edge index should appear at most once in keptEdgeIndices
      const unique = new Set(Array.from(result.keptEdgeIndices))
      expect(unique.size).toBe(result.keptEdgeIndices.length)
    })
  })

  describe('keptEdgeIndices correctness', () => {
    it('keptEdgeIndices maps back to correct source/target pairs', () => {
      const result = filterNoIncoming(triangle, 3, 50, triangle.maxOutgoingDegree, false)
      for (let i = 0; i < result.keptEdgeIndices.length; i++) {
        const origIdx = result.keptEdgeIndices[i]
        expect(result.linkIndices[i * 2]).toBe(triangle.linkIndices[origIdx * 2])
        expect(result.linkIndices[i * 2 + 1]).toBe(triangle.linkIndices[origIdx * 2 + 1])
      }
    })

    it('keptEdgeIndices length matches linkIndices edge count', () => {
      const result = filterNoIncoming(triangle, 3, 67, triangle.maxOutgoingDegree, false)
      expect(result.keptEdgeIndices.length).toBe(result.linkIndices.length / 2)
    })
  })

  describe('edge cases', () => {
    it('handles empty graph (0 edges)', () => {
      const empty = makeTestData(2, [])
      const result = filterEdges(
        empty.linkIndices, empty.edgeSortOrder,
        2, 0, 50, 0, 0, 0, 0, false,
      )
      expect(result.linkIndices.length).toBe(0)
      expect(result.keptEdgeIndices.length).toBe(0)
    })

    it('handles single edge', () => {
      const single = makeTestData(2, [[0, 1, 1]])
      const result = filterNoIncoming(single, 2, 100, single.maxOutgoingDegree, false)
      expect(result.linkIndices.length / 2).toBe(1)
    })
  })
})

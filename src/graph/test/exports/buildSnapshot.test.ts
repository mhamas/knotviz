import { describe, expect, it } from 'vitest'
import { buildExportSnapshot } from '../../lib/exports/buildSnapshot'
import type { CosmosGraphData } from '../../types'

function cosmosData(): CosmosGraphData {
  return {
    nodeCount: 2,
    nodeIds: ['n1', 'n2'],
    nodeLabels: ['Alice', 'Bob'],
    nodeIndexMap: new Map([['n1', 0], ['n2', 1]]),
    edgeSources: new Uint32Array([0]),
    edgeTargets: new Uint32Array([1]),
    edgeLabels: [undefined],
    edgeWeights: new Float32Array([0.8]),
    edgeSortOrder: new Uint32Array([0]),
    linkIndices: new Float32Array([0, 1]),
    positionMode: 'all',
    initialPositions: undefined,
  }
}

describe('buildExportSnapshot', () => {
  it('walks visible nodes and surviving edges into an ExportSnapshot', () => {
    const positions = [10, 20, 30, 40]
    const snap = buildExportSnapshot(
      positions,
      cosmosData(),
      undefined,
      [0],
      [{ key: 'age', type: 'number' }],
      { age: [34, 28] },
    )
    expect(snap.nodes).toHaveLength(2)
    expect(snap.nodes[0]).toMatchObject({ id: 'n1', x: 10, y: 20, label: 'Alice', properties: { age: 34 } })
    expect(snap.edges).toHaveLength(1)
    expect(snap.edges[0].source).toBe('n1')
    expect(snap.edges[0].target).toBe('n2')
    // Float32Array stores 0.8 as ~0.800000011920929; the snapshot keeps
    // the Float32 value since no round-trip normalisation happens here.
    expect(snap.edges[0].weight).toBeCloseTo(0.8, 3)
  })

  it('respects the visibleNodes bitmask', () => {
    const visible = new Uint8Array([1, 0])
    const snap = buildExportSnapshot([0, 0, 0, 0], cosmosData(), visible, [0], [], {})
    expect(snap.nodes.map((n) => n.id)).toEqual(['n1'])
    // Edge n1→n2 skipped because n2 is hidden.
    expect(snap.edges).toHaveLength(0)
  })

  it('drops non-finite numeric property values so every serializer sees clean data', () => {
    // An Infinity / NaN in a property would round-trip as "Infinity" text
    // or be rejected by XML parsers on re-import. Strip at the snapshot
    // boundary and every downstream serializer stays happy.
    const snap = buildExportSnapshot(
      [0, 0, 0, 0],
      cosmosData(),
      undefined,
      [0],
      [{ key: 'age', type: 'number' }],
      { age: [Number.POSITIVE_INFINITY, Number.NaN] },
    )
    expect(snap.nodes[0].properties).toEqual({})
    expect(snap.nodes[1].properties).toEqual({})
  })

  it('clamps non-finite positions to zero (cosmos edge case)', () => {
    const snap = buildExportSnapshot(
      [Number.NaN, Number.POSITIVE_INFINITY, 5, 6],
      cosmosData(),
      undefined,
      [0],
      [],
      {},
    )
    expect(snap.nodes[0].x).toBe(0)
    expect(snap.nodes[0].y).toBe(0)
    expect(snap.nodes[1].x).toBe(5)
    expect(snap.nodes[1].y).toBe(6)
  })

  it('drops empty-string node labels', () => {
    const data = cosmosData()
    data.nodeLabels = ['', 'Bob']
    const snap = buildExportSnapshot([0, 0, 0, 0], data, undefined, [0], [], {})
    expect(snap.nodes[0].label).toBeUndefined()
    expect(snap.nodes[1].label).toBe('Bob')
  })

  it('omits zero edge weights (treated as "no weight")', () => {
    const data = cosmosData()
    data.edgeWeights = new Float32Array([0])
    const snap = buildExportSnapshot([0, 0, 0, 0], data, undefined, [0], [], {})
    expect(snap.edges[0].weight).toBeUndefined()
  })
})

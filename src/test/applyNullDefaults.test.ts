import { describe, it, expect } from 'vitest'
import { applyNullDefaults } from '../lib/applyNullDefaults'
import type { GraphData } from '../types'

function makeGraph(nodes: GraphData['nodes']): GraphData {
  return { version: '1', nodes, edges: [] }
}

describe('applyNullDefaults', () => {
  it('returns replacementCount 0 when no values are missing', () => {
    const graph = makeGraph([
      { id: '1', properties: { age: 34, name: 'Alice' } },
      { id: '2', properties: { age: 28, name: 'Bob' } },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(0)
  })

  it('replaces missing number property with 0', () => {
    const graph = makeGraph([
      { id: '1', properties: { age: 34 } },
      { id: '2', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(1)
    expect(result.data.nodes[1].properties!.age).toBe(0)
  })

  it('replaces missing string property with ""', () => {
    const graph = makeGraph([
      { id: '1', properties: { name: 'Alice' } },
      { id: '2', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(1)
    expect(result.data.nodes[1].properties!.name).toBe('')
  })

  it('replaces missing string[] property with []', () => {
    const graph = makeGraph([
      { id: '1', properties: { tags: ['a', 'b'] } },
      { id: '2', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(1)
    expect(result.data.nodes[1].properties!.tags).toEqual([])
  })

  it('replaces missing boolean property with false', () => {
    const graph = makeGraph([
      { id: '1', properties: { active: true } },
      { id: '2', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(1)
    expect(result.data.nodes[1].properties!.active).toBe(false)
  })

  it('replaces missing date property with "1970-01-01"', () => {
    const graph = makeGraph([
      { id: '1', properties: { joined: '2021-03-15' } },
      { id: '2', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    expect(result.replacementCount).toBe(1)
    expect(result.data.nodes[1].properties!.joined).toBe('1970-01-01')
  })

  it('handles multiple nodes missing multiple keys with correct total count', () => {
    const graph = makeGraph([
      { id: '1', properties: { age: 34, name: 'Alice', active: true } },
      { id: '2', properties: { age: 28 } },
      { id: '3', properties: {} },
    ])
    const result = applyNullDefaults(graph)
    // node 2 missing: name, active (2)
    // node 3 missing: age, name, active (3)
    expect(result.replacementCount).toBe(5)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphStore, STORE_DEFAULTS } from '../stores/useGraphStore'

describe('useGraphStore', () => {
  beforeEach(() => {
    useGraphStore.getState().resetStore()
  })

  it('starts with correct defaults', () => {
    const state = useGraphStore.getState()
    expect(state.nodeSize).toBe(3)
    expect(state.edgeSize).toBe(0.5)
    expect(state.isEdgesVisible).toBe(true)
    expect(state.isNodeLabelsVisible).toBe(false)
    expect(state.isHighlightNeighbors).toBe(false)
    expect(state.repulsion).toBe(1.0)
    expect(state.friction).toBe(0.85)
    expect(state.linkSpring).toBe(1.0)
    expect(state.decay).toBe(5000)
    expect(state.isGraphLoaded).toBe(false)
    expect(state.nodeCount).toBe(0)
    expect(state.edgeCount).toBe(0)
  })

  it('setNodeSize updates nodeSize', () => {
    useGraphStore.getState().setNodeSize(8)
    expect(useGraphStore.getState().nodeSize).toBe(8)
  })

  it('setEdgeSize updates edgeSize', () => {
    useGraphStore.getState().setEdgeSize(0.5)
    expect(useGraphStore.getState().edgeSize).toBe(0.5)
  })

  it('setIsEdgesVisible updates isEdgesVisible', () => {
    useGraphStore.getState().setIsEdgesVisible(false)
    expect(useGraphStore.getState().isEdgesVisible).toBe(false)
  })

  it('setIsNodeLabelsVisible updates isNodeLabelsVisible', () => {
    useGraphStore.getState().setIsNodeLabelsVisible(true)
    expect(useGraphStore.getState().isNodeLabelsVisible).toBe(true)
  })

  it('setIsHighlightNeighbors updates isHighlightNeighbors', () => {
    useGraphStore.getState().setIsHighlightNeighbors(true)
    expect(useGraphStore.getState().isHighlightNeighbors).toBe(true)
  })

  it('setRepulsion updates repulsion', () => {
    useGraphStore.getState().setRepulsion(2.0)
    expect(useGraphStore.getState().repulsion).toBe(2.0)
  })

  it('setGraphLoaded sets isGraphLoaded and counts', () => {
    useGraphStore.getState().setGraphLoaded(100, 200)
    const state = useGraphStore.getState()
    expect(state.isGraphLoaded).toBe(true)
    expect(state.nodeCount).toBe(100)
    expect(state.edgeCount).toBe(200)
    expect(state.nodeSize).toBe(STORE_DEFAULTS.nodeSize)
    expect(state.edgeSize).toBe(STORE_DEFAULTS.edgeSize)
  })

  it('resetStore returns all fields to defaults', () => {
    // Mutate everything
    const s = useGraphStore.getState()
    s.setNodeSize(10)
    s.setEdgeSize(2)
    s.setIsEdgesVisible(false)
    s.setIsNodeLabelsVisible(true)
    s.setIsHighlightNeighbors(true)
    s.setRepulsion(5)
    s.setFriction(0.5)
    s.setLinkSpring(2)
    s.setDecay(10000)
    s.setGraphLoaded(50, 100)

    // Reset
    useGraphStore.getState().resetStore()

    const reset = useGraphStore.getState()
    expect(reset.nodeSize).toBe(STORE_DEFAULTS.nodeSize)
    expect(reset.edgeSize).toBe(STORE_DEFAULTS.edgeSize)
    expect(reset.isEdgesVisible).toBe(STORE_DEFAULTS.isEdgesVisible)
    expect(reset.isNodeLabelsVisible).toBe(STORE_DEFAULTS.isNodeLabelsVisible)
    expect(reset.isHighlightNeighbors).toBe(STORE_DEFAULTS.isHighlightNeighbors)
    expect(reset.repulsion).toBe(STORE_DEFAULTS.repulsion)
    expect(reset.friction).toBe(STORE_DEFAULTS.friction)
    expect(reset.isGraphLoaded).toBe(false)
    expect(reset.nodeCount).toBe(0)
    expect(reset.edgeCount).toBe(0)
  })
})

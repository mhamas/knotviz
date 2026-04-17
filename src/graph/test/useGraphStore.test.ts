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
    expect(state.isEdgeDirectionality).toBe(false)
    expect(state.isNodeLabelsVisible).toBe(false)
    expect(state.isHighlightNeighbors).toBe(false)
    expect(state.repulsion).toBe(1.0)
    expect(state.friction).toBe(0.85)
    expect(state.linkSpring).toBe(1.0)
    expect(state.decay).toBe(5000)
    expect(state.edgePercentage).toBe(100)
    expect(state.isKeepAtLeastOneEdge).toBe(false)
    expect(state.isGraphLoaded).toBe(false)
    expect(state.nodeCount).toBe(0)
    expect(state.edgeCount).toBe(0)
    expect(state.matchingNodeCount).toBe(0)
    expect(state.visibleEdgeCount).toBe(0)
    expect(state.outgoingDegreeHistogram).toEqual([])
    expect(state.searchQuery).toBe('')
    expect(state.highlightedNodeCount).toBeNull()
    expect(state.searchMatches).toEqual([])
  })

  it('setSearchMatches updates searchMatches', () => {
    const matches = [{ id: '1', label: 'Alice' }, { id: '2', label: 'Bob' }]
    useGraphStore.getState().setSearchMatches(matches)
    expect(useGraphStore.getState().searchMatches).toEqual(matches)
  })

  it('setSearchQuery updates searchQuery', () => {
    useGraphStore.getState().setSearchQuery('foo')
    expect(useGraphStore.getState().searchQuery).toBe('foo')
  })

  it('setHighlightedNodeCount updates highlightedNodeCount', () => {
    useGraphStore.getState().setHighlightedNodeCount(7)
    expect(useGraphStore.getState().highlightedNodeCount).toBe(7)
    useGraphStore.getState().setHighlightedNodeCount(null)
    expect(useGraphStore.getState().highlightedNodeCount).toBeNull()
  })

  it('resetStore clears searchQuery, highlightedNodeCount, and searchMatches', () => {
    useGraphStore.getState().setSearchQuery('abc')
    useGraphStore.getState().setHighlightedNodeCount(5)
    useGraphStore.getState().setSearchMatches([{ id: '1', label: 'Alice' }])
    useGraphStore.getState().resetStore()
    expect(useGraphStore.getState().searchQuery).toBe('')
    expect(useGraphStore.getState().highlightedNodeCount).toBeNull()
    expect(useGraphStore.getState().searchMatches).toEqual([])
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

  it('setIsEdgeDirectionality updates isEdgeDirectionality', () => {
    useGraphStore.getState().setIsEdgeDirectionality(true)
    expect(useGraphStore.getState().isEdgeDirectionality).toBe(true)
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

  it('setEdgePercentage updates edgePercentage', () => {
    useGraphStore.getState().setEdgePercentage(50)
    expect(useGraphStore.getState().edgePercentage).toBe(50)
  })

  it('setIsKeepAtLeastOneEdge updates isKeepAtLeastOneEdge', () => {
    useGraphStore.getState().setIsKeepAtLeastOneEdge(true)
    expect(useGraphStore.getState().isKeepAtLeastOneEdge).toBe(true)
  })

  it('setVisibleState updates matching counts and histogram', () => {
    const histogram = [{ from: 0, to: 5, count: 3 }]
    useGraphStore.getState().setVisibleState(42, 100, histogram)
    const state = useGraphStore.getState()
    expect(state.matchingNodeCount).toBe(42)
    expect(state.visibleEdgeCount).toBe(100)
    expect(state.outgoingDegreeHistogram).toEqual(histogram)
  })

  it('resetStore returns all fields to defaults', () => {
    // Mutate everything
    const s = useGraphStore.getState()
    s.setNodeSize(10)
    s.setEdgeSize(2)
    s.setIsEdgesVisible(false)
    s.setIsEdgeDirectionality(true)
    s.setIsNodeLabelsVisible(true)
    s.setIsHighlightNeighbors(true)
    s.setRepulsion(5)
    s.setFriction(0.5)
    s.setLinkSpring(2)
    s.setDecay(10000)
    s.setEdgePercentage(25)
    s.setIsKeepAtLeastOneEdge(true)
    s.setGraphLoaded(50, 100)
    s.setVisibleState(30, 80, [{ from: 0, to: 1, count: 5 }])

    // Reset
    useGraphStore.getState().resetStore()

    const reset = useGraphStore.getState()
    expect(reset.nodeSize).toBe(STORE_DEFAULTS.nodeSize)
    expect(reset.edgeSize).toBe(STORE_DEFAULTS.edgeSize)
    expect(reset.isEdgesVisible).toBe(STORE_DEFAULTS.isEdgesVisible)
    expect(reset.isEdgeDirectionality).toBe(STORE_DEFAULTS.isEdgeDirectionality)
    expect(reset.isNodeLabelsVisible).toBe(STORE_DEFAULTS.isNodeLabelsVisible)
    expect(reset.isHighlightNeighbors).toBe(STORE_DEFAULTS.isHighlightNeighbors)
    expect(reset.repulsion).toBe(STORE_DEFAULTS.repulsion)
    expect(reset.friction).toBe(STORE_DEFAULTS.friction)
    expect(reset.edgePercentage).toBe(STORE_DEFAULTS.edgePercentage)
    expect(reset.isKeepAtLeastOneEdge).toBe(STORE_DEFAULTS.isKeepAtLeastOneEdge)
    expect(reset.isGraphLoaded).toBe(false)
    expect(reset.nodeCount).toBe(0)
    expect(reset.edgeCount).toBe(0)
    expect(reset.matchingNodeCount).toBe(0)
    expect(reset.visibleEdgeCount).toBe(0)
    expect(reset.outgoingDegreeHistogram).toEqual([])
  })
})

import { create } from 'zustand'
import type { HistogramBucket } from '../types'

interface DisplayState {
  nodeSize: number
  edgeSize: number
  isEdgesVisible: boolean
  isEdgeDirectionality: boolean
  isNodeLabelsVisible: boolean
  isHighlightNeighbors: boolean
}

interface SimulationState {
  repulsion: number
  friction: number
  linkSpring: number
  decay: number
  edgePercentage: number
  isKeepAtLeastOneEdge: boolean
}

interface GraphMeta {
  isGraphLoaded: boolean
  nodeCount: number
  edgeCount: number
  matchingNodeCount: number
  visibleEdgeCount: number
  outgoingDegreeHistogram: HistogramBucket[]
  /** Substring search query for the "highlight subset" mode. Empty = inactive. */
  searchQuery: string
  /** Node count matching the active search; `null` when no search is active. */
  highlightedNodeCount: number | null
}

interface Actions {
  setNodeSize: (v: number) => void
  setEdgeSize: (v: number) => void
  setIsEdgesVisible: (v: boolean) => void
  setIsEdgeDirectionality: (v: boolean) => void
  setIsNodeLabelsVisible: (v: boolean) => void
  setIsHighlightNeighbors: (v: boolean) => void
  setRepulsion: (v: number) => void
  setFriction: (v: number) => void
  setLinkSpring: (v: number) => void
  setDecay: (v: number) => void
  setEdgePercentage: (v: number) => void
  setIsKeepAtLeastOneEdge: (v: boolean) => void
  setGraphLoaded: (nodeCount: number, edgeCount: number) => void
  setVisibleState: (matchingNodeCount: number, visibleEdgeCount: number, outgoingDegreeHistogram: HistogramBucket[]) => void
  setSearchQuery: (q: string) => void
  setHighlightedNodeCount: (n: number | null) => void
  resetStore: () => void
}

export type GraphStore = DisplayState & SimulationState & GraphMeta & Actions

/**
 * Default values for all non-action store fields.
 * Used by resetStore and available to tests.
 */
export const STORE_DEFAULTS: DisplayState & SimulationState & GraphMeta = {
  nodeSize: 3,
  edgeSize: 0.5,
  isEdgesVisible: true,
  isEdgeDirectionality: false,
  isNodeLabelsVisible: false,
  isHighlightNeighbors: false,
  repulsion: 1.0,
  friction: 0.85,
  linkSpring: 1.0,
  decay: 5000,
  edgePercentage: 100,
  isKeepAtLeastOneEdge: false,
  isGraphLoaded: false,
  nodeCount: 0,
  edgeCount: 0,
  matchingNodeCount: 0,
  visibleEdgeCount: 0,
  outgoingDegreeHistogram: [],
  searchQuery: '',
  highlightedNodeCount: null,
}

/**
 * Global store for display settings, simulation parameters, and graph metadata.
 * Components subscribe to individual fields via selectors to avoid unnecessary re-renders.
 *
 * @example
 * const nodeSize = useGraphStore(s => s.nodeSize)
 * const setNodeSize = useGraphStore(s => s.setNodeSize)
 */
export const useGraphStore = create<GraphStore>()((set) => ({
  ...STORE_DEFAULTS,

  setNodeSize: (v): void => set({ nodeSize: v }),
  setEdgeSize: (v): void => set({ edgeSize: v }),
  setIsEdgesVisible: (v): void => set({ isEdgesVisible: v }),
  setIsEdgeDirectionality: (v): void => set({ isEdgeDirectionality: v }),
  setIsNodeLabelsVisible: (v): void => set({ isNodeLabelsVisible: v }),
  setIsHighlightNeighbors: (v): void => set({ isHighlightNeighbors: v }),
  setRepulsion: (v): void => set({ repulsion: v }),
  setFriction: (v): void => set({ friction: v }),
  setLinkSpring: (v): void => set({ linkSpring: v }),
  setDecay: (v): void => set({ decay: v }),
  setEdgePercentage: (v): void => set({ edgePercentage: v }),
  setIsKeepAtLeastOneEdge: (v): void => set({ isKeepAtLeastOneEdge: v }),
  setGraphLoaded: (nodeCount, edgeCount): void => {
    set({ isGraphLoaded: true, nodeCount, edgeCount })
  },
  setVisibleState: (matchingNodeCount, visibleEdgeCount, outgoingDegreeHistogram): void => {
    set({ matchingNodeCount, visibleEdgeCount, outgoingDegreeHistogram })
  },
  setSearchQuery: (q): void => set({ searchQuery: q }),
  setHighlightedNodeCount: (n): void => set({ highlightedNodeCount: n }),
  resetStore: (): void => set(STORE_DEFAULTS),
}))

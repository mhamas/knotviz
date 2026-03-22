import { create } from 'zustand'

interface DisplayState {
  nodeSize: number
  edgeSize: number
  isEdgesVisible: boolean
  isNodeLabelsVisible: boolean
  isHighlightNeighbors: boolean
}

interface SimulationState {
  repulsion: number
  gravity: number
  friction: number
  linkSpring: number
  decay: number
}

interface GraphMeta {
  isGraphLoaded: boolean
  nodeCount: number
  edgeCount: number
}

interface Actions {
  setNodeSize: (v: number) => void
  setEdgeSize: (v: number) => void
  setIsEdgesVisible: (v: boolean) => void
  setIsNodeLabelsVisible: (v: boolean) => void
  setIsHighlightNeighbors: (v: boolean) => void
  setRepulsion: (v: number) => void
  setGravity: (v: number) => void
  setFriction: (v: number) => void
  setLinkSpring: (v: number) => void
  setDecay: (v: number) => void
  setGraphLoaded: (nodeCount: number, edgeCount: number) => void
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
  isNodeLabelsVisible: false,
  isHighlightNeighbors: false,
  repulsion: 1.0,
  gravity: 0.25,
  friction: 0.85,
  linkSpring: 1.0,
  decay: 5000,
  isGraphLoaded: false,
  nodeCount: 0,
  edgeCount: 0,
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
  setIsNodeLabelsVisible: (v): void => set({ isNodeLabelsVisible: v }),
  setIsHighlightNeighbors: (v): void => set({ isHighlightNeighbors: v }),
  setRepulsion: (v): void => set({ repulsion: v }),
  setGravity: (v): void => set({ gravity: v }),
  setFriction: (v): void => set({ friction: v }),
  setLinkSpring: (v): void => set({ linkSpring: v }),
  setDecay: (v): void => set({ decay: v }),
  setGraphLoaded: (nodeCount, edgeCount): void => {
    set({ isGraphLoaded: true, nodeCount, edgeCount })
  },
  resetStore: (): void => set(STORE_DEFAULTS),
}))

import { create } from 'zustand'

interface DisplayState {
  nodeSize: number
  edgeSize: number
  isEdgesVisible: boolean
  isNodeLabelsVisible: boolean
  isHighlightNeighbors: boolean
}

interface SimulationState {
  gravity: number
  speed: number
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
  setGravity: (v: number) => void
  setSpeed: (v: number) => void
  setGraphLoaded: (nodeCount: number, edgeCount: number) => void
  resetStore: () => void
}

export type GraphStore = DisplayState & SimulationState & GraphMeta & Actions

/**
 * Default values for all non-action store fields.
 * Used by resetStore and available to tests.
 */
export const STORE_DEFAULTS: DisplayState & SimulationState & GraphMeta = {
  nodeSize: 5,
  edgeSize: 1,
  isEdgesVisible: true,
  isNodeLabelsVisible: false,
  isHighlightNeighbors: false,
  gravity: 1,
  speed: 1,
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
  setGravity: (v): void => set({ gravity: v }),
  setSpeed: (v): void => set({ speed: v }),
  setGraphLoaded: (nodeCount, edgeCount): void =>
    set({ isGraphLoaded: true, nodeCount, edgeCount }),
  resetStore: (): void => set(STORE_DEFAULTS),
}))

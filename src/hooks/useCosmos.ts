import { useCallback, useEffect, useRef, useState } from 'react'
import { Graph as CosmosGraph } from '@cosmos.gl/graph'
import type { GraphConfigInterface } from '@cosmos.gl/graph'
import type { CosmosGraphData, TooltipState } from '../types'
import { useGraphStore } from '@/stores/useGraphStore'
import { COLOR_DEFAULT, COLOR_EDGE_DEFAULT, COLOR_GRAYED } from '@/lib/colors'

/** Parse a hex color string to normalized [r, g, b, a] (all 0.0–1.0). */
function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return [r, g, b, 1]
}

/** Generate random positions for n nodes in [-2048, 2048] range. */
function generateRandomPositions(n: number): Float32Array {
  const positions = new Float32Array(n * 2)
  for (let i = 0; i < n * 2; i++) {
    positions[i] = (Math.random() - 0.5) * 4096
  }
  return positions
}

export interface UseCosmosReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  tooltipState: TooltipState | null
  setTooltipState: (state: TooltipState | null) => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleFit: () => void
  isSimulationRunning: boolean
  startSimulation: () => void
  stopSimulation: () => void
  pauseSimulation: () => void
  randomizePositions: () => void
  cosmosRef: React.RefObject<CosmosGraph | null>
}

/**
 * Manages the @cosmos.gl/graph instance lifecycle: init/destroy,
 * node/link data, colors, sizes, events, camera controls, and simulation.
 *
 * @param data - The CosmosGraphData to render.
 * @param nodeColors - Per-node color map (nodeId → hex).
 * @returns Cosmos container ref, tooltip state, camera controls, simulation controls.
 */
export function useCosmos(
  data: CosmosGraphData | null,
  nodeColors: Map<string, string>,
): UseCosmosReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cosmosRef = useRef<CosmosGraph | null>(null)
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)

  // Store state
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const edgeSize = useGraphStore((s) => s.edgeSize)
  const isEdgesVisible = useGraphStore((s) => s.isEdgesVisible)
  const isHighlightNeighbors = useGraphStore((s) => s.isHighlightNeighbors)
  const repulsion = useGraphStore((s) => s.repulsion)
  const gravity = useGraphStore((s) => s.gravity)
  const friction = useGraphStore((s) => s.friction)
  const linkSpring = useGraphStore((s) => s.linkSpring)
  const decay = useGraphStore((s) => s.decay)

  // Refs for callback closures
  const dataRef = useRef(data)
  const nodeColorsRef = useRef(nodeColors)
  const isHighlightNeighborsRef = useRef(isHighlightNeighbors)
  const hoveredIndexRef = useRef<number | undefined>(undefined)

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { nodeColorsRef.current = nodeColors }, [nodeColors])
  useEffect(() => { isHighlightNeighborsRef.current = isHighlightNeighbors }, [isHighlightNeighbors])

  // Mark graph as loaded
  useEffect(() => {
    if (data) {
      useGraphStore.getState().setGraphLoaded(data.nodes.length, data.linkIndices.length / 2)
    }
  }, [data])

  // ── Cosmos init / destroy ──
  useEffect(() => {
    if (!data) return
    const div = containerRef.current
    if (!div) return

    let cosmos: CosmosGraph | null = null
    let observer: ResizeObserver | null = null

    const config: GraphConfigInterface = {
      backgroundColor: '#f8fafc',
      pointDefaultColor: COLOR_DEFAULT,
      linkDefaultColor: COLOR_EDGE_DEFAULT,
      pointDefaultSize: 4,
      pointSizeScale: nodeSize / 4,
      linkDefaultWidth: 1,
      linkWidthScale: edgeSize,
      renderLinks: isEdgesVisible,
      renderHoveredPointRing: true,
      hoveredPointRingColor: '#3b82f6',
      focusedPointRingColor: '#3b82f6',
      fitViewOnInit: true,
      fitViewDelay: 0,
      fitViewPadding: 0.1,
      rescalePositions: true,
      enableDrag: true,
      // Simulation is enabled but we don't call start() — user must click Run.
      enableSimulation: true,
      simulationRepulsion: repulsion,
      simulationGravity: gravity,
      simulationCenter: 1,
      simulationFriction: friction,
      simulationLinkSpring: linkSpring,
      simulationDecay: decay,
      pointGreyoutOpacity: 0.1,
      linkGreyoutOpacity: 0.1,
      attribution: '',
      onSimulationStart: () => setIsSimulationRunning(true),
      onSimulationTick: () => {
        // Keep camera tracking the graph as it moves during simulation
        cosmosRef.current?.fitView(0)
      },
      onSimulationEnd: () => {
        setIsSimulationRunning(false)
        cosmosRef.current?.fitView(250)
      },
      onSimulationPause: () => setIsSimulationRunning(false),
      onSimulationUnpause: () => setIsSimulationRunning(true),
      onPointClick: (index, _pointPosition, event) => {
        const d = dataRef.current
        if (!d || index === undefined) return
        const node = d.nodes[index]
        if (!node) return
        const container = containerRef.current
        const bounds = container?.getBoundingClientRect() ?? new DOMRect()
        setTooltipState({
          nodeId: node.id,
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          canvasBounds: bounds,
        })
      },
      onBackgroundClick: () => {
        setTooltipState(null)
      },
      onPointMouseOver: (index) => {
        hoveredIndexRef.current = index
        const d = dataRef.current
        const c = cosmosRef.current
        if (!d || !c || !isHighlightNeighborsRef.current) return
        c.selectPointByIndex(index, true)
      },
      onPointMouseOut: () => {
        hoveredIndexRef.current = undefined
        const c = cosmosRef.current
        if (!c || !isHighlightNeighborsRef.current) return
        c.unselectPoints()
      },
    }

    /**
     * Initialize Cosmos and feed it data. This MUST only be called when `div`
     * has a non-zero clientWidth/clientHeight, otherwise the Cosmos constructor
     * defers its internal create() and subsequent set* calls silently no-op.
     */
    const init = (): void => {
      try {
        cosmos = new CosmosGraph(div, config)
      } catch (e) {
        console.error('Cosmos init error:', e)
        return
      }
      cosmosRef.current = cosmos

      // Positions: use provided or generate random
      const positions = data.initialPositions ?? generateRandomPositions(data.nodes.length)
      cosmos.setPointPositions(positions)

      // Links
      cosmos.setLinks(data.linkIndices)

      // Colors
      applyNodeColors(cosmos, data, nodeColorsRef.current)

      // Render statically (alpha=0 = no physics forces).
      // fitViewOnInit zooms camera to frame all nodes.
      cosmos.render(0)
    }

    // Cosmos needs a container with actual pixel dimensions. If the div has
    // already been laid out, init immediately. Otherwise wait for layout.
    if (div.clientWidth > 0 && div.clientHeight > 0) {
      init()
    } else {
      observer = new ResizeObserver(() => {
        if (div.clientWidth > 0 && div.clientHeight > 0) {
          observer?.disconnect()
          observer = null
          init()
        }
      })
      observer.observe(div)
    }

    return (): void => {
      observer?.disconnect()
      if (cosmos) {
        try { cosmos.destroy() } catch { /* ignore */ }
      }
      cosmosRef.current = null
      setIsSimulationRunning(false)
    }
    // Only re-create when data identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // ── Sync simulation settings ──
  useEffect(() => {
    cosmosRef.current?.setConfig({
      simulationRepulsion: repulsion,
      simulationGravity: gravity,
      simulationCenter: 1,
      simulationFriction: friction,
      simulationLinkSpring: linkSpring,
      simulationDecay: decay,
    })
  }, [repulsion, gravity, friction, linkSpring, decay])

  // ── Sync display settings ──
  useEffect(() => {
    cosmosRef.current?.setConfig({ renderLinks: isEdgesVisible })
  }, [isEdgesVisible])

  // ── Sync node sizes ──
  // Use pointSizeScale (shader uniform) for instant slider response — no data flush needed.
  useEffect(() => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    // Initial pointDefaultSize is 4 (cosmos default). Scale relative to that.
    cosmosRef.current?.setConfig({ pointSizeScale: nodeSize / 4 })
  }, [nodeSize])

  // ── Sync edge sizes ──
  useEffect(() => {
    cosmosRef.current?.setConfig({ linkWidthScale: edgeSize })
  }, [edgeSize])

  // ── Sync node colors ──
  useEffect(() => {
    if (!data) return
    const cosmos = cosmosRef.current
    if (!cosmos) return
    applyNodeColors(cosmos, data, nodeColors)
    cosmos.create()
  }, [data, nodeColors])

  // ── Sync highlight neighbors ──
  useEffect(() => {
    if (!isHighlightNeighbors) {
      cosmosRef.current?.unselectPoints()
    }
  }, [isHighlightNeighbors])

  // ── Camera controls ──
  const handleZoomIn = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() * 1.5, 200)
  }, [])

  const handleZoomOut = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() / 1.5, 200)
  }, [])

  const handleFit = useCallback((): void => {
    cosmosRef.current?.fitView(200)
  }, [])

  // ── Simulation controls ──
  const startSimulation = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.fitView(0)
    cosmos.start()
  }, [])

  const stopSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [])

  const pauseSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [])

  const randomizePositions = useCallback((): void => {
    if (!data) return
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setPointPositions(generateRandomPositions(data.nodes.length))
    cosmos.render(0)
    cosmos.fitView(0)
  }, [data])

  return {
    containerRef,
    tooltipState,
    setTooltipState,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    isSimulationRunning,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    randomizePositions,
    cosmosRef,
  }
}

/** Build and apply a Float32Array of RGBA colors from the nodeColors map. */
function applyNodeColors(
  cosmos: CosmosGraph,
  data: CosmosGraphData,
  nodeColors: Map<string, string>,
): void {
  const n = data.nodes.length
  const colors = new Float32Array(n * 4)
  const defaultRgba = hexToRgba(COLOR_DEFAULT)
  const grayedRgba = hexToRgba(COLOR_GRAYED)

  for (let i = 0; i < n; i++) {
    const hex = nodeColors.get(data.nodes[i].id)
    let rgba: [number, number, number, number]
    if (!hex) {
      rgba = defaultRgba
    } else if (hex === COLOR_GRAYED) {
      rgba = grayedRgba
    } else {
      rgba = hexToRgba(hex)
    }
    colors[i * 4] = rgba[0]
    colors[i * 4 + 1] = rgba[1]
    colors[i * 4 + 2] = rgba[2]
    colors[i * 4 + 3] = rgba[3]
  }
  cosmos.setPointColors(colors)
}


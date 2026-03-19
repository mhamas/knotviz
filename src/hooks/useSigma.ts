import { useCallback, useEffect, useRef, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import type { TooltipState } from '../types'
import { useGraphStore } from '@/stores/useGraphStore'

interface UseSigmaReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  tooltipState: TooltipState | null
  setTooltipState: (state: TooltipState | null) => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleFit: () => void
  handleRotateCW: () => void
  handleRotateCCW: () => void
  refresh: () => void
}

/**
 * Manages the Sigma.js instance lifecycle: init/destroy, node/edge reducers,
 * hover and click events, display setting sync, camera controls, and resize.
 *
 * @param graph - The Graphology graph instance to render.
 * @returns Sigma container ref, tooltip state, and camera control handlers.
 */
export function useSigma(graph: Graph): UseSigmaReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const tooltipStateRef = useRef<TooltipState | null>(null)
  const hoveredNodeRef = useRef<string | null>(null)

  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)

  // Store state for display sync
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const edgeSize = useGraphStore((s) => s.edgeSize)
  const isEdgesVisible = useGraphStore((s) => s.isEdgesVisible)
  const isNodeLabelsVisible = useGraphStore((s) => s.isNodeLabelsVisible)
  const isHighlightNeighbors = useGraphStore((s) => s.isHighlightNeighbors)

  // Refs for use inside Sigma reducers (closures capture these once)
  const isEdgesVisibleRef = useRef(isEdgesVisible)
  const isNodeLabelsVisibleRef = useRef(isNodeLabelsVisible)
  const isHighlightNeighborsRef = useRef(isHighlightNeighbors)
  const nodeSizeRef = useRef(nodeSize)
  const edgeSizeRef = useRef(edgeSize)
  const hoveredNeighborsRef = useRef<Set<string>>(new Set())
  const hoveredEdgesRef = useRef<Set<string>>(new Set())

  // Keep tooltip ref in sync
  useEffect(() => {
    tooltipStateRef.current = tooltipState
  }, [tooltipState])

  // Sync display refs → trigger Sigma refresh
  useEffect(() => {
    isEdgesVisibleRef.current = isEdgesVisible
    sigmaRef.current?.refresh()
  }, [isEdgesVisible])

  useEffect(() => {
    isNodeLabelsVisibleRef.current = isNodeLabelsVisible
    sigmaRef.current?.setSetting(
      'labelRenderedSizeThreshold',
      isNodeLabelsVisible ? 0 : Infinity,
    )
  }, [isNodeLabelsVisible])

  useEffect(() => {
    isHighlightNeighborsRef.current = isHighlightNeighbors
    sigmaRef.current?.refresh()
  }, [isHighlightNeighbors])

  // Mark graph as loaded in the store
  useEffect(() => {
    useGraphStore.getState().setGraphLoaded(graph.order, graph.size)
  }, [graph])

  // Sigma init — runs once per graph
  useEffect(() => {
    if (!containerRef.current) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      zIndex: true,
      defaultNodeColor: '#94a3b8',
      defaultEdgeColor: '#94a3b8',
      minEdgeThickness: 0,
      labelRenderedSizeThreshold: Infinity,
      labelFont: 'system-ui, sans-serif',
      labelSize: 12,
      nodeReducer: (node: string, attrs: Record<string, unknown>): Record<string, unknown> => {
        const result = { ...attrs }
        if (nodeSizeRef.current === 0) {
          result.hidden = true
          return result
        }
        const isHovered = node === hoveredNodeRef.current
        if (node === tooltipStateRef.current?.nodeId || isHovered) {
          result.color = '#3b82f6'
          result.highlighted = true
        } else if (
          isHighlightNeighborsRef.current &&
          hoveredNodeRef.current &&
          hoveredNeighborsRef.current.has(node)
        ) {
          result.highlighted = true
        } else if (
          isHighlightNeighborsRef.current &&
          hoveredNodeRef.current &&
          !hoveredNeighborsRef.current.has(node)
        ) {
          result.color = '#e2e8f0'
          result.size = Math.max((result.size as number) * 0.5, 1)
          result.label = null
          result.zIndex = 0
        }
        return result
      },
      edgeReducer: (edge: string, attrs: Record<string, unknown>): Record<string, unknown> => {
        if (!isEdgesVisibleRef.current || edgeSizeRef.current === 0) return { ...attrs, hidden: true }
        if (isHighlightNeighborsRef.current && hoveredNodeRef.current) {
          if (hoveredEdgesRef.current.has(edge)) {
            return { ...attrs, color: '#3b82f6', zIndex: 1 }
          }
          return { ...attrs, color: '#f1f5f9' }
        }
        return attrs
      },
    })

    sigmaRef.current = sigma

    // Hover: highlight node and optionally its neighbors
    sigma.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node
      if (isHighlightNeighborsRef.current) {
        hoveredNeighborsRef.current = new Set(graph.neighbors(node))
        hoveredEdgesRef.current = new Set(graph.edges(node))
      }
      sigma.refresh()
    })
    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null
      hoveredNeighborsRef.current = new Set()
      hoveredEdgesRef.current = new Set()
      sigma.refresh()
    })

    // Click node: open tooltip
    sigma.on('clickNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node) as { x: number; y: number }
      const pos = sigma.graphToViewport(attrs)
      const bounds = containerRef.current?.getBoundingClientRect() ?? new DOMRect()
      setTooltipState({ nodeId: node, x: pos.x, y: pos.y, canvasBounds: bounds })
    })

    // Click stage: close tooltip
    sigma.on('clickStage', () => {
      setTooltipState(null)
    })

    // Fit camera to show all nodes
    sigma.getCamera().animatedReset({ duration: 0 })

    return (): void => {
      sigma.kill()
      sigmaRef.current = null
    }
  }, [graph])

  // Apply node/edge size changes
  // Note: Sigma defaults size to 2 (nodes) / 0.5 (edges) when size is falsy,
  // so we use a tiny positive value instead of 0 to avoid that override.
  // The nodeReducer/edgeReducer handle hiding at exactly 0.
  useEffect(() => {
    nodeSizeRef.current = nodeSize
    const graphSize = nodeSize === 0 ? 0.001 : nodeSize
    graph.updateEachNodeAttributes((_node, attrs) => ({ ...attrs, size: graphSize }))
    sigmaRef.current?.refresh()
  }, [graph, nodeSize])

  useEffect(() => {
    edgeSizeRef.current = edgeSize
    const graphSize = edgeSize === 0 ? 0.001 : edgeSize
    graph.updateEachEdgeAttributes((_edge, attrs) => ({ ...attrs, size: graphSize }))
    sigmaRef.current?.refresh()
  }, [graph, edgeSize])

  // Shift+wheel rotation handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent): void => {
      if (!e.shiftKey || !sigmaRef.current) return
      const rawDelta = e.deltaY || e.deltaX
      if (!rawDelta) return
      e.preventDefault()
      e.stopPropagation()
      const camera = sigmaRef.current.getCamera()
      const sensitivity = 0.003
      camera.setState({ angle: camera.angle + rawDelta * sensitivity })
    }

    container.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return (): void => {
      container.removeEventListener('wheel', handleWheel, { capture: true })
    }
  }, [])

  // Canvas resize handler
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return

    let timeoutId: ReturnType<typeof setTimeout>
    const handleResize = (): void => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => sigma.resize(), 100)
    }
    window.addEventListener('resize', handleResize)
    return (): void => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Camera controls
  const handleZoomIn = useCallback((): void => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 200 })
  }, [])

  const handleZoomOut = useCallback((): void => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 200 })
  }, [])

  const handleFit = useCallback((): void => {
    const camera = sigmaRef.current?.getCamera()
    if (!camera) return
    camera.animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { duration: 200 })
  }, [])

  const handleRotateCW = useCallback((): void => {
    const camera = sigmaRef.current?.getCamera()
    if (!camera) return
    camera.animate({ angle: camera.angle + Math.PI / 12 }, { duration: 200 })
  }, [])

  const handleRotateCCW = useCallback((): void => {
    const camera = sigmaRef.current?.getCamera()
    if (!camera) return
    camera.animate({ angle: camera.angle - Math.PI / 12 }, { duration: 200 })
  }, [])

  const refresh = useCallback((): void => {
    sigmaRef.current?.refresh()
  }, [])

  return {
    containerRef,
    tooltipState,
    setTooltipState,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleRotateCW,
    handleRotateCCW,
    refresh,
  }
}

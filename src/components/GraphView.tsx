import { useCallback, useEffect, useRef, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import type { GraphData, PositionMode, TooltipState } from '../types'
import { FilenameLabel } from './FilenameLabel'
import { CanvasControls } from './CanvasControls'
import { LeftSidebar } from './LeftSidebar'

interface Props {
  graphData: GraphData
  graph: Graph
  positionMode: PositionMode
  filename: string
  onLoadNewFile: () => void
}

/**
 * Main view after graph is loaded. Owns the Sigma instance and tooltip state.
 * Receives the pre-built Graphology graph from App (built once in DropZone).
 *
 * @param props - Component props with graph data and callbacks.
 * @returns Graph canvas view element.
 */
export function GraphView({
  graph,
  filename,
  onLoadNewFile,
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const tooltipStateRef = useRef<TooltipState | null>(null)

  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    tooltipStateRef.current = tooltipState
  }, [tooltipState])

  // Sigma init — runs once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeColor: '#94a3b8',
      defaultEdgeColor: '#94a3b8',
      labelRenderedSizeThreshold: 8,
      labelFont: 'system-ui, sans-serif',
      labelSize: 12,
      nodeReducer: (node, attrs) => {
        if (node === tooltipStateRef.current?.nodeId) {
          return { ...attrs, color: '#3b82f6', highlighted: true }
        }
        return attrs
      },
    })

    sigmaRef.current = sigma

    // Fit camera to show all nodes
    sigma.getCamera().animatedReset({ duration: 0 })

    return (): void => {
      sigma.kill()
      sigmaRef.current = null
    }
  }, [graph])

  // Shift+wheel rotation handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent): void => {
      if (!e.shiftKey || !sigmaRef.current) return
      // On Mac, Shift+scroll swaps deltaY into deltaX
      const rawDelta = e.deltaY || e.deltaX
      if (!rawDelta) return
      e.preventDefault()
      e.stopPropagation()
      const camera = sigmaRef.current.getCamera()
      // Apply angle directly for smooth continuous rotation
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

  // Suppress unused var warning — will be used in Task 14
  void setTooltipState

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

  return (
    <div className="flex h-screen w-screen">
      <LeftSidebar
        nodeCount={graph.order}
        edgeCount={graph.size}
        onLoadNewFile={onLoadNewFile}
      />
      <div className="relative flex-1">
        <div
          ref={containerRef}
          data-testid="sigma-canvas"
          className="h-full w-full"
          style={{ backgroundColor: '#f8fafc' }}
        />
        <FilenameLabel filename={filename} />
        <CanvasControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
        />
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import type { GraphData, PositionMode, PropertyMeta, TooltipState } from '../types'
import type { SimulationSettings } from '../hooks/useFA2Simulation'
import { useFA2Simulation } from '../hooks/useFA2Simulation'
import { detectPropertyTypes } from '../lib/detectPropertyTypes'
import { FilenameLabel } from './FilenameLabel'
import { CanvasControls } from './CanvasControls'
import { LeftSidebar } from './LeftSidebar'
import { DragOverlay } from './DragOverlay'
import { NodeTooltip } from './NodeTooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  graphData,
  graph,
  positionMode,
  filename,
  onLoadNewFile,
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const tooltipStateRef = useRef<TooltipState | null>(null)
  const hoveredNodeRef = useRef<string | null>(null)

  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings>({
    gravity: 1,
    speed: 1,
  })
  const [nodeSize, setNodeSize] = useState(5)
  const [edgeSize, setEdgeSize] = useState(1)
  const [isEdgesVisible, setIsEdgesVisible] = useState(true)
  const [isNodeLabelsVisible, setIsNodeLabelsVisible] = useState(false)
  const [isHighlightNeighbors, setIsHighlightNeighbors] = useState(false)

  const simulation = useFA2Simulation(graph, simulationSettings)

  // Keep display refs in sync for use in reducers
  const isEdgesVisibleRef = useRef(isEdgesVisible)
  const isNodeLabelsVisibleRef = useRef(isNodeLabelsVisible)
  const isHighlightNeighborsRef = useRef(isHighlightNeighbors)
  const hoveredNeighborsRef = useRef<Set<string>>(new Set())
  const hoveredEdgesRef = useRef<Set<string>>(new Set())

  // Keep refs in sync with state
  useEffect(() => {
    tooltipStateRef.current = tooltipState
  }, [tooltipState])

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

  // Sigma init — runs once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      zIndex: true,
      defaultNodeColor: '#94a3b8',
      defaultEdgeColor: '#94a3b8',
      minEdgeThickness: 0.1,
      labelRenderedSizeThreshold: Infinity,
      labelFont: 'system-ui, sans-serif',
      labelSize: 12,
      nodeReducer: (node: string, attrs: Record<string, unknown>): Record<string, unknown> => {
        const result = { ...attrs }
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
        if (!isEdgesVisibleRef.current) return { ...attrs, hidden: true }
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
  useEffect(() => {
    graph.updateEachNodeAttributes((_node, attrs) => ({ ...attrs, size: nodeSize }))
    sigmaRef.current?.refresh()
  }, [graph, nodeSize])

  useEffect(() => {
    graph.updateEachEdgeAttributes((_edge, attrs) => ({ ...attrs, size: edgeSize }))
    sigmaRef.current?.refresh()
  }, [graph, edgeSize])

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

  // Space bar toggles simulation
  const { isRunning, start: simStart, stop: simStop } = simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return
      // Don't trigger when typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (isRunning) {
        simStop()
      } else {
        simStart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRunning, simStart, simStop])

  // Drag-and-drop overlay for loading new file over existing graph
  const dragCounterRef = useRef(0)
  const pendingFileRef = useRef<File | null>(null)
  const [isConfirmNewFileOpen, setIsConfirmNewFileOpen] = useState(false)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current++
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }
    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }
    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current === 0) setIsDragOver(false)
    }
    const handleDrop = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (file) {
        pendingFileRef.current = file
        setIsConfirmNewFileOpen(true)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return (): void => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleConfirmNewFile = useCallback((): void => {
    setIsConfirmNewFileOpen(false)
    pendingFileRef.current = null
    onLoadNewFile()
  }, [onLoadNewFile])

  const handleCancelNewFile = useCallback((): void => {
    setIsConfirmNewFileOpen(false)
    pendingFileRef.current = null
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

  // Detect property types for tooltip display
  const propertyMetas: PropertyMeta[] = useMemo(() => {
    const typeMap = detectPropertyTypes(graphData.nodes)
    return Array.from(typeMap.entries()).map(([key, type]) => ({ key, type }))
  }, [graphData.nodes])

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

  const handleDownload = useCallback((): void => {
    const exported: GraphData = {
      version: '1',
      nodes: graphData.nodes.map((n) => ({
        ...n,
        x: graph.getNodeAttribute(n.id, 'x') as number,
        y: graph.getNodeAttribute(n.id, 'y') as number,
      })),
      edges: graphData.edges,
    }
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [graph, graphData, filename])

  return (
    <div className="flex h-screen w-screen">
      <LeftSidebar
        isRunning={simulation.isRunning}
        simulationError={simulation.errorMessage}
        gravity={simulationSettings.gravity}
        speed={simulationSettings.speed}
        nodeCount={graph.order}
        edgeCount={graph.size}
        onRun={simulation.start}
        onStop={simulation.stop}
        onGravityChange={(v): void => setSimulationSettings((s) => ({ ...s, gravity: v }))}
        onSpeedChange={(v): void => setSimulationSettings((s) => ({ ...s, speed: v }))}
        onRandomizeLayout={simulation.randomizeLayout}
        nodeSize={nodeSize}
        edgeSize={edgeSize}
        isEdgesVisible={isEdgesVisible}
        isNodeLabelsVisible={isNodeLabelsVisible}
        isHighlightNeighbors={isHighlightNeighbors}
        onNodeSizeChange={setNodeSize}
        onEdgeSizeChange={setEdgeSize}
        onEdgesVisibleChange={setIsEdgesVisible}
        onNodeLabelsVisibleChange={setIsNodeLabelsVisible}
        onHighlightNeighborsChange={setIsHighlightNeighbors}
        onDownload={handleDownload}
        onReset={onLoadNewFile}
      />
      <div className="relative flex-1">
        <div
          ref={containerRef}
          data-testid="sigma-canvas"
          className="h-full w-full"
          style={{ backgroundColor: '#f8fafc' }}
        />
        {positionMode === 'partial' && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
            Some nodes have positions and some do not — positions were randomized.
            Run the simulation to generate a layout.
          </div>
        )}
        {tooltipState && tooltipState.canvasBounds && (
          <NodeTooltip
            nodeId={tooltipState.nodeId}
            screenPosition={{ x: tooltipState.x, y: tooltipState.y }}
            graphData={graphData}
            propertyMetas={propertyMetas}
            canvasBounds={tooltipState.canvasBounds}
            onClose={(): void => setTooltipState(null)}
          />
        )}
        <DragOverlay isVisible={isDragOver} />
        <FilenameLabel filename={filename} />
        <CanvasControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
        />
      </div>

      <AlertDialog open={isConfirmNewFileOpen} onOpenChange={(isOpen): void => { if (!isOpen) handleCancelNewFile() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load new file?</AlertDialogTitle>
            <AlertDialogDescription>
              Loading a new file will clear the current graph. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNewFile}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNewFile}>Load new file</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

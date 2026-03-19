import { useCallback, useEffect, useMemo } from 'react'
import type Graph from 'graphology'
import type { GraphData, PositionMode, PropertyMeta } from '../types'
import type { SimulationSettings } from '../hooks/useFA2Simulation'
import { useFA2Simulation } from '../hooks/useFA2Simulation'
import { useSigma } from '../hooks/useSigma'
import { useFileDrop } from '../hooks/useFileDrop'
import { useSpacebarToggle } from '../hooks/useSpacebarToggle'
import { useFilterState } from '../hooks/useFilterState'
import { useNodeColors } from '../hooks/useNodeColors'
import { detectPropertyTypes } from '../lib/detectPropertyTypes'
import { COLOR_DEFAULT, COLOR_GRAYED } from '../lib/colors'
import { useGraphStore } from '@/stores/useGraphStore'
import { FilenameLabel } from './FilenameLabel'
import { CanvasControls } from './CanvasControls'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
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
  onLoadNewFile: (file?: File) => void
}

/**
 * Main view after graph is loaded. Composes Sigma rendering, simulation,
 * file drop, and keyboard shortcut hooks into a single layout.
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
  const gravity = useGraphStore((s) => s.gravity)
  const speed = useGraphStore((s) => s.speed)

  const simulationSettings = useMemo<SimulationSettings>(
    () => ({ gravity, speed }),
    [gravity, speed],
  )
  const simulation = useFA2Simulation(graph, simulationSettings)

  const {
    containerRef,
    tooltipState,
    setTooltipState,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleRotateCW,
    handleRotateCCW,
    refresh: refreshSigma,
  } = useSigma(graph)

  const { isDragOver, isConfirmOpen, handleConfirm, handleCancel } = useFileDrop(onLoadNewFile)

  useSpacebarToggle(simulation.isRunning, simulation.start, simulation.stop)

  const propertyMetas: PropertyMeta[] = useMemo(() => {
    const typeMap = detectPropertyTypes(graphData.nodes)
    return Array.from(typeMap.entries()).map(([key, type]) => ({ key, type }))
  }, [graphData.nodes])

  // Filter system
  const filterHandle = useFilterState(graphData, propertyMetas)

  const nodeIds = useMemo(() => graphData.nodes.map((n) => n.id), [graphData.nodes])
  const nodeColors = useNodeColors(nodeIds, filterHandle.matchingNodeIds, filterHandle.hasActiveFilters)

  // Apply filter colors to graph attributes
  useEffect(() => {
    graph.updateEachNodeAttributes((node, attrs) => ({
      ...attrs,
      color: nodeColors.get(node) ?? COLOR_DEFAULT,
    }))
    graph.updateEachEdgeAttributes((_edge, attrs, source, target) => {
      const isGrayed =
        filterHandle.hasActiveFilters &&
        (!filterHandle.matchingNodeIds.has(source) || !filterHandle.matchingNodeIds.has(target))
      return { ...attrs, color: isGrayed ? COLOR_GRAYED : COLOR_DEFAULT }
    })
    refreshSigma()
  }, [graph, nodeColors, filterHandle.hasActiveFilters, filterHandle.matchingNodeIds, refreshSigma])

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
        onRun={simulation.start}
        onStop={simulation.stop}
        onRandomizeLayout={simulation.randomizeLayout}
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
      <RightSidebar
        propertyMetas={propertyMetas}
        filterHandle={filterHandle}
      />

      <AlertDialog open={isConfirmOpen} onOpenChange={(isOpen): void => { if (!isOpen) handleCancel() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load new file?</AlertDialogTitle>
            <AlertDialogDescription>
              Loading a new file will clear the current graph. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Load new file</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

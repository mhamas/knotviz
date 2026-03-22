import { useCallback, useMemo, useState } from 'react'
import type { CosmosGraphData, ColorGradientState, GraphData, PropertyMeta, PropertyType } from '../types'
import { useCosmos } from '../hooks/useCosmos'
import { useFileDrop } from '../hooks/useFileDrop'
import { useSpacebarToggle } from '../hooks/useSpacebarToggle'
import { useFilterState } from '../hooks/useFilterState'
import { useNodeColors } from '../hooks/useNodeColors'
import { useColorGradient } from '../hooks/useColorGradient'
import { detectPropertyTypes } from '../lib/detectPropertyTypes'
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
  cosmosData: CosmosGraphData
  filename: string
  onLoadNewFile: (file?: File) => void
}

/**
 * Main view after graph is loaded. Composes Cosmos rendering, simulation,
 * file drop, filtering, coloring, and keyboard shortcut hooks into a single layout.
 *
 * @param props - Component props with graph data and callbacks.
 * @returns Graph canvas view element.
 */
export function GraphView({
  graphData,
  cosmosData,
  filename,
  onLoadNewFile,
}: Props): React.JSX.Element {
  const propertyMetas: PropertyMeta[] = useMemo(() => {
    const typeMap = detectPropertyTypes(graphData.nodes)
    return Array.from(typeMap.entries()).map(([key, type]) => ({ key, type }))
  }, [graphData.nodes])

  // Filter system
  const filterHandle = useFilterState(graphData, propertyMetas)

  // Color gradient
  const [gradientState, setGradientState] = useState<ColorGradientState>({
    propertyKey: null,
    palette: 'Viridis',
    isReversed: false,
    customColors: [],
    customPalettes: [],
  })

  const propertyTypeMap = useMemo<Map<string, PropertyType>>(
    () => new Map(propertyMetas.map((m) => [m.key, m.type])),
    [propertyMetas],
  )

  const gradientColors = useColorGradient(
    cosmosData,
    filterHandle.matchingNodeIds,
    gradientState,
    propertyTypeMap,
  )

  const nodeIds = useMemo(() => graphData.nodes.map((n) => n.id), [graphData.nodes])
  const nodeColors = useNodeColors(nodeIds, filterHandle.matchingNodeIds, filterHandle.hasActiveFilters, gradientColors)

  // Cosmos rendering
  const {
    containerRef,
    labelsRef,
    tooltipState,
    closeTooltip,
    hoverLabel,
    hoverRef,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    isSimulationRunning,
    startSimulation,
    stopSimulation,
    randomizePositions,
    cosmosRef,
  } = useCosmos(cosmosData, nodeColors)

  const { isDragOver, isConfirmOpen, handleConfirm, handleCancel } = useFileDrop(onLoadNewFile)

  useSpacebarToggle(isSimulationRunning, startSimulation, stopSimulation)

  const handleDownload = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    const positions = cosmos.getPointPositions()
    const exported: GraphData = {
      version: '1',
      nodes: graphData.nodes.map((n, i) => ({
        ...n,
        x: positions[i * 2] ?? 0,
        y: positions[i * 2 + 1] ?? 0,
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
  }, [cosmosRef, graphData, filename])

  return (
    <div className="flex h-screen w-screen">
      <LeftSidebar
        isRunning={isSimulationRunning}
        onRun={startSimulation}
        onStop={stopSimulation}
        onRandomizeLayout={randomizePositions}
        onDownload={handleDownload}
        onReset={onLoadNewFile}
      />
      <div className="relative flex-1">
        <div
          ref={containerRef}
          data-testid="sigma-canvas"
          className="h-full w-full [&_canvas]:!cursor-default"
        />
        <div
          ref={labelsRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />
        {cosmosData.positionMode === 'partial' && (
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
            onClose={closeTooltip}
          />
        )}
        <div
          ref={hoverRef}
          className="pointer-events-none absolute z-20 max-w-64 break-words rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-slate-700 shadow-md"
          style={{ display: hoverLabel && !tooltipState ? 'block' : 'none' }}
        >
          {hoverLabel?.label}
        </div>
        <DragOverlay isVisible={isDragOver} />
        <FilenameLabel filename={filename} />
        <CanvasControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
        />
      </div>
      <RightSidebar
        propertyMetas={propertyMetas}
        filterHandle={filterHandle}
        gradientState={gradientState}
        onGradientChange={setGradientState}
        cosmosData={cosmosData}
        matchingNodeIds={filterHandle.matchingNodeIds}
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

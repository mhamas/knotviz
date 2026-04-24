import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CosmosGraphData, ColorGradientState, HistogramBucket, NodePropertiesMetadata, PropertyMeta, PropertyType } from '../types'
import { computeHistogram } from '../lib/computeHistogram'
import { buildExportSnapshot } from '../lib/exports/buildSnapshot'
import { exportSnapshot } from '../lib/exports'
import { filenameFor, triggerDownload } from '../lib/exports/download'
import type { ExportFormat } from '../lib/exports/types'
import { useGraphStore } from '../stores/useGraphStore'
import type { PropertyColumns } from '../hooks/useFilterState'
import { useCosmos } from '../hooks/useCosmos'
import { useFileDrop } from '../hooks/useFileDrop'
import { useSpacebarToggle } from '../hooks/useSpacebarToggle'
import { useFilterState } from '../hooks/useFilterState'
import { FilenameLabel } from './FilenameLabel'
import { CanvasControls } from './CanvasControls'
import { LeftSidebar } from './LeftSidebar'
import { RightTabStrip } from './RightTabStrip'
import { AnalysisSidebar } from './AnalysisSidebar'
import { FiltersSidebar } from './FiltersSidebar'
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
  cosmosData: CosmosGraphData
  propertyColumns: PropertyColumns
  propertyMetas: PropertyMeta[]
  nodePropertiesMetadata: NodePropertiesMetadata | undefined
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
  cosmosData,
  propertyColumns,
  propertyMetas,
  nodePropertiesMetadata,
  filename,
  onLoadNewFile,
}: Props): React.JSX.Element {
  const propertyTypeMap = useMemo(
    () => new Map<string, PropertyType>(propertyMetas.map((m) => [m.key, m.type])),
    [propertyMetas],
  )

  // Filter system (UI state only — matching computed in worker)
  const filterHandle = useFilterState(propertyMetas, propertyColumns)

  // Color gradient state
  const [gradientState, setGradientState] = useState<ColorGradientState>({
    propertyKey: null,
    palette: 'Viridis',
    isReversed: false,
    customColors: [],
    customPalettes: [],
    visualMode: 'color',
    sizeRange: [1, 10],
    isLogScale: false,
  })

  // Cosmos rendering (worker handles filter matching + gradient + appearance)
  const {
    containerRef,
    labelsRef,
    tooltipState,
    closeTooltip,
    hoverRef,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleRotateCW,
    handleRotateCCW,
    rotationCenter,
    isSimulationRunning,
    matchingCount,
    propertyStats,
    startSimulation,
    stopSimulation,
    restartSimulation,
    cosmosRef,
    visibleNodes,
    keptEdgeIndices,
    filteredLinkIndices,
  } = useCosmos(
    cosmosData,
    propertyColumns,
    filterHandle.filters,
    gradientState,
    propertyTypeMap,
  )

  // Visible edge count + outgoing degree histogram (respects both node filters and edge filters)
  const { visibleEdgeCount, outgoingDegreeHistogram } = useMemo(() => {
    if (filteredLinkIndices.length === 0) return { visibleEdgeCount: 0, outgoingDegreeHistogram: [] as HistogramBucket[] }
    const outDegree = new Uint32Array(cosmosData.nodeCount)
    let edgeCount = 0
    for (let i = 0; i < filteredLinkIndices.length; i += 2) {
      const src = filteredLinkIndices[i]
      const tgt = filteredLinkIndices[i + 1]
      if (visibleNodes && (!visibleNodes[src] || !visibleNodes[tgt])) continue
      outDegree[src]++
      edgeCount++
    }
    const degrees: number[] = []
    if (visibleNodes) {
      for (let i = 0; i < cosmosData.nodeCount; i++) {
        if (visibleNodes[i]) degrees.push(outDegree[i])
      }
    } else {
      for (let i = 0; i < cosmosData.nodeCount; i++) {
        degrees.push(outDegree[i])
      }
    }
    return { visibleEdgeCount: edgeCount, outgoingDegreeHistogram: computeHistogram(degrees) }
  }, [filteredLinkIndices, visibleNodes, cosmosData.nodeCount])

  // Sync visible state to store so LeftSidebar can read it directly
  useEffect(() => {
    useGraphStore.getState().setVisibleState(matchingCount, visibleEdgeCount, outgoingDegreeHistogram)
  }, [matchingCount, visibleEdgeCount, outgoingDegreeHistogram])

  // Sidebar state
  const [isLeftOpen, setIsLeftOpen] = useState(true)

  // Right sidebar tab state
  const [wantsColorsOpen, setWantsColorsOpen] = useState(false)
  const [wantsFiltersOpen, setWantsFiltersOpen] = useState(false)
  const [maxTabs, setMaxTabs] = useState(2)

  // Left sidebar 240px + tab strip ~36px + each right sidebar 300px + min canvas 100px
  useEffect(() => {
    const update = (): void => {
      const w = window.innerWidth
      if (w >= 976) setMaxTabs(2)
      else if (w >= 676) setMaxTabs(1)
      else setMaxTabs(0)
    }
    update()
    window.addEventListener('resize', update)
    return (): void => window.removeEventListener('resize', update)
  }, [])

  // Derive effective open state: collapse leftmost (Colors) first when constrained
  let isColorsOpen = wantsColorsOpen
  let isFiltersOpen = wantsFiltersOpen
  const wantedCount = (wantsColorsOpen ? 1 : 0) + (wantsFiltersOpen ? 1 : 0)
  if (wantedCount > maxTabs) {
    if (maxTabs === 0) {
      isColorsOpen = false
      isFiltersOpen = false
    } else {
      isColorsOpen = false
      if (!wantsFiltersOpen) isFiltersOpen = false
    }
  }

  // Toggle with displacement: opening a tab may close the leftmost other tab
  const toggleColors = useCallback((): void => {
    setWantsColorsOpen((prev) => {
      if (prev) return false
      // Opening Colors — if no room, close Filters to make space
      if (maxTabs <= 1 && wantsFiltersOpen) setWantsFiltersOpen(false)
      return true
    })
  }, [wantsFiltersOpen, maxTabs])

  const toggleFilters = useCallback((): void => {
    setWantsFiltersOpen((prev) => {
      if (prev) return false
      // Opening Filters — if no room, close Colors (leftmost)
      if (maxTabs <= 1 && wantsColorsOpen) setWantsColorsOpen(false)
      return true
    })
  }, [wantsColorsOpen, maxTabs])

  const { isDragOver, isConfirmOpen, handleConfirm, handleCancel } = useFileDrop(onLoadNewFile)

  useSpacebarToggle(isSimulationRunning, startSimulation, stopSimulation)

  const handleDownload = useCallback(
    async (format: ExportFormat = 'json'): Promise<void> => {
      const cosmos = cosmosRef.current
      if (!cosmos) return
      const positions = cosmos.getPointPositions()
      const snapshot = buildExportSnapshot(
        positions,
        cosmosData,
        visibleNodes,
        keptEdgeIndices,
        propertyMetas,
        propertyColumns,
      )
      const result = await exportSnapshot(snapshot, format)
      triggerDownload(result.blob, filenameFor(filename, result.extension))
    },
    [cosmosRef, cosmosData, propertyMetas, propertyColumns, filename, visibleNodes, keptEdgeIndices],
  )

  return (
    <div className="flex h-screen w-screen">
      <LeftSidebar
        isRunning={isSimulationRunning}
        onRun={startSimulation}
        onStop={stopSimulation}
        onRestart={restartSimulation}
        onDownload={handleDownload}
        onReset={onLoadNewFile}
        isOpen={isLeftOpen}
        onToggle={(): void => setIsLeftOpen((v) => !v)}
        hasPositions={cosmosData.positionMode === 'all'}
        isAnalysisOpen={isColorsOpen}
        isFiltersOpen={isFiltersOpen}
        onToggleAnalysis={toggleColors}
        onToggleFilters={toggleFilters}
      />
      <div className="relative flex-1 overflow-hidden bg-white">
        <div
          ref={containerRef}
          data-testid="sigma-canvas"
          className="h-full w-full [&_canvas]:!cursor-default"
        />
        <div
          ref={labelsRef}
          data-testid="node-labels"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />
        {isSimulationRunning && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Zoom, pan, drag, and rotation are disabled while the simulation is running — the camera is following the graph. Press Space to pause.
          </div>
        )}
        {!isSimulationRunning && cosmosData.positionMode === 'partial' && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
            Some nodes have positions and some do not — positions were randomized.
            Run the simulation to generate a layout.
          </div>
        )}
        {tooltipState && tooltipState.canvasBounds && (
          <NodeTooltip
            nodeId={tooltipState.nodeId}
            screenPosition={{ x: tooltipState.x, y: tooltipState.y }}
            nodeIndexMap={cosmosData.nodeIndexMap}
            nodeLabels={cosmosData.nodeLabels}
            propertyColumns={propertyColumns}
            propertyMetas={propertyMetas}
            nodePropertiesMetadata={nodePropertiesMetadata}
            canvasBounds={tooltipState.canvasBounds}
            analysisPropertyKey={gradientState.propertyKey}
            onClose={closeTooltip}
          />
        )}
        <div
          ref={hoverRef}
          className="pointer-events-none absolute z-20 max-w-64 break-words rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-slate-700 shadow-md"
          style={{ display: 'none' }}
        />
        {rotationCenter && (
          <div
            className="pointer-events-none absolute z-20 text-red-500"
            style={{
              left: rotationCenter.x - 6,
              top: rotationCenter.y - 6,
              fontSize: 14,
              lineHeight: '12px',
              fontWeight: 700,
            }}
          >
            ✕
          </div>
        )}
        <DragOverlay isVisible={isDragOver} />
        <FilenameLabel filename={filename} />
        <CanvasControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
          isDisabled={isSimulationRunning}
        />
      </div>
      {isColorsOpen && (
        <AnalysisSidebar
          propertyMetas={propertyMetas}
          gradientState={gradientState}
          onGradientChange={setGradientState}
          propertyColumns={propertyColumns}
          filters={filterHandle.filters}
          propertyStats={propertyStats}
          onClose={(): void => setWantsColorsOpen(false)}
        />
      )}
      {isFiltersOpen && (
        <FiltersSidebar
          propertyMetas={propertyMetas}
          nodePropertiesMetadata={nodePropertiesMetadata}
          filterHandle={filterHandle}
          matchingCount={matchingCount}
          nodeCount={cosmosData.nodeCount}
          onClose={(): void => setWantsFiltersOpen(false)}
        />
      )}
      <RightTabStrip
        isColorsOpen={isColorsOpen}
        isFiltersOpen={isFiltersOpen}
        onToggleColors={toggleColors}
        onToggleFilters={toggleFilters}
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

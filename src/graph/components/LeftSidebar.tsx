import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Palette, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from 'lucide-react'
import {
  CollapsibleSection,
  LabeledSlider,
  SectionHeading,
  SidebarButton,
  SidebarCheckbox,
  StatRow,
} from '@/components/sidebar'
import { Histogram } from './Histogram'
import { SearchBox } from './filters/SearchBox'
import { DownloadSplitButton } from './DownloadSplitButton'
import type { ExportFormat } from '../lib/exports/types'
import { useDebounce } from '@/hooks/useDebounce'
import { useGraphStore } from '@/stores/useGraphStore'
import { formatNumber } from '../lib/formatNumber'
import {
  COLOR_TAB_COLORS, COLOR_TAB_COLORS_BG,
  COLOR_TAB_FILTERS, COLOR_TAB_FILTERS_BG,
} from '@/lib/colors'

interface Props {
  isRunning?: boolean
  simulationError?: string | null
  onRun?: () => void
  onStop?: () => void
  onRestart?: () => void
  onDownload?: (format: ExportFormat) => Promise<void> | void
  onReset?: () => void
  isOpen?: boolean
  onToggle?: () => void
  hasPositions?: boolean
  isAnalysisOpen?: boolean
  isFiltersOpen?: boolean
  onToggleAnalysis?: () => void
  onToggleFilters?: () => void
}

/**
 * Left sidebar with simulation controls, graph info, and file management.
 * Reads display/simulation settings from Zustand store; receives only
 * imperative simulation callbacks and file-management handlers as props.
 *
 * @param props - Simulation state and imperative callbacks.
 * @returns Left sidebar element.
 */
export function LeftSidebar({
  isRunning = false,
  simulationError = null,
  onRun = () => {},
  onStop = () => {},
  onRestart = () => {},
  onDownload = () => {},
  onReset = () => {},
  isOpen = true,
  onToggle,
  hasPositions = false,
  isAnalysisOpen = false,
  isFiltersOpen = false,
  onToggleAnalysis,
  onToggleFilters,
}: Props): React.JSX.Element {
  // Store state
  const isGraphLoaded = useGraphStore((s) => s.isGraphLoaded)
  const repulsion = useGraphStore((s) => s.repulsion)
  const friction = useGraphStore((s) => s.friction)
  const linkSpring = useGraphStore((s) => s.linkSpring)
  const edgePercentage = useGraphStore((s) => s.edgePercentage)
  const isKeepAtLeastOneEdge = useGraphStore((s) => s.isKeepAtLeastOneEdge)
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const edgeSize = useGraphStore((s) => s.edgeSize)
  const isEdgesVisible = useGraphStore((s) => s.isEdgesVisible)
  const isEdgeDirectionality = useGraphStore((s) => s.isEdgeDirectionality)
  const isNodeLabelsVisible = useGraphStore((s) => s.isNodeLabelsVisible)
  const isHighlightNeighbors = useGraphStore((s) => s.isHighlightNeighbors)
  const nodeCount = useGraphStore((s) => s.nodeCount)
  const edgeCount = useGraphStore((s) => s.edgeCount)
  const matchingNodeCount = useGraphStore((s) => s.matchingNodeCount)
  const visibleEdgeCount = useGraphStore((s) => s.visibleEdgeCount)
  const outgoingDegreeHistogram = useGraphStore((s) => s.outgoingDegreeHistogram)
  const searchQuery = useGraphStore((s) => s.searchQuery)
  const highlightedNodeCount = useGraphStore((s) => s.highlightedNodeCount)
  const searchMatches = useGraphStore((s) => s.searchMatches)

  // Store actions
  const setRepulsion = useGraphStore((s) => s.setRepulsion)
  const setFriction = useGraphStore((s) => s.setFriction)
  const setLinkSpring = useGraphStore((s) => s.setLinkSpring)
  const setEdgePercentage = useGraphStore((s) => s.setEdgePercentage)
  const setIsKeepAtLeastOneEdge = useGraphStore((s) => s.setIsKeepAtLeastOneEdge)
  const setNodeSize = useGraphStore((s) => s.setNodeSize)
  const setEdgeSize = useGraphStore((s) => s.setEdgeSize)
  const setIsEdgesVisible = useGraphStore((s) => s.setIsEdgesVisible)
  const setIsEdgeDirectionality = useGraphStore((s) => s.setIsEdgeDirectionality)
  const setIsNodeLabelsVisible = useGraphStore((s) => s.setIsNodeLabelsVisible)
  const setIsHighlightNeighbors = useGraphStore((s) => s.setIsHighlightNeighbors)
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery)

  const isDisabled = !isGraphLoaded

  const debouncedRepulsionChange = useDebounce(setRepulsion, 100)
  const debouncedFrictionChange = useDebounce(setFriction, 100)
  const debouncedLinkSpringChange = useDebounce(setLinkSpring, 100)
  const debouncedEdgePercentageChange = useDebounce(setEdgePercentage, 100)
  // Display sliders use short debounce — they only change GPU uniforms, no worker involved
  const debouncedNodeSizeChange = useDebounce(setNodeSize, 30)
  const debouncedEdgeSizeChange = useDebounce(setEdgeSize, 30)
  const debouncedSetSearchQuery = useDebounce(setSearchQuery, 150)

  if (!isOpen) {
    return (
      <div className="flex h-full shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 px-1 pt-2">
        <button
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={onToggle}
          aria-label="Open left panel"
          title="Open simulation & display controls"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-60 shrink-0 flex-col gap-2 overflow-y-auto border-r border-slate-200 bg-white px-4 pt-4 pb-4">
      {/* Search + sidebar-collapse — tinted header strip flush to the sidebar
          edge. Gives visual hierarchy vs. the section controls below, and
          pairs the global "close the panel" control with the other always-
          available tool (search). SearchBox remounts on graph load/reset via
          `key` to stay in sync with the store's searchQuery. */}
      <div className="-mx-4 -mt-4 mb-2 flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 py-2 pl-4 pr-0.5">
        <div className="flex-1">
          <SearchBox
            key={isGraphLoaded ? 'loaded' : 'empty'}
            initialValue={searchQuery}
            onChange={debouncedSetSearchQuery}
            matchCount={highlightedNodeCount}
            matches={searchMatches}
            disabled={isDisabled}
          />
        </div>
        {onToggle && (
          <button
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onToggle}
            aria-label="Close left panel"
            title="Collapse panel"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
      {/* Simulation */}
      <div>
        <CollapsibleSection
          label="Simulation"
          defaultOpen={isGraphLoaded && !hasPositions}
          help="Runs a GPU-accelerated force-directed layout that pushes connected nodes closer together and unconnected nodes apart, making clusters and relationships easier to see."
        >
          <div className="space-y-3">
            {/* Simulating indicator */}
            {isRunning && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <span>Simulating…</span>
              </div>
            )}

            {/* Run / Stop / Restart */}
            <div className="flex gap-2">
              <SidebarButton
                color="green"
                className="flex-1"
                onClick={onRun}
                disabled={isRunning}
              >
                Run
              </SidebarButton>
              <SidebarButton
                color="red"
                className="flex-1"
                onClick={onStop}
                disabled={!isRunning}
              >
                Stop
              </SidebarButton>
              <SidebarButton
                className="flex-1"
                onClick={onRestart}
              >
                Restart
              </SidebarButton>
            </div>

            {/* Error */}
            {simulationError && (
              <p className="text-xs text-red-500">{simulationError}</p>
            )}

            <div className="space-y-2.5">
              <LabeledSlider
                label="Repulsion"
                value={repulsion}
                formatValue={(v): string => formatNumber(v, { decimals: 2 })}
                help="A force between ALL pairs of nodes that pushes them apart, like magnets with the same pole. This is the main force that prevents nodes from overlapping and creates space in the layout. Unlike Link Spring (which only acts between connected nodes), Repulsion acts between every node — even nodes with no edges between them. Higher values spread the entire graph out; lower values let it collapse tighter. If you raise Repulsion without raising Link Spring, clusters will break apart. If you lower it too much, unconnected groups will overlap."
                min={0}
                max={300}
                step={1}
                defaultValue={[repulsion * 100]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedRepulsionChange(v / 100)
                }}
              />

              <LabeledSlider
                label="Friction"
                value={1 - friction}
                formatValue={(v): string => formatNumber(v, { decimals: 2 })}
                help="Controls how quickly nodes lose their momentum and come to rest. Think of it like air resistance. High friction (close to 1) means nodes stop almost immediately after forces are applied — the layout converges fast but may look rigid. Low friction (close to 0) means nodes keep sliding for a long time — the layout is smoother and more organic but takes longer to settle. If the simulation never stabilizes, raise friction; if it feels too rigid, lower it."
                min={0}
                max={100}
                step={1}
                defaultValue={[(1 - friction) * 100]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedFrictionChange(1 - v / 100)
                }}
              />

              <LabeledSlider
                label="Link Spring"
                value={linkSpring}
                formatValue={(v): string => formatNumber(v, { decimals: 2 })}
                help="A spring force that acts ONLY between nodes connected by an edge, pulling them closer together — like a rubber band on each link. This is what makes clusters visible: densely connected groups of nodes get pulled into tight neighborhoods. Unlike Repulsion (which pushes ALL nodes apart), Link Spring only affects connected pairs. The interplay between these two forces defines the layout: Repulsion spreads everything out, Link Spring pulls connected nodes back in. Higher values make connected nodes snap tighter together; lower values let them drift apart even if connected."
                min={0}
                max={300}
                step={1}
                defaultValue={[linkSpring * 100]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedLinkSpringChange(v / 100)
                }}
              />
              <LabeledSlider
                label="Edges to keep (%)"
                value={edgePercentage}
                formatValue={(v): string => `${Math.round(v)}%`}
                help="Keep only the top X% of edges by weight. Edges are sorted by weight (highest first). Lower values remove weak edges from both the simulation and display."
                min={0}
                max={100}
                step={1}
                defaultValue={[edgePercentage]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedEdgePercentageChange(v)
                }}
              />
            </div>

            <SidebarCheckbox
              label="Always keep strongest edge per node"
              checked={isKeepAtLeastOneEdge}
              onCheckedChange={setIsKeepAtLeastOneEdge}
              help="When checked, each node's highest-weight edge is always kept regardless of the edge percentage filter above."
            />

          </div>
        </CollapsibleSection>
      </div>

      {/* Display */}
      <div className="mt-4 space-y-3">
        <SectionHeading>Display</SectionHeading>

        <LabeledSlider
          label="Node size"
          value={nodeSize}
          min={0}
          max={20}
          step={0.01}
          defaultValue={[nodeSize]}
          onValueChange={(value): void => {
            const v = Array.isArray(value) ? value[0] : value
            debouncedNodeSizeChange(Math.round(v * 100) / 100)
          }}
        />

        <LabeledSlider
          label="Edge size"
          value={edgeSize}
          min={0}
          max={5}
          step={0.01}
          defaultValue={[edgeSize]}
          onValueChange={(value): void => {
            const v = Array.isArray(value) ? value[0] : value
            debouncedEdgeSizeChange(Math.round(v * 100) / 100)
          }}
        />

        <SidebarCheckbox
          label="Show edges"
          checked={isEdgesVisible}
          onCheckedChange={setIsEdgesVisible}
        />

        <SidebarCheckbox
          label="Show edge directionality"
          checked={isEdgeDirectionality}
          onCheckedChange={setIsEdgeDirectionality}
          help="Arrows indicating edge direction are drawn at the midpoint of each edge, so they may be hard to see on short or overlapping edges."
        />

        <SidebarCheckbox
          label="Show node labels"
          checked={isNodeLabelsVisible}
          onCheckedChange={setIsNodeLabelsVisible}
          help="Displays up to 300 labels sampled from visible nodes. Labels update as you pan and zoom."
        />

        <SidebarCheckbox
          label="Highlight neighbors on hover"
          checked={isHighlightNeighbors}
          onCheckedChange={setIsHighlightNeighbors}
        />
      </div>

      {/* Graph Info */}
      <div className="mt-4">
        <SectionHeading>Graph Info</SectionHeading>
        <div className="mt-2 space-y-1">
          <StatRow label="Nodes" value={matchingNodeCount === nodeCount ? formatNumber(nodeCount) : `${formatNumber(matchingNodeCount)} / ${formatNumber(nodeCount)}`} />
          <StatRow label="Edges" value={visibleEdgeCount === edgeCount ? formatNumber(edgeCount) : `${formatNumber(visibleEdgeCount)} / ${formatNumber(edgeCount)}`} />
        </div>
        {outgoingDegreeHistogram.length > 0 && (
          <div className="mt-3" data-testid="outgoing-degree-histogram">
            <p className="mb-1 text-[10px] font-medium tracking-wide text-slate-400 uppercase">Outgoing edges per node</p>
            <Histogram buckets={outgoingDegreeHistogram} />
          </div>
        )}
      </div>

      </div>

      <div className="mt-auto flex flex-col gap-2">
        {/* Right panel toggles */}
        <div className="flex gap-1">
          <button
            type="button"
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${isAnalysisOpen ? 'border-amber-200' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'} disabled:pointer-events-none disabled:opacity-40`}
            style={isAnalysisOpen
              ? { backgroundColor: COLOR_TAB_COLORS_BG, color: COLOR_TAB_COLORS }
              : undefined}
            onClick={onToggleAnalysis}
            disabled={isDisabled}
            data-testid="left-toggle-analysis"
          >
            <Palette className="h-3.5 w-3.5 shrink-0" />
            Analysis
          </button>
          <button
            type="button"
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${isFiltersOpen ? 'border-blue-200' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'} disabled:pointer-events-none disabled:opacity-40`}
            style={isFiltersOpen
              ? { backgroundColor: COLOR_TAB_FILTERS_BG, color: COLOR_TAB_FILTERS }
              : undefined}
            onClick={onToggleFilters}
            disabled={isDisabled}
            data-testid="left-toggle-filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            Filters
          </button>
        </div>

        <DownloadSplitButton
          onDownload={async (format): Promise<void> => {
            await onDownload(format)
          }}
          disabled={isDisabled}
        />

      <AlertDialog>
        <AlertDialogTrigger
          className={`w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 ${isDisabled ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
          disabled={isDisabled}
        >
          Reset graph
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset graph?</AlertDialogTitle>
            <AlertDialogDescription>
              This will completely reset all graph data, simulation state, and display settings. You will need to load a new file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(): void => onReset()}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      <img src="/logo.png" alt="Knotviz" className="h-auto w-20 opacity-60" />
    </div>
  )
}

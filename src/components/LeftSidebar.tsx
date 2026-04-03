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
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {
  CollapsibleSection,
  LabeledSlider,
  SectionHeading,
  SidebarButton,
  SidebarCheckbox,
  StatRow,
} from '@/components/sidebar'
import { useDebounce } from '@/hooks/useDebounce'
import { useGraphStore } from '@/stores/useGraphStore'

interface Props {
  isRunning?: boolean
  simulationError?: string | null
  onRun?: () => void
  onStop?: () => void
  onRestart?: () => void
  onDownload?: () => void
  onReset?: () => void
  isOpen?: boolean
  onToggle?: () => void
  effectiveMaxOutgoing?: number
  effectiveMaxIncoming?: number
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
  effectiveMaxOutgoing = 0,
  effectiveMaxIncoming = 0,
}: Props): React.JSX.Element {
  // Store state
  const isGraphLoaded = useGraphStore((s) => s.isGraphLoaded)
  const repulsion = useGraphStore((s) => s.repulsion)
  const friction = useGraphStore((s) => s.friction)
  const linkSpring = useGraphStore((s) => s.linkSpring)
  const edgePercentage = useGraphStore((s) => s.edgePercentage)
  const maxOutgoing = useGraphStore((s) => s.maxOutgoing)
  const maxOutgoingDegree = useGraphStore((s) => s.maxOutgoingDegree)
  const maxIncoming = useGraphStore((s) => s.maxIncoming)
  const maxIncomingDegree = useGraphStore((s) => s.maxIncomingDegree)
  const isKeepAtLeastOneEdge = useGraphStore((s) => s.isKeepAtLeastOneEdge)
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const edgeSize = useGraphStore((s) => s.edgeSize)
  const isEdgesVisible = useGraphStore((s) => s.isEdgesVisible)
  const isEdgeDirectionality = useGraphStore((s) => s.isEdgeDirectionality)
  const isNodeLabelsVisible = useGraphStore((s) => s.isNodeLabelsVisible)
  const isHighlightNeighbors = useGraphStore((s) => s.isHighlightNeighbors)
  const nodeCount = useGraphStore((s) => s.nodeCount)
  const edgeCount = useGraphStore((s) => s.edgeCount)

  // Store actions
  const setRepulsion = useGraphStore((s) => s.setRepulsion)
  const setFriction = useGraphStore((s) => s.setFriction)
  const setLinkSpring = useGraphStore((s) => s.setLinkSpring)
  const setEdgePercentage = useGraphStore((s) => s.setEdgePercentage)
  const setMaxOutgoing = useGraphStore((s) => s.setMaxOutgoing)
  const setMaxIncoming = useGraphStore((s) => s.setMaxIncoming)
  const setIsKeepAtLeastOneEdge = useGraphStore((s) => s.setIsKeepAtLeastOneEdge)
  const setNodeSize = useGraphStore((s) => s.setNodeSize)
  const setEdgeSize = useGraphStore((s) => s.setEdgeSize)
  const setIsEdgesVisible = useGraphStore((s) => s.setIsEdgesVisible)
  const setIsEdgeDirectionality = useGraphStore((s) => s.setIsEdgeDirectionality)
  const setIsNodeLabelsVisible = useGraphStore((s) => s.setIsNodeLabelsVisible)
  const setIsHighlightNeighbors = useGraphStore((s) => s.setIsHighlightNeighbors)

  const isDisabled = !isGraphLoaded

  const debouncedRepulsionChange = useDebounce(setRepulsion, 100)
  const debouncedFrictionChange = useDebounce(setFriction, 100)
  const debouncedLinkSpringChange = useDebounce(setLinkSpring, 100)
  const debouncedEdgePercentageChange = useDebounce(setEdgePercentage, 100)
  const debouncedMaxOutgoingChange = useDebounce(setMaxOutgoing, 100)
  const debouncedMaxIncomingChange = useDebounce(setMaxIncoming, 100)
  // Display sliders use short debounce — they only change GPU uniforms, no worker involved
  const debouncedNodeSizeChange = useDebounce(setNodeSize, 30)
  const debouncedEdgeSizeChange = useDebounce(setEdgeSize, 30)

  if (!isOpen) {
    return (
      <div className="flex h-screen shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 px-1 pt-2">
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
    <div className="flex h-screen w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
      {/* Simulation */}
      <div className="mt-2">
        <CollapsibleSection
          label="Simulation"
          help="Runs a GPU-accelerated force-directed layout that pushes connected nodes closer together and unconnected nodes apart, making clusters and relationships easier to see."
          trailing={onToggle && (
            <button
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={(e): void => { e.preventDefault(); onToggle() }}
              aria-label="Close left panel"
              title="Collapse panel"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
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
                formatValue={(v): string => v.toFixed(2)}
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
                formatValue={(v): string => v.toFixed(2)}
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
                formatValue={(v): string => v.toFixed(2)}
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
            </div>

            <div className="mt-5 space-y-2.5">
              <LabeledSlider
                label="Edges to keep (%)"
                value={edgePercentage}
                formatValue={(v): string => `${Math.round(v)}%`}
                help="Keep only the top X% of edges by weight. Edges are sorted by weight (highest first). Lower values remove weak edges from both the simulation and display. Applied before the max outgoing limit."
                min={0}
                max={100}
                step={1}
                defaultValue={[edgePercentage]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedEdgePercentageChange(v)
                }}
              />

              <LabeledSlider
                key={`out-${maxOutgoingDegree}-${effectiveMaxOutgoing}`}
                label="Max outgoing edges per node"
                value={Math.min(maxOutgoing, effectiveMaxOutgoing || maxOutgoingDegree || 1)}
                formatValue={(v): string => String(Math.round(v))}
                help={`Limit the maximum number of outgoing edges per node. For each source node, keeps the highest-weight outgoing edges up to this limit. Applied after the edge percentage filter. Range adjusts based on edges remaining after the percentage filter.`}
                min={0}
                max={effectiveMaxOutgoing || maxOutgoingDegree || 1}
                step={1}
                defaultValue={[Math.min(maxOutgoing, effectiveMaxOutgoing || maxOutgoingDegree || 1)]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedMaxOutgoingChange(Math.round(v))
                }}
              />

              <LabeledSlider
                key={`in-${maxIncomingDegree}-${effectiveMaxIncoming}`}
                label="Max incoming edges per node"
                value={Math.min(maxIncoming, effectiveMaxIncoming || maxIncomingDegree || 1)}
                formatValue={(v): string => String(Math.round(v))}
                help={`Limit the maximum number of incoming edges per node. For each target node, keeps the highest-weight incoming edges up to this limit. Applied after the percentage and max outgoing filters. Range adjusts dynamically.`}
                min={0}
                max={effectiveMaxIncoming || maxIncomingDegree || 1}
                step={1}
                defaultValue={[Math.min(maxIncoming, effectiveMaxIncoming || maxIncomingDegree || 1)]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedMaxIncomingChange(Math.round(v))
                }}
              />
            </div>

            <SidebarCheckbox
              label="Always keep strongest edge per node"
              checked={isKeepAtLeastOneEdge}
              onCheckedChange={setIsKeepAtLeastOneEdge}
              help="When checked, each node's highest-weight edge is always kept regardless of the edge filtering sliders above."
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
          <StatRow label="Nodes" value={nodeCount.toLocaleString()} />
          <StatRow label="Edges" value={edgeCount.toLocaleString()} />
        </div>
      </div>

      </div>

      <div className="mt-auto flex flex-col gap-2">
        <SidebarButton onClick={onDownload} disabled={isDisabled}>
          ↓ Download graph
        </SidebarButton>

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

    </div>
  )
}

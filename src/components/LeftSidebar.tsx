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
import {
  CollapsibleSection,
  LabeledSlider,
  SectionHeading,
  SidebarButton,
  SidebarCheckbox,
  StatRow,
} from '@/components/sidebar'
import { useDebounce } from '@/hooks/useDebounce'

interface Props {
  isDisabled?: boolean
  isRunning: boolean
  simulationError: string | null
  gravity: number
  speed: number
  nodeCount: number
  edgeCount: number
  onRun: () => void
  onStop: () => void
  onGravityChange: (v: number) => void
  onSpeedChange: (v: number) => void
  onRandomizeLayout: () => void
  nodeSize: number
  edgeSize: number
  isEdgesVisible: boolean
  isNodeLabelsVisible: boolean
  isHighlightNeighbors: boolean
  onNodeSizeChange: (v: number) => void
  onEdgeSizeChange: (v: number) => void
  onEdgesVisibleChange: (v: boolean) => void
  onNodeLabelsVisibleChange: (v: boolean) => void
  onHighlightNeighborsChange: (v: boolean) => void
  onReset: () => void
}

// Log scale: slider [0, 100] → value [0.1, 10.0]
const LOG_MIN = Math.log(0.1)
const LOG_MAX = Math.log(10)

function sliderToValue(s: number): number {
  const v = Math.exp(LOG_MIN + (s / 100) * (LOG_MAX - LOG_MIN))
  return Math.round(v * 100) / 100
}

function valueToSlider(v: number): number {
  return ((Math.log(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100
}

/**
 * Left sidebar with simulation controls, graph info, and file management.
 *
 * @param props - Simulation state, settings, counts, and callbacks.
 * @returns Left sidebar element.
 */
export function LeftSidebar({
  isDisabled = false,
  isRunning,
  simulationError,
  gravity,
  speed,
  nodeCount,
  edgeCount,
  onRun,
  onStop,
  onGravityChange,
  onSpeedChange,
  onRandomizeLayout,
  nodeSize,
  edgeSize,
  isEdgesVisible,
  isNodeLabelsVisible,
  isHighlightNeighbors,
  onNodeSizeChange,
  onEdgeSizeChange,
  onEdgesVisibleChange,
  onNodeLabelsVisibleChange,
  onHighlightNeighborsChange,
  onReset,
}: Props): React.JSX.Element {
  const debouncedGravityChange = useDebounce(onGravityChange, 150)
  const debouncedSpeedChange = useDebounce(onSpeedChange, 150)
  const debouncedNodeSizeChange = useDebounce(onNodeSizeChange, 150)
  const debouncedEdgeSizeChange = useDebounce(onEdgeSizeChange, 150)

  return (
    <div className="flex h-screen w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
      {/* Simulation */}
      <div className="mt-2 space-y-3">
        <SectionHeading help="Runs a force-directed layout that pushes connected nodes closer together and unconnected nodes apart, making clusters and relationships easier to see.">
          Simulation
        </SectionHeading>

        {/* Simulating indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span>Simulating…</span>
          </div>
        )}

        {/* Run / Stop */}
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
        </div>

        {/* Error */}
        {simulationError && (
          <p className="text-xs text-red-500">{simulationError}</p>
        )}

        <CollapsibleSection label="Simulation settings">
          <LabeledSlider
            label="Gravity"
            value={gravity}
            formatValue={(v): string => v.toFixed(2)}
            help="Controls how strongly nodes are pulled toward the center. Higher values produce a tighter, more compact layout."
            min={0}
            max={100}
            step={1}
            defaultValue={[valueToSlider(gravity)]}
            onValueChange={(value): void => {
              const v = Array.isArray(value) ? value[0] : value
              debouncedGravityChange(sliderToValue(v))
            }}
          />

          <LabeledSlider
            label="Speed"
            value={speed}
            formatValue={(v): string => v.toFixed(2)}
            help="Controls how fast the simulation converges. Higher values make nodes move faster each step, lower values give a smoother, more gradual layout."
            min={0}
            max={100}
            step={1}
            defaultValue={[valueToSlider(speed)]}
            onValueChange={(value): void => {
              const v = Array.isArray(value) ? value[0] : value
              debouncedSpeedChange(sliderToValue(v))
            }}
          />

          <div className="flex justify-end">
            <SidebarButton className="w-1/2" onClick={onRandomizeLayout}>
              ↺ Randomize
            </SidebarButton>
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
          max={10}
          step={0.1}
          defaultValue={[nodeSize]}
          onValueChange={(value): void => {
            const v = Array.isArray(value) ? value[0] : value
            debouncedNodeSizeChange(Math.round(v * 10) / 10)
          }}
        />

        <LabeledSlider
          label="Edge size"
          value={edgeSize}
          min={0}
          max={2}
          step={0.1}
          defaultValue={[edgeSize]}
          onValueChange={(value): void => {
            const v = Array.isArray(value) ? value[0] : value
            debouncedEdgeSizeChange(Math.round(v * 10) / 10)
          }}
        />

        <SidebarCheckbox
          label="Show edges"
          checked={isEdgesVisible}
          onCheckedChange={onEdgesVisibleChange}
        />

        <SidebarCheckbox
          label="Show node labels"
          checked={isNodeLabelsVisible}
          onCheckedChange={onNodeLabelsVisibleChange}
        />

        <SidebarCheckbox
          label="Highlight neighbors on hover"
          checked={isHighlightNeighbors}
          onCheckedChange={onHighlightNeighborsChange}
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

      <AlertDialog>
        <AlertDialogTrigger
          className={`mt-auto w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 ${isDisabled ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
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
            <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

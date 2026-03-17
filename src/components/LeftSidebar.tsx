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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
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
  isEdgesHidden: boolean
  onNodeSizeChange: (v: number) => void
  onEdgeSizeChange: (v: number) => void
  onEdgesHiddenChange: (v: boolean) => void
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
  isEdgesHidden,
  onNodeSizeChange,
  onEdgeSizeChange,
  onEdgesHiddenChange,
  onReset,
}: Props): React.JSX.Element {
  const debouncedGravityChange = useDebounce(onGravityChange, 150)
  const debouncedSpeedChange = useDebounce(onSpeedChange, 150)
  const debouncedNodeSizeChange = useDebounce(onNodeSizeChange, 150)
  const debouncedEdgeSizeChange = useDebounce(onEdgeSizeChange, 150)

  const handleRun = (): void => {
    onRun()
  }

  return (
    <div className="flex h-screen w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
      {/* Simulation */}
      <div className="mt-2 space-y-3">
        <div className="flex items-center gap-1">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Simulation</h3>
          <Popover>
            <PopoverTrigger className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-300">
              ?
            </PopoverTrigger>
            <PopoverContent side="right" className="w-52 text-xs text-slate-600">
              Runs a force-directed layout that pushes connected nodes closer together and unconnected nodes apart, making clusters and relationships easier to see.
            </PopoverContent>
          </Popover>
        </div>

        {/* Simulating indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span>Simulating…</span>
          </div>
        )}

        {/* Run / Stop */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 cursor-pointer border-emerald-300 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100 ${isRunning ? 'pointer-events-none opacity-50' : ''}`}
            onClick={handleRun}
            disabled={isRunning}
          >
            Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 cursor-pointer border-red-300 bg-red-50 font-medium text-red-700 hover:bg-red-100 ${!isRunning ? 'pointer-events-none opacity-50' : ''}`}
            onClick={onStop}
            disabled={!isRunning}
          >
            Stop
          </Button>
        </div>

        {/* Error */}
        {simulationError && (
          <p className="text-xs text-red-500">{simulationError}</p>
        )}

        {/* Simulation settings (collapsible) */}
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium text-slate-600 select-none">
            <span className="inline-block text-sm text-slate-500 transition-transform group-open:rotate-90">▶</span>{' '}
            Simulation settings
          </summary>
          <div className="mt-2 space-y-3">
            {/* Gravity slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-slate-600">Gravity</label>
                  <Popover>
                    <PopoverTrigger className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-300">
                      ?
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-48 text-xs text-slate-600">
                      Controls how strongly nodes are pulled toward the center. Higher values produce a tighter, more compact layout.
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-[10px] text-slate-400">{gravity.toFixed(2)}</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                defaultValue={[valueToSlider(gravity)]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedGravityChange(sliderToValue(v))
                }}
              />
            </div>

            {/* Speed slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-slate-600">Speed</label>
                  <Popover>
                    <PopoverTrigger className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-300">
                      ?
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-48 text-xs text-slate-600">
                      Controls how fast the simulation converges. Higher values make nodes move faster each step, lower values give a smoother, more gradual layout.
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-[10px] text-slate-400">{speed.toFixed(2)}</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                defaultValue={[valueToSlider(speed)]}
                onValueChange={(value): void => {
                  const v = Array.isArray(value) ? value[0] : value
                  debouncedSpeedChange(sliderToValue(v))
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2 cursor-pointer justify-center border-slate-300 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={onRandomizeLayout}
              >
                ↺ Randomize
              </Button>
            </div>
          </div>
        </details>
      </div>

      {/* Display */}
      <div className="mt-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Display</h3>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Node size</label>
            <span className="text-[10px] text-slate-400">{nodeSize}</span>
          </div>
          <Slider
            min={1}
            max={20}
            step={0.1}
            defaultValue={[nodeSize]}
            onValueChange={(value): void => {
              const v = Array.isArray(value) ? value[0] : value
              debouncedNodeSizeChange(Math.round(v * 10) / 10)
            }}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Edge size</label>
            <span className="text-[10px] text-slate-400">{edgeSize}</span>
          </div>
          <Slider
            min={0.1}
            max={5}
            step={0.1}
            defaultValue={[edgeSize]}
            onValueChange={(value): void => {
              const v = Array.isArray(value) ? value[0] : value
              debouncedEdgeSizeChange(Math.round(v * 10) / 10)
            }}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <Checkbox
            className="border-slate-400 data-checked:border-primary data-checked:bg-primary"
            checked={isEdgesHidden}
            onCheckedChange={(checked): void => onEdgesHiddenChange(checked === true)}
          />
          Hide edges
        </label>
      </div>

      {/* Graph Info */}
      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Graph Info</h3>
        <div className="mt-2 space-y-1 text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">Nodes</span>
            <span className="text-slate-400">{nodeCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">Edges</span>
            <span className="text-slate-400">{edgeCount.toLocaleString()}</span>
          </div>
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

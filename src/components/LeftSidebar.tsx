import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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
import { useDebounce } from '@/hooks/useDebounce'

interface Props {
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
  onLoadNewFile: () => void
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
  onLoadNewFile,
}: Props): React.JSX.Element {
  const [isLargeGraphDialogOpen, setIsLargeGraphDialogOpen] = useState(false)

  const debouncedGravityChange = useDebounce(onGravityChange, 150)
  const debouncedSpeedChange = useDebounce(onSpeedChange, 150)

  const handleRun = (): void => {
    if (nodeCount > 10_000) {
      setIsLargeGraphDialogOpen(true)
    } else {
      onRun()
    }
  }

  return (
    <div className="flex h-screen w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <Button
        variant="ghost"
        className="w-full cursor-pointer justify-start"
        onClick={onLoadNewFile}
      >
        Load new file
      </Button>

      {/* Simulation */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase text-slate-400">Simulation</h3>

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
            className={`flex-1 cursor-pointer ${isRunning ? 'pointer-events-none opacity-50' : ''}`}
            onClick={handleRun}
            disabled={isRunning}
          >
            Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 cursor-pointer ${!isRunning ? 'pointer-events-none opacity-50' : ''}`}
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

        {/* Gravity slider */}
        <div>
          <label className="text-xs text-slate-500">Gravity</label>
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
          <span className="text-[10px] text-slate-400">{gravity.toFixed(2)}</span>
        </div>

        {/* Speed slider */}
        <div>
          <label className="text-xs text-slate-500">Speed</label>
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
          <span className="text-[10px] text-slate-400">{speed.toFixed(2)}</span>
        </div>

        {/* Randomize */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full cursor-pointer justify-start text-xs"
          onClick={onRandomizeLayout}
        >
          ↺ Randomize Layout
        </Button>
      </div>

      {/* Graph Info */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase text-slate-400">Graph Info</h3>
        <div className="mt-2 space-y-1 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="flex justify-between">
            <span className="text-slate-500">Nodes</span>
            <span className="font-medium">{nodeCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Edges</span>
            <span className="font-medium">{edgeCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Large graph warning dialog */}
      <AlertDialog open={isLargeGraphDialogOpen} onOpenChange={setIsLargeGraphDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Large graph</AlertDialogTitle>
            <AlertDialogDescription>
              This graph has {nodeCount.toLocaleString()} nodes. The simulation may be slow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(): void => {
                onRun()
                setIsLargeGraphDialogOpen(false)
              }}
            >
              Run anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

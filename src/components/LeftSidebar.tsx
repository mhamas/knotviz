import { Button } from '@/components/ui/button'

interface Props {
  nodeCount: number
  edgeCount: number
  onLoadNewFile: () => void
}

/**
 * Left sidebar with graph info and placeholder sections for simulation controls.
 *
 * @param props - Node/edge counts and load callback.
 * @returns Left sidebar element.
 */
export function LeftSidebar({ nodeCount, edgeCount, onLoadNewFile }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <Button
        variant="ghost"
        className="w-full cursor-pointer justify-start"
        onClick={onLoadNewFile}
      >
        Load new file
      </Button>

      {/* Simulation — stub for Task 11 */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase text-slate-400">Simulation</h3>
        <p className="mt-2 text-xs text-slate-300">Coming soon</p>
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
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import type { GraphData, PositionMode, TooltipState } from '../types'

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
  graph,
  filename,
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const tooltipStateRef = useRef<TooltipState | null>(null)

  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    tooltipStateRef.current = tooltipState
  }, [tooltipState])

  // Sigma init — runs once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeColor: '#94a3b8',
      defaultEdgeColor: '#94a3b8',
      labelRenderedSizeThreshold: 8,
      labelFont: 'system-ui, sans-serif',
      labelSize: 12,
      nodeReducer: (node, attrs) => {
        if (node === tooltipStateRef.current?.nodeId) {
          return { ...attrs, color: '#3b82f6', highlighted: true }
        }
        return attrs
      },
    })

    sigmaRef.current = sigma

    // Fit camera to show all nodes
    sigma.getCamera().animatedReset({ duration: 0 })

    return (): void => {
      sigma.kill()
      sigmaRef.current = null
    }
  }, [graph])

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

  // Suppress unused var warning — will be used in Task 14
  void setTooltipState

  return (
    <div className="flex h-screen w-screen">
      <div className="relative flex-1">
        <div
          ref={containerRef}
          data-testid="sigma-canvas"
          className="h-full w-full"
          style={{ backgroundColor: '#f8fafc' }}
        />
        <div className="absolute left-3 top-2 text-xs text-slate-400">
          {filename}
        </div>
      </div>
    </div>
  )
}

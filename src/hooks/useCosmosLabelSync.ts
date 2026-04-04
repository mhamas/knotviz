import { useEffect } from 'react'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'
import type { CosmosGraphData } from '../types'

/** Max number of node labels rendered as HTML overlays. */
const MAX_LABELS = 300

/**
 * Syncs the label overlay when the label toggle changes or data loads.
 * Renders labels via stride sampling (reliable across all GPUs).
 * This is separate from the continuous label updates in the Cosmos config
 * callbacks (onSimulationTick, onZoom, onDragEnd) which stay in useCosmos.
 *
 * @param cosmosRef - Ref to the Cosmos.gl graph instance.
 * @param containerRef - Ref to the canvas container element.
 * @param labelsRef - Ref to the labels container element.
 * @param isNodeLabelsVisible - Whether labels are toggled on.
 * @param data - Current graph data.
 */
export function useCosmosLabelSync(
  cosmosRef: React.RefObject<CosmosGraph | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  labelsRef: React.RefObject<HTMLDivElement | null>,
  isNodeLabelsVisible: boolean,
  data: CosmosGraphData | null,
): void {
  useEffect(() => {
    const container = labelsRef.current
    if (!container) return
    if (!isNodeLabelsVisible) {
      container.style.display = 'none'
      return
    }
    const cosmos = cosmosRef.current
    if (!cosmos || !data) return

    container.style.display = ''
    container.innerHTML = ''

    const positions = cosmos.getPointPositions()
    if (!positions || positions.length === 0) return
    const canvasW = containerRef.current?.clientWidth ?? 0
    const canvasH = containerRef.current?.clientHeight ?? 0
    const stride = Math.max(1, Math.floor(data.nodeCount / MAX_LABELS))
    let count = 0
    for (let idx = 0; idx < data.nodeCount && count < MAX_LABELS; idx += stride) {
      const sx = positions[idx * 2]
      const sy = positions[idx * 2 + 1]
      if (sx === undefined || sy === undefined) continue
      const [screenX, screenY] = cosmos.spaceToScreenPosition([sx, sy])
      if (screenX < -50 || screenX > canvasW + 50 || screenY < -50 || screenY > canvasH + 50) continue
      const el = document.createElement('div')
      el.className = 'pointer-events-none absolute font-sans text-[10px] text-slate-600'
      el.style.whiteSpace = 'nowrap'
      el.style.left = `${screenX + 8}px`
      el.style.top = `${screenY - 6}px`
      el.textContent = data.nodeLabels[idx] ?? data.nodeIds[idx]
      container.appendChild(el)
      count++
    }
  }, [isNodeLabelsVisible, data]) // eslint-disable-line react-hooks/exhaustive-deps
}

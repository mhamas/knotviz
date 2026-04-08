import { useEffect } from 'react'

/**
 * Syncs the label overlay when the label toggle changes or data loads.
 * Delegates to the shared updateLabels function (via ref) which handles
 * filter-aware stride sampling and GPU-sampled paths.
 *
 * @param labelsRef - Ref to the labels container element.
 * @param updateLabelsRef - Ref to the shared updateLabels function in useCosmos.
 * @param isNodeLabelsVisible - Whether labels are toggled on.
 * @param data - Dependency to re-sync when graph data changes (value unused).
 */
export function useCosmosLabelSync(
  labelsRef: React.RefObject<HTMLDivElement | null>,
  updateLabelsRef: React.RefObject<(() => void) | null>,
  isNodeLabelsVisible: boolean,
  data: unknown,
): void {
  useEffect(() => {
    const container = labelsRef.current
    if (!container) return
    if (!isNodeLabelsVisible) {
      container.style.display = 'none'
      return
    }
    // Clear stale label DOM elements, then let updateLabels re-create
    // them with filter-awareness.
    container.innerHTML = ''
    updateLabelsRef.current?.()
  }, [isNodeLabelsVisible, data]) // eslint-disable-line react-hooks/exhaustive-deps
}

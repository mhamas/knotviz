import { useCallback } from 'react'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'

export interface UseCosmosCamera {
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleFit: () => void
}

/**
 * Camera controls for a Cosmos.gl graph instance (zoom in, zoom out, fit to view).
 *
 * @param cosmosRef - Ref to the Cosmos.gl graph instance.
 * @returns Camera control callbacks.
 */
export function useCosmosCamera(
  cosmosRef: React.RefObject<CosmosGraph | null>,
): UseCosmosCamera {
  const handleZoomIn = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() * 1.5, 200)
  }, [cosmosRef])

  const handleZoomOut = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() / 1.5, 200)
  }, [cosmosRef])

  const handleFit = useCallback((): void => {
    cosmosRef.current?.fitView(200)
  }, [cosmosRef])

  return { handleZoomIn, handleZoomOut, handleFit }
}

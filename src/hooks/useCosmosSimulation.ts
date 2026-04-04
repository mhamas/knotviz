import { useCallback } from 'react'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'
import type { CosmosGraphData } from '../types'

/** Generate random positions for n nodes in [-2048, 2048] range. */
function generateRandomPositions(n: number): Float32Array {
  const positions = new Float32Array(n * 2)
  for (let i = 0; i < n * 2; i++) {
    positions[i] = (Math.random() - 0.5) * 4096
  }
  return positions
}

export interface UseCosmosSimulation {
  startSimulation: () => void
  stopSimulation: () => void
  pauseSimulation: () => void
  restartSimulation: () => void
}

/**
 * Simulation lifecycle controls for a Cosmos.gl graph instance.
 *
 * @param cosmosRef - Ref to the Cosmos.gl graph instance.
 * @param data - Current graph data (needed for restart to re-randomize positions).
 * @returns Simulation control callbacks.
 */
export function useCosmosSimulation(
  cosmosRef: React.RefObject<CosmosGraph | null>,
  data: CosmosGraphData | null,
): UseCosmosSimulation {
  const startSimulation = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.fitView(0)
    cosmos.start()
  }, [cosmosRef])

  const stopSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [cosmosRef])

  const pauseSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [cosmosRef])

  const restartSimulation = useCallback((): void => {
    if (!data) return
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setPointPositions(generateRandomPositions(data.nodeCount))
    cosmos.render(0)
    cosmos.fitView(0)
    cosmos.start()
  }, [cosmosRef, data])

  return { startSimulation, stopSimulation, pauseSimulation, restartSimulation }
}

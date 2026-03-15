import { useCallback, useEffect, useRef, useState } from 'react'
import type Graph from 'graphology'
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker'
import { random } from 'graphology-layout'

// The FA2 type declarations don't expose internal properties that exist at runtime
interface FA2Internal extends FA2LayoutSupervisor {
  worker: Worker | null
  killed: boolean
  settings: Record<string, unknown>
}

export interface SimulationSettings {
  gravity: number
  speed: number
}

export interface FA2SimulationHandle {
  isRunning: boolean
  errorMessage: string | null
  start: () => void
  stop: () => void
  randomizeLayout: () => void
}

/**
 * Manages a ForceAtlas2 Web Worker simulation on the given graph.
 *
 * @param graph - Graphology graph instance.
 * @param settings - Simulation settings (gravity and speed/scalingRatio).
 * @returns Handle with start/stop/randomize controls and status.
 */
export function useFA2Simulation(
  graph: Graph | null,
  settings: SimulationSettings,
): FA2SimulationHandle {
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const layoutRef = useRef<FA2Internal | null>(null)

  // Create and kill the supervisor when graph changes
  useEffect(() => {
    if (!graph) return

    let layout: FA2Internal
    try {
      layout = new FA2LayoutSupervisor(graph, {
        settings: {
          gravity: settings.gravity,
          scalingRatio: settings.speed,
          barnesHutOptimize: graph.order > 1000,
        },
      }) as FA2Internal
    } catch (e) {
      setErrorMessage('Simulation failed — reload file to continue.')
      console.error('FA2 init error:', e)
      return
    }

    layoutRef.current = layout

    // Worker error handling
    if (layout.worker) {
      layout.worker.onerror = (): void => {
        setErrorMessage('Simulation failed — reload file to continue.')
        setIsRunning(false)
      }
    }

    return (): void => {
      layout.kill()
      layoutRef.current = null
      setIsRunning(false)
    }
    // Only re-create on graph change, not on settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Update settings on the live supervisor without recreating
  useEffect(() => {
    const layout = layoutRef.current
    if (!layout || layout.killed) return

    layout.settings.gravity = settings.gravity
    layout.settings.scalingRatio = settings.speed
  }, [settings.gravity, settings.speed])

  const start = useCallback((): void => {
    const layout = layoutRef.current
    if (!layout || layout.killed) return

    try {
      layout.start()
      setIsRunning(true)
    } catch (e) {
      setErrorMessage('Simulation failed — reload file to continue.')
      console.error('FA2 start error:', e)
    }
  }, [])

  const stop = useCallback((): void => {
    const layout = layoutRef.current
    if (!layout || layout.killed) return

    layout.stop()
    setIsRunning(false)
  }, [])

  const randomizeLayout = useCallback((): void => {
    if (!graph) return
    const layout = layoutRef.current
    const wasRunning = layout?.isRunning() ?? false

    if (layout && !layout.killed && wasRunning) {
      layout.stop()
    }

    random.assign(graph, { scale: 1, center: 0 })

    if (layout && !layout.killed && wasRunning) {
      layout.start()
    }

    setIsRunning(wasRunning)
  }, [graph])

  return { isRunning, errorMessage, start, stop, randomizeLayout }
}

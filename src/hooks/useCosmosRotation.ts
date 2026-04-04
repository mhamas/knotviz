import { useEffect, useRef, useState } from 'react'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'

export interface UseCosmosRotation {
  rotationCenter: { x: number; y: number } | null
  /** Ref to the rotate function — call via `.current(deg)` for stable identity. */
  rotatePositionsRef: React.RefObject<(deltaDeg: number) => void>
  handleRotateCW: () => void
  handleRotateCCW: () => void
}

/**
 * Rotation controls for a Cosmos.gl graph — rotates actual node positions around
 * center of mass. Uses refs for function identity stability (avoids React Compiler
 * memoization interference). Supports Shift+wheel for continuous rotation.
 *
 * @param cosmosRef - Ref to the Cosmos.gl graph instance.
 * @param containerRef - Ref to the canvas container element (for wheel events).
 * @param hoverRef - Ref to the hover label element (hidden during rotation).
 * @param isSimRunningRef - Ref tracking simulation running state (rotation disabled during sim).
 * @returns Rotation state and control callbacks.
 */
export function useCosmosRotation(
  cosmosRef: React.RefObject<CosmosGraph | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  hoverRef: React.RefObject<HTMLDivElement | null>,
  isSimRunningRef: React.RefObject<boolean>,
): UseCosmosRotation {
  const [rotationCenter, setRotationCenter] = useState<{ x: number; y: number } | null>(null)
  const hideRotationCenterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Rotate all point positions by a delta angle (degrees) around their center of mass. */
  const rotatePositionsRef = useRef((deltaDeg: number): void => {
    const cosmos = cosmosRef.current
    if (!cosmos || isSimRunningRef.current) return
    const positions = cosmos.getPointPositions()
    if (!positions || positions.length < 2) return

    const n = positions.length / 2
    // Find center of mass
    let cx = 0, cy = 0
    for (let i = 0; i < n; i++) {
      cx += positions[i * 2]
      cy += positions[i * 2 + 1]
    }
    cx /= n
    cy /= n

    // Apply rotation matrix around center
    const rad = (deltaDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const rotated = new Float32Array(positions.length)
    for (let i = 0; i < n; i++) {
      const x = positions[i * 2] - cx
      const y = positions[i * 2 + 1] - cy
      rotated[i * 2] = x * cos - y * sin + cx
      rotated[i * 2 + 1] = x * sin + y * cos + cy
    }
    cosmos.setPointPositions(rotated)
    cosmos.render(0)

    // Hide hover label during rotation
    if (hoverRef.current) hoverRef.current.style.display = 'none'

    // Show rotation center marker
    const [sx, sy] = cosmos.spaceToScreenPosition([cx, cy])
    setRotationCenter({ x: sx, y: sy })

    // Auto-hide after 150ms of no rotation
    if (hideRotationCenterTimer.current) clearTimeout(hideRotationCenterTimer.current)
    hideRotationCenterTimer.current = setTimeout(() => setRotationCenter(null), 150)
  })

  // Shift+wheel rotation — batches rapid scroll events into one rAF
  useEffect(() => {
    const div = containerRef.current
    if (!div) return
    let pendingDeg = 0
    let frameId = 0
    const flush = (): void => {
      frameId = 0
      if (pendingDeg === 0) return
      const deg = pendingDeg
      pendingDeg = 0
      rotatePositionsRef.current(deg)
    }
    const handleWheel = (e: WheelEvent): void => {
      if (!e.shiftKey || isSimRunningRef.current) return
      const rawDelta = e.deltaY || e.deltaX
      if (!rawDelta) return
      e.preventDefault()
      e.stopPropagation()
      pendingDeg += rawDelta * 0.3
      if (!frameId) frameId = requestAnimationFrame(flush)
    }
    div.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return (): void => {
      div.removeEventListener('wheel', handleWheel, { capture: true })
      if (frameId) cancelAnimationFrame(frameId)
    }
  // Stable deps: refs never change identity, effect runs once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRotateCW = (): void => { rotatePositionsRef.current(15) }
  const handleRotateCCW = (): void => { rotatePositionsRef.current(-15) }

  return { rotationCenter, rotatePositionsRef, handleRotateCW, handleRotateCCW }
}

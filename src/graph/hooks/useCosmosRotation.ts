import { useEffect, useRef, useState } from 'react'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'
import { computeCenterOfMass, rotatePointsInPlace } from '../lib/rotatePoints'

export interface UseCosmosRotation {
  rotationCenter: { x: number; y: number } | null
  /** Ref to the rotate function — call via `.current(deg)` for stable identity. */
  rotatePositionsRef: React.RefObject<(deltaDeg: number) => void>
  handleRotateCW: () => void
  handleRotateCCW: () => void
}

/**
 * Idle time (ms) after the last rotation event before the gesture's cached
 * position snapshot is discarded. The very next rotation reads fresh positions
 * from cosmos, so anything that might have changed in the meantime (simulation,
 * node drag, new graph load) is picked up.
 */
const BURST_IDLE_MS = 200

/**
 * Subset of cosmos.gl's private internals that we need to perform a
 * cascade-free position update. These fields/methods are `private` in
 * cosmos's TypeScript typings but their JS property names are preserved in
 * the shipped (minified) bundle, so accessing them by name is stable across
 * patch versions. A major cosmos refactor would be caught by the shape check
 * in {@link getInternals}; the fallback is a plain `setPointPositions`.
 */
interface CosmosInternals {
  graph: {
    inputPointPositions: Float32Array | number[] | undefined
    updatePoints: () => void
  }
  points: {
    shouldSkipRescale: boolean | undefined
    updatePositions: () => void
  }
}

/** Shape-check cosmos internals; returns null if the expected fields aren't present. */
function getInternals(cosmos: CosmosGraph): CosmosInternals | null {
  const c = cosmos as unknown as Partial<CosmosInternals>
  if (!c.graph || typeof c.graph.updatePoints !== 'function') return null
  if (!c.points || typeof c.points.updatePositions !== 'function') return null
  return c as CosmosInternals
}

/**
 * Rotation controls for a Cosmos.gl graph — rotates actual node positions
 * around the center of mass.
 *
 * Why this is fast: cosmos.gl has no camera-rotation API and its public
 * `setPointPositions` flags thirteen downstream updates (Barnes-Hut quadtree
 * rebuild, link-force rebuild, center-force rebuild, cluster rebuild, four
 * attribute buffer re-uploads on points, four on links, adjacency-list and
 * degree rebuilds in `graph.update()`). None of those are needed for
 * rotation — simulation is off, attributes are unchanged, links are
 * unchanged. So instead of calling `setPointPositions`, we update the
 * position FBO directly via cosmos's internal `points.updatePositions()`
 * after staging the new positions in `graph.inputPointPositions` +
 * `graph.updatePoints()`. Cosmos's continuous render loop picks up the new
 * FBO on the next frame; `getPointPositions` reads from the same FBO, so
 * downstream features (download, simulation start, fitView, hover, drag)
 * see the rotated positions transparently.
 *
 * Per-gesture caching: we snapshot positions and the center of mass once at
 * the start of a rotation burst and rotate the cached buffer in place each
 * frame. Rotation around the CoM is an isometry that preserves the CoM, so
 * the cached pivot stays correct for the whole burst. The burst ends after
 * {@link BURST_IDLE_MS} of inactivity, at which point the cache is dropped
 * and any further rotation reads fresh positions from cosmos.
 *
 * @param cosmosRef - Ref to the Cosmos.gl graph instance.
 * @param containerRef - Ref to the canvas container element (for wheel events).
 * @param hoverRef - Ref to the hover label element (hidden during rotation).
 * @param isSimRunningRef - Ref tracking simulation running state (rotation disabled during sim).
 * @param updateLabelsRef - Optional ref to a function that re-syncs the label
 * overlay. When provided, it is invoked after every rotation update so HTML
 * labels follow the rotated nodes instead of staying at their pre-rotation
 * screen positions.
 * @returns Rotation state and control callbacks.
 */
export function useCosmosRotation(
  cosmosRef: React.RefObject<CosmosGraph | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  hoverRef: React.RefObject<HTMLDivElement | null>,
  isSimRunningRef: React.RefObject<boolean>,
  updateLabelsRef?: React.RefObject<(() => void) | null>,
): UseCosmosRotation {
  const [rotationCenter, setRotationCenter] = useState<{ x: number; y: number } | null>(null)
  const hideRotationCenterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Per-burst cache — built lazily on first rotate, dropped after idle.
  const positionsCacheRef = useRef<Float32Array | null>(null)
  const centerCacheRef = useRef<{ cx: number; cy: number } | null>(null)
  const lastRotateTimeRef = useRef(0)

  /** Rotate all point positions by a delta angle (degrees) around their center of mass. */
  const rotatePositionsRef = useRef((deltaDeg: number): void => {
    const cosmos = cosmosRef.current
    if (!cosmos || isSimRunningRef.current || deltaDeg === 0) return

    // Drop the burst cache if too long has elapsed since the last rotate.
    // This transparently handles external position changes (simulation end,
    // node drag, new graph load) without explicit invalidation signals.
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - lastRotateTimeRef.current > BURST_IDLE_MS) {
      positionsCacheRef.current = null
      centerCacheRef.current = null
    }
    lastRotateTimeRef.current = now

    // Build the cache on first rotate of a burst.
    let positions = positionsCacheRef.current
    if (!positions) {
      const source = cosmos.getPointPositions()
      if (!source || source.length < 2) return
      positions = new Float32Array(source)
      positionsCacheRef.current = positions
      centerCacheRef.current = computeCenterOfMass(positions)
    }

    const center = centerCacheRef.current
    if (!center) return

    rotatePointsInPlace(positions, center.cx, center.cy, deltaDeg)

    // Fast path: bypass setPointPositions so we don't trigger the 13-flag
    // cascade that makes large-graph rotation janky. If cosmos's internals
    // ever shift under us, getInternals() returns null and we fall back to
    // the public API — correct, just slower.
    const internals = getInternals(cosmos)
    if (internals) {
      internals.graph.inputPointPositions = positions
      internals.points.shouldSkipRescale = true
      internals.graph.updatePoints()
      internals.points.updatePositions()
    } else {
      cosmos.setPointPositions(positions, true)
      cosmos.render(0)
    }

    // Re-sync the HTML label overlay so labels follow rotated nodes. Cosmos's
    // sampler reads from the position FBO we just updated, so the next call
    // returns fresh screen coordinates.
    updateLabelsRef?.current?.()

    // Hide hover label during rotation
    if (hoverRef.current) hoverRef.current.style.display = 'none'

    // Show rotation center marker
    const [sx, sy] = cosmos.spaceToScreenPosition([center.cx, center.cy])
    setRotationCenter({ x: sx, y: sy })

    // Auto-hide after 150ms of no rotation
    if (hideRotationCenterTimer.current) clearTimeout(hideRotationCenterTimer.current)
    hideRotationCenterTimer.current = setTimeout(() => setRotationCenter(null), 150)
  })

  // Shift+wheel rotation — rAF-batches rapid scroll events into at most one
  // rotation update per frame.
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
      let rawDelta = e.deltaY || e.deltaX
      if (!rawDelta) return
      // Normalize deltaMode so trackpads (0=pixels) and mouse wheels in
      // line (1) or page (2) mode scale consistently.
      if (e.deltaMode === 1) rawDelta *= 16
      else if (e.deltaMode === 2) rawDelta *= 100
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

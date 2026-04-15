/**
 * Compute the center of mass (arithmetic mean) of 2D points packed as
 * [x0, y0, x1, y1, ...]. Used once per rotation burst and cached — recomputing
 * it every frame would be wasteful since rotation around the CoM is an isometry
 * that preserves the CoM.
 *
 * @param positions - Packed 2D positions (length 2N).
 * @returns Center of mass {cx, cy}. Returns {0, 0} for empty input.
 * @example
 * computeCenterOfMass(new Float32Array([0, 0, 2, 0, 0, 2, 2, 2])) // { cx: 1, cy: 1 }
 */
export function computeCenterOfMass(positions: Float32Array): { cx: number; cy: number } {
  const n = positions.length / 2
  if (n === 0) return { cx: 0, cy: 0 }
  let cx = 0
  let cy = 0
  for (let i = 0; i < n; i++) {
    cx += positions[i * 2]
    cy += positions[i * 2 + 1]
  }
  return { cx: cx / n, cy: cy / n }
}

/**
 * Rotate packed 2D points around a given center, in place, by the given angle
 * in degrees. Mutates the input array — callers wanting a copy should clone
 * first. In-place rotation avoids a per-frame Float32Array allocation, which is
 * critical for smooth continuous rotation on large graphs (1M+ nodes).
 *
 * @param positions - Packed 2D positions (mutated).
 * @param cx - Rotation center X.
 * @param cy - Rotation center Y.
 * @param deltaDeg - Rotation angle in degrees (positive = counter-clockwise in
 * standard math convention; screen orientation depends on the renderer's axes).
 * @example
 * const pts = new Float32Array([2, 1])
 * rotatePointsInPlace(pts, 1, 1, 90) // pts is now approximately [1, 2]
 */
export function rotatePointsInPlace(
  positions: Float32Array,
  cx: number,
  cy: number,
  deltaDeg: number,
): void {
  if (deltaDeg === 0) return
  const n = positions.length / 2
  const rad = (deltaDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  for (let i = 0; i < n; i++) {
    const x = positions[i * 2] - cx
    const y = positions[i * 2 + 1] - cy
    positions[i * 2] = x * cos - y * sin + cx
    positions[i * 2 + 1] = x * sin + y * cos + cy
  }
}

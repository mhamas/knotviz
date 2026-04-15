import { describe, expect, it } from 'vitest'
import { computeCenterOfMass, rotatePointsInPlace } from '../lib/rotatePoints'

describe('computeCenterOfMass', () => {
  it('returns origin for empty input', () => {
    expect(computeCenterOfMass(new Float32Array(0))).toEqual({ cx: 0, cy: 0 })
  })

  it('returns the single point as the centre when given one point', () => {
    const result = computeCenterOfMass(new Float32Array([3, 4]))
    expect(result.cx).toBeCloseTo(3)
    expect(result.cy).toBeCloseTo(4)
  })

  it('computes the arithmetic mean of multiple points', () => {
    const pts = new Float32Array([0, 0, 2, 0, 0, 2, 2, 2])
    const result = computeCenterOfMass(pts)
    expect(result.cx).toBeCloseTo(1)
    expect(result.cy).toBeCloseTo(1)
  })

  it('handles negative coordinates', () => {
    const pts = new Float32Array([-1, -1, 1, 1])
    expect(computeCenterOfMass(pts)).toEqual({ cx: 0, cy: 0 })
  })

  it('handles asymmetric point distributions', () => {
    const pts = new Float32Array([10, 20, 30, 40, 50, 60])
    const result = computeCenterOfMass(pts)
    expect(result.cx).toBeCloseTo(30)
    expect(result.cy).toBeCloseTo(40)
  })

  it('does not mutate the input array', () => {
    const pts = new Float32Array([1, 2, 3, 4])
    const snapshot = Array.from(pts)
    computeCenterOfMass(pts)
    expect(Array.from(pts)).toEqual(snapshot)
  })

  it('handles many points without precision loss for the typical scale', () => {
    // 1000 points on a circle of radius 100 around (5, 5)
    const n = 1000
    const pts = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      const theta = (i / n) * 2 * Math.PI
      pts[i * 2] = 5 + 100 * Math.cos(theta)
      pts[i * 2 + 1] = 5 + 100 * Math.sin(theta)
    }
    const result = computeCenterOfMass(pts)
    expect(result.cx).toBeCloseTo(5, 2)
    expect(result.cy).toBeCloseTo(5, 2)
  })
})

describe('rotatePointsInPlace', () => {
  it('is a no-op for 0°', () => {
    const pts = new Float32Array([1, 2, 3, 4, 5, 6])
    rotatePointsInPlace(pts, 0, 0, 0)
    expect(Array.from(pts)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('rotates a point 90° counter-clockwise around the origin', () => {
    const pts = new Float32Array([1, 0])
    rotatePointsInPlace(pts, 0, 0, 90)
    expect(pts[0]).toBeCloseTo(0)
    expect(pts[1]).toBeCloseTo(1)
  })

  it('rotates 180° around the origin', () => {
    const pts = new Float32Array([1, 0, 0, 1])
    rotatePointsInPlace(pts, 0, 0, 180)
    expect(pts[0]).toBeCloseTo(-1)
    expect(pts[1]).toBeCloseTo(0)
    expect(pts[2]).toBeCloseTo(0)
    expect(pts[3]).toBeCloseTo(-1)
  })

  it('rotates -90° (clockwise) around the origin', () => {
    const pts = new Float32Array([1, 0])
    rotatePointsInPlace(pts, 0, 0, -90)
    expect(pts[0]).toBeCloseTo(0)
    expect(pts[1]).toBeCloseTo(-1)
  })

  it('a 360° rotation returns to the original position', () => {
    const pts = new Float32Array([3, 4, -5, 7])
    const original = Array.from(pts)
    rotatePointsInPlace(pts, 1, 2, 360)
    for (let i = 0; i < pts.length; i++) {
      expect(pts[i]).toBeCloseTo(original[i])
    }
  })

  it('rotates around an arbitrary centre', () => {
    // rotating (2,1) 90° CCW around (1,1) should yield (1,2)
    const pts = new Float32Array([2, 1])
    rotatePointsInPlace(pts, 1, 1, 90)
    expect(pts[0]).toBeCloseTo(1)
    expect(pts[1]).toBeCloseTo(2)
  })

  it('mutates the input array (returns void, same reference)', () => {
    const pts = new Float32Array([1, 0])
    const ref = pts
    rotatePointsInPlace(pts, 0, 0, 90)
    expect(pts).toBe(ref)
    expect(pts[0]).not.toBeCloseTo(1)
  })

  it('preserves the centre of mass when rotating around it', () => {
    const pts = new Float32Array([1, 1, 3, 1, 1, 3, 3, 3])
    const before = computeCenterOfMass(pts)
    rotatePointsInPlace(pts, before.cx, before.cy, 45)
    const after = computeCenterOfMass(pts)
    expect(after.cx).toBeCloseTo(before.cx)
    expect(after.cy).toBeCloseTo(before.cy)
  })

  it('preserves pairwise distances (rotation is an isometry)', () => {
    const pts = new Float32Array([0, 0, 3, 4, -2, 5])
    const distBefore = Math.hypot(pts[2] - pts[0], pts[3] - pts[1])
    rotatePointsInPlace(pts, 1, 1, 73.5)
    const distAfter = Math.hypot(pts[2] - pts[0], pts[3] - pts[1])
    expect(distAfter).toBeCloseTo(distBefore)
  })

  it('handles empty input without throwing', () => {
    const pts = new Float32Array(0)
    expect(() => rotatePointsInPlace(pts, 0, 0, 45)).not.toThrow()
  })

  it('two consecutive 45° rotations equal one 90° rotation', () => {
    const a = new Float32Array([1, 0, 0, 1, -1, 0])
    const b = new Float32Array([1, 0, 0, 1, -1, 0])
    rotatePointsInPlace(a, 0, 0, 45)
    rotatePointsInPlace(a, 0, 0, 45)
    rotatePointsInPlace(b, 0, 0, 90)
    for (let i = 0; i < a.length; i++) {
      expect(a[i]).toBeCloseTo(b[i], 5)
    }
  })

  it('handles a 1° rotation accurately enough for visual smoothness', () => {
    // Sanity check that small rotations produce small displacements.
    const pts = new Float32Array([100, 0])
    rotatePointsInPlace(pts, 0, 0, 1)
    // 100 * tan(1°) ≈ 1.745
    expect(pts[0]).toBeCloseTo(99.985, 2)
    expect(pts[1]).toBeCloseTo(1.745, 2)
  })

  it('rotates many points correctly', () => {
    const n = 100
    const pts = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      pts[i * 2] = i // (0,0), (1,0), ..., (99,0) — collinear on x-axis
      pts[i * 2 + 1] = 0
    }
    rotatePointsInPlace(pts, 0, 0, 90)
    // After 90° CCW: (0,0), (0,1), ..., (0,99) — collinear on y-axis
    for (let i = 0; i < n; i++) {
      expect(pts[i * 2]).toBeCloseTo(0, 4)
      expect(pts[i * 2 + 1]).toBeCloseTo(i, 4)
    }
  })
})

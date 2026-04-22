import { describe, it, expect } from 'vitest'
import { applyGradient, SIZE_MIN, SIZE_MAX } from '../lib/applyGradient'
import { hexToRgbNorm } from '../lib/appearanceUtils'

const viridisStops: [number, number, number][] = [
  hexToRgbNorm('#440154'),
  hexToRgbNorm('#3b528b'),
  hexToRgbNorm('#21908c'),
  hexToRgbNorm('#5dc963'),
  hexToRgbNorm('#fde725'),
]

/** Helper: create test arrays and fill defaults. */
function setup(nodeCount: number, visibleIndices?: number[]): {
  pointColors: Float32Array
  pointSizes: Float32Array
  visible: Uint8Array
} {
  const pointColors = new Float32Array(nodeCount * 4)
  const pointSizes = new Float32Array(nodeCount)
  const visible = new Uint8Array(nodeCount)

  // Set defaults for visible nodes
  const indices = visibleIndices ?? Array.from({ length: nodeCount }, (_, i) => i)
  for (const i of indices) {
    visible[i] = 1
    pointColors[i * 4] = 0.5     // default R
    pointColors[i * 4 + 1] = 0.5 // default G
    pointColors[i * 4 + 2] = 0.5 // default B
    pointColors[i * 4 + 3] = 1.0 // default A
    pointSizes[i] = 4            // BASE_POINT_SIZE
  }

  return { pointColors, pointSizes, visible }
}

describe('applyGradient — color mode (regression)', () => {
  it('maps numeric values to palette colors', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'color')

    // t=0 → first stop, t=1 → last stop
    const [r0, g0, b0] = viridisStops[0]
    expect(pointColors[0]).toBeCloseTo(r0, 3)
    expect(pointColors[1]).toBeCloseTo(g0, 3)
    expect(pointColors[2]).toBeCloseTo(b0, 3)

    const [rN, gN, bN] = viridisStops[viridisStops.length - 1]
    expect(pointColors[4]).toBeCloseTo(rN, 3)
    expect(pointColors[5]).toBeCloseTo(gN, 3)
    expect(pointColors[6]).toBeCloseTo(bN, 3)
  })

  it('does not modify pointSizes in color mode', () => {
    const { pointColors, pointSizes, visible } = setup(3)
    const col = [10, 50, 90]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'color')
    // Sizes should remain at default (4)
    expect(pointSizes[0]).toBe(4)
    expect(pointSizes[1]).toBe(4)
    expect(pointSizes[2]).toBe(4)
  })

  it('skips filtered-out nodes', () => {
    const { pointColors, pointSizes, visible } = setup(3, [0, 2])
    const col = [0, 50, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'color')
    // Node 1 is not visible — its color should remain at default (0,0,0,0 since visible[1]=0)
    expect(pointColors[4]).toBe(0)
    expect(pointColors[5]).toBe(0)
    expect(pointColors[6]).toBe(0)
  })
})

describe('applyGradient — size mode', () => {
  it('maps numeric min to SIZE_MIN and max to SIZE_MAX', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'size')

    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[1]).toBeCloseTo(SIZE_MAX, 3)
  })

  it('interpolates intermediate values using sqrt scaling (area-proportional)', () => {
    const { pointColors, pointSizes, visible } = setup(3)
    const col = [0, 50, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'size')

    // t=0.5 → sqrt(0.5) ≈ 0.7071
    const midSize = SIZE_MIN + Math.sqrt(0.5) * (SIZE_MAX - SIZE_MIN)
    expect(pointSizes[1]).toBeCloseTo(midSize, 3)
  })

  it('does not modify pointColors (RGB stays at default)', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 100]
    const r0 = pointColors[0], g0 = pointColors[1], b0 = pointColors[2]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'size')

    // RGB should be unchanged
    expect(pointColors[0]).toBe(r0)
    expect(pointColors[1]).toBe(g0)
    expect(pointColors[2]).toBe(b0)
  })

  it('uses midpoint size when all values are equal', () => {
    const { pointColors, pointSizes, visible } = setup(3)
    const col = [42, 42, 42]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'size')

    // t=0.5 → sqrt(0.5) ≈ 0.7071
    const midSize = SIZE_MIN + Math.sqrt(0.5) * (SIZE_MAX - SIZE_MIN)
    expect(pointSizes[0]).toBeCloseTo(midSize, 3)
    expect(pointSizes[1]).toBeCloseTo(midSize, 3)
    expect(pointSizes[2]).toBeCloseTo(midSize, 3)
  })

  it('skips filtered-out nodes', () => {
    const { pointColors, pointSizes, visible } = setup(3, [0, 2])
    const col = [0, 50, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'size')

    // Node 1 is not visible — size should remain 0 (default for invisible)
    expect(pointSizes[1]).toBe(0)
    // Visible nodes should be mapped
    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[2]).toBeCloseTo(SIZE_MAX, 3)
  })

  it('works with date property type', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = ['2020-01-01', '2024-01-01']
    applyGradient(pointColors, pointSizes, visible, col, 'date', viridisStops, 2, 'size')

    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[1]).toBeCloseTo(SIZE_MAX, 3)
  })

  it('works with boolean property type', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [false, true]
    applyGradient(pointColors, pointSizes, visible, col, 'boolean', viridisStops, 2, 'size')

    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[1]).toBeCloseTo(SIZE_MAX, 3)
  })
})

describe('applyGradient — custom size range', () => {
  it('uses custom sizeRange when provided', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'size', { sizeRange: [3, 15] })

    expect(pointSizes[0]).toBeCloseTo(3, 3)
    expect(pointSizes[1]).toBeCloseTo(15, 3)
  })

  it('interpolates midpoint with custom range using sqrt scaling', () => {
    const { pointColors, pointSizes, visible } = setup(3)
    const col = [0, 50, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'size', { sizeRange: [2, 18] })

    // t=0.5 → sqrt(0.5) ≈ 0.7071, size = 2 + 0.7071*16 ≈ 13.314
    expect(pointSizes[1]).toBeCloseTo(2 + Math.sqrt(0.5) * 16, 3)
  })

  it('falls back to defaults when no config provided', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'size')

    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[1]).toBeCloseTo(SIZE_MAX, 3)
  })

  it('reverses the size encoding when sizeRange is passed as [max, min]', () => {
    // The reverse toggle in the UI flips the sizeRange tuple at the worker call
    // site. Smallest data value should now render as the LARGEST node, largest
    // value as the smallest node. Sqrt area-proportional math still applies.
    const { pointColors, pointSizes, visible } = setup(3)
    const col = [0, 50, 100]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 3, 'size', { sizeRange: [18, 2] })

    // t=0 (smallest data) → 18 + sqrt(0) * (2 - 18) = 18 (biggest node)
    expect(pointSizes[0]).toBeCloseTo(18, 3)
    // t=1 (largest data) → 18 + sqrt(1) * (2 - 18) = 2 (smallest node)
    expect(pointSizes[2]).toBeCloseTo(2, 3)
    // Midpoint: 18 + sqrt(0.5) * -16 ≈ 6.686
    expect(pointSizes[1]).toBeCloseTo(18 + Math.sqrt(0.5) * -16, 3)
  })
})

describe('applyGradient — log scale', () => {
  // With log scale, t = log10(v+1) / log10(max+1) for a [0, max] range
  // This compresses the upper range and spreads the lower range.

  it('size mode: log scale spreads small values more than linear', () => {
    // Linear: t for value 10 in [0, 10000] = 10/10000 = 0.001
    // Log:    t = log10(11)/log10(10001) ≈ 1.041/4.000 ≈ 0.260
    const { pointColors, visible } = setup(3)
    const col = [0, 10, 10000]

    // Linear size
    const linearSizes = new Float32Array(3)
    linearSizes.fill(4)
    const linearVisible = new Uint8Array([1, 1, 1])
    applyGradient(pointColors, linearSizes, linearVisible, col, 'number', viridisStops, 3, 'size')
    const linearMidSize = linearSizes[1]

    // Log size
    const logSizes = new Float32Array(3)
    logSizes.fill(4)
    applyGradient(pointColors, logSizes, visible, col, 'number', viridisStops, 3, 'size', { isLogScale: true })
    const logMidSize = logSizes[1]

    // In log scale, value 10 should get a much larger size than linear
    expect(logMidSize).toBeGreaterThan(linearMidSize)
    // Min and max should still map to SIZE_MIN and SIZE_MAX
    expect(logSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(logSizes[2]).toBeCloseTo(SIZE_MAX, 3)
  })

  it('color mode: log scale changes gradient distribution', () => {
    const { visible } = setup(3)
    const col = [0, 10, 10000]

    // Linear color — node 1 at t≈0.001, very close to first stop
    const linearColors = new Float32Array(3 * 4)
    applyGradient(linearColors, new Float32Array(3), new Uint8Array([1, 1, 1]), col, 'number', viridisStops, 3, 'color')
    const linearG1 = linearColors[5] // node 1 G channel — varies more in Viridis

    // Log color — node 1 at t≈0.26, should be noticeably different
    const logColors = new Float32Array(3 * 4)
    applyGradient(logColors, new Float32Array(3), visible, col, 'number', viridisStops, 3, 'color', { isLogScale: true })
    const logG1 = logColors[5]

    expect(Math.abs(logG1 - linearG1)).toBeGreaterThan(0.05)
  })

  it('log scale with all-zero values uses midpoint', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = [0, 0]
    applyGradient(pointColors, pointSizes, visible, col, 'number', viridisStops, 2, 'size', { isLogScale: true })

    // t=0.5 → sqrt(0.5) ≈ 0.7071
    const midSize = SIZE_MIN + Math.sqrt(0.5) * (SIZE_MAX - SIZE_MIN)
    expect(pointSizes[0]).toBeCloseTo(midSize, 3)
  })

  it('log scale disabled for date type still works', () => {
    const { pointColors, pointSizes, visible } = setup(2)
    const col = ['2020-01-01', '2024-01-01']
    applyGradient(pointColors, pointSizes, visible, col, 'date', viridisStops, 2, 'size', { isLogScale: true })

    expect(pointSizes[0]).toBeCloseTo(SIZE_MIN, 3)
    expect(pointSizes[1]).toBeCloseTo(SIZE_MAX, 3)
  })
})

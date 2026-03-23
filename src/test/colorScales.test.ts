import { describe, expect, it } from 'vitest'
import {
  interpolatePalette,
  interpolateColors,
  getPaletteColors,
  samplePalette,
  isBuiltinPalette,
  PALETTE_NAMES,
} from '@/lib/colorScales'

describe('interpolatePalette', () => {
  it('returns the first stop at t=0', () => {
    expect(interpolatePalette('Viridis', 0)).toBe('#440154')
    expect(interpolatePalette('Blues', 0)).toBe('#f7fbff')
  })

  it('returns the last stop at t=1', () => {
    expect(interpolatePalette('Viridis', 1)).toBe('#fde725')
    expect(interpolatePalette('Plasma', 1)).toBe('#f0f921')
  })

  it('clamps t below 0 to the first stop', () => {
    expect(interpolatePalette('Reds', -0.5)).toBe('#fff5f0')
  })

  it('clamps t above 1 to the last stop', () => {
    expect(interpolatePalette('Reds', 1.5)).toBe('#67000d')
  })

  it('interpolates midpoint between two stops', () => {
    expect(interpolatePalette('Viridis', 0.5)).toBe('#21908c')
  })

  it('interpolates between stops for fractional t', () => {
    expect(interpolatePalette('Viridis', 0.25)).toBe('#3b528b')
  })

  it('interpolates between two adjacent stops', () => {
    const result = interpolatePalette('Viridis', 0.125)
    expect(result).toBe('#402a70')
  })

  it('works for all built-in palette names', () => {
    for (const p of PALETTE_NAMES) {
      const color = interpolatePalette(p, 0.5)
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('interpolateColors', () => {
  it('interpolates a simple two-stop gradient', () => {
    expect(interpolateColors(['#000000', '#ffffff'], 0)).toBe('#000000')
    expect(interpolateColors(['#000000', '#ffffff'], 1)).toBe('#ffffff')
    expect(interpolateColors(['#000000', '#ffffff'], 0.5)).toBe('#808080')
  })

  it('returns #000000 for empty stops', () => {
    expect(interpolateColors([], 0.5)).toBe('#000000')
  })

  it('returns the single color for one-stop array', () => {
    expect(interpolateColors(['#ff0000'], 0.5)).toBe('#ff0000')
  })
})

describe('getPaletteColors', () => {
  it('returns built-in stops for a palette', () => {
    const colors = getPaletteColors('Blues')
    expect(colors).toEqual(['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594'])
  })

  it('returns 6 stops for Plasma', () => {
    expect(getPaletteColors('Plasma')).toHaveLength(6)
  })

  it('appends custom colors after built-in stops', () => {
    const colors = getPaletteColors('Blues', ['#ff0000', '#00ff00'])
    expect(colors).toEqual([
      '#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594',
      '#ff0000', '#00ff00',
    ])
  })

  it('returns only built-in stops when customColors is empty', () => {
    const colors = getPaletteColors('Viridis', [])
    expect(colors).toEqual(['#440154', '#3b528b', '#21908c', '#5dc963', '#fde725'])
  })

  it('does not mutate the built-in palette array', () => {
    const before = getPaletteColors('Reds')
    getPaletteColors('Reds', ['#000000'])
    const after = getPaletteColors('Reds')
    expect(after).toEqual(before)
  })
})

describe('samplePalette', () => {
  it('samples N evenly-spaced colors from a palette', () => {
    const colors = samplePalette('Viridis', 3)
    expect(colors).toHaveLength(3)
    expect(colors[0]).toBe('#440154') // t=0
    expect(colors[2]).toBe('#fde725') // t=1
  })

  it('clamps to minimum of 2 colors', () => {
    const colors = samplePalette('Blues', 1)
    expect(colors).toHaveLength(2)
  })

  it('returns all hex colors', () => {
    const colors = samplePalette('Plasma', 10)
    expect(colors).toHaveLength(10)
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('isBuiltinPalette', () => {
  it('returns true for built-in palette names', () => {
    expect(isBuiltinPalette('Viridis')).toBe(true)
    expect(isBuiltinPalette('Magma')).toBe(true)
    expect(isBuiltinPalette('Turbo')).toBe(true)
  })

  it('returns false for non-palette strings', () => {
    expect(isBuiltinPalette('custom-123')).toBe(false)
    expect(isBuiltinPalette('')).toBe(false)
  })
})

describe('PALETTE_NAMES', () => {
  it('contains all 18 built-in palettes', () => {
    expect(PALETTE_NAMES).toHaveLength(18)
  })
})

import type { PaletteName } from '@/types'

/** Built-in palette stop colors (low → high). */
export const PALETTE_STOPS: Record<PaletteName, string[]> = {
  Viridis: ['#440154', '#3b528b', '#21908c', '#5dc963', '#fde725'],
  Plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
  Magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  Inferno: ['#000004', '#420a68', '#932567', '#dd513a', '#fca50a', '#fcffa4'],
  Turbo: ['#30123b', '#4662d7', '#35aef5', '#1ae4b6', '#72fe5e', '#c8ef34', '#faba39', '#f66b19', '#d23105', '#7a0403'],
  Blues: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594'],
  Reds: ['#fff5f0', '#fcbba1', '#fb6a4a', '#cb181d', '#67000d'],
  Greens: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
  Oranges: ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#7f2704'],
  Purples: ['#fcfbfd', '#dadaeb', '#9e9ac8', '#6a51a3', '#3f007d'],
  Rainbow: ['#6e40aa', '#1d91c0', '#39c96c', '#efbd2e', '#e4462b'],
  Spectral: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
  RdBu: ['#67001f', '#d6604d', '#f7f7f7', '#4393c3', '#053061'],
  RdYlGn: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
  PiYG: ['#8e0152', '#c51b7d', '#de77ae', '#f1b6da', '#fde0ef', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221', '#276419'],
}

/** Ordered list of all built-in palette names for UI rendering. */
export const PALETTE_NAMES: PaletteName[] = Object.keys(PALETTE_STOPS) as PaletteName[]

/**
 * Parse a hex color string (#rrggbb) into [r, g, b].
 * @param hex - 7-character hex color string
 * @returns RGB tuple with values 0–255
 */
function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/**
 * Format an RGB tuple as a 7-character hex string.
 * @param r - Red channel 0–255
 * @param g - Green channel 0–255
 * @param b - Blue channel 0–255
 * @returns Hex color string like `#1a2b3c`
 */
function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)))
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  )
}

/**
 * Linearly interpolate an array of color stops at parameter `t`.
 * @param stops - Array of hex color strings defining the gradient.
 * @param t - Interpolation parameter in [0, 1]. Values outside this range are clamped.
 * @returns Hex color string.
 * @example
 * interpolateColors(['#000000', '#ffffff'], 0.5) // '#808080'
 */
export function interpolateColors(stops: string[], t: number): string {
  if (stops.length === 0) return '#000000'
  if (stops.length === 1) return stops[0]

  const clamped = Math.max(0, Math.min(1, t))
  if (clamped <= 0) return stops[0]
  if (clamped >= 1) return stops[stops.length - 1]

  const segment = clamped * (stops.length - 1)
  const i = Math.floor(segment)
  const frac = segment - i

  const [r1, g1, b1] = parseHex(stops[i])
  const [r2, g2, b2] = parseHex(stops[i + 1])

  return toHex(
    r1 + frac * (r2 - r1),
    g1 + frac * (g2 - g1),
    b1 + frac * (b2 - b1),
  )
}

/**
 * Linearly interpolate a built-in palette at parameter `t`.
 * @param palette - Name of a built-in palette.
 * @param t - Interpolation parameter in [0, 1]. Values outside this range are clamped.
 * @returns Hex color string.
 * @example
 * interpolatePalette('Viridis', 0)   // '#440154'
 * interpolatePalette('Viridis', 1)   // '#fde725'
 */
export function interpolatePalette(palette: PaletteName, t: number): string {
  return interpolateColors(PALETTE_STOPS[palette], t)
}

/**
 * Return the stop colors for a built-in palette, with optional custom colors appended.
 * @param palette - Name of a built-in palette.
 * @param customColors - Additional hex colors to append after the built-in stops.
 * @returns Array of hex color strings.
 * @example
 * getPaletteColors('Blues')                    // ['#f7fbff', ..., '#084594']
 * getPaletteColors('Blues', ['#ff0000'])        // [...blues stops, '#ff0000']
 */
export function getPaletteColors(
  palette: PaletteName,
  customColors: string[] = [],
): string[] {
  return [...PALETTE_STOPS[palette], ...customColors]
}

/**
 * Sample `n` evenly-spaced colors from a built-in palette.
 * @param palette - Name of a built-in palette to sample from.
 * @param n - Number of colors to sample (min 2).
 * @returns Array of `n` hex color strings.
 * @example
 * samplePalette('Viridis', 3) // ['#440154', '#21908c', '#fde725']
 */
export function samplePalette(palette: PaletteName, n: number): string[] {
  const count = Math.max(2, n)
  return Array.from({ length: count }, (_, i) =>
    interpolatePalette(palette, i / (count - 1)),
  )
}

/**
 * Check whether a string is a built-in palette name.
 * @param name - String to check.
 * @returns True if the name is a valid PaletteName.
 */
export function isBuiltinPalette(name: string): name is PaletteName {
  return name in PALETTE_STOPS
}

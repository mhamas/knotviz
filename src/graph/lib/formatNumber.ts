/**
 * Format a number for display in the UI.
 *
 * - Uses a comma as the thousands separator and a dot as the decimal
 *   separator (en-US convention). Every user-visible number in the app
 *   should go through this function so formatting stays consistent.
 * - By default, preserves the decimal portion of the value exactly as
 *   JavaScript's `Number.prototype.toString()` would render it. Pass
 *   `decimals` to force a specific precision (e.g. 2 for a mean value).
 * - Falls back to scientific notation for extreme magnitudes — values
 *   with `|x| >= 1e15` or nonzero `|x| < 1e-4` — so the output never
 *   overflows into an unreadable wall of digits or zeros.
 * - Non-finite inputs (`NaN`, `±Infinity`) round-trip through
 *   `String(value)` so callers see something meaningful rather than
 *   "NaN" hiding behind a formatted zero.
 *
 * @param value - The numeric value to format.
 * @param options - Optional formatting controls.
 * @param options.decimals - If set, force this many decimal places
 *   (using toLocaleString's fraction-digit options). Negative values
 *   and zero are allowed; fractional decimals are clamped to 0–20.
 * @param options.maxDecimals - If set, cap the fractional portion at
 *   this many digits (rounded) without padding shorter values — so an
 *   integer stays an integer. Ignored when `decimals` is also set.
 *
 * @example
 * formatNumber(1234567)          // '1,234,567'
 * formatNumber(1234567.89)       // '1,234,567.89'
 * formatNumber(0.1 + 0.2)        // '0.30000000000000004' (raw — caller pass decimals to round)
 * formatNumber(47.02, { decimals: 2 })  // '47.02'
 * formatNumber(0.123456789, { maxDecimals: 6 })  // '0.123457'
 * formatNumber(42, { maxDecimals: 6 })           // '42'
 * formatNumber(1e18)             // '1.00e+18'
 * formatNumber(1e-6)             // '1.00e-6'
 * formatNumber(0)                // '0'
 * formatNumber(NaN)              // 'NaN'
 */
export function formatNumber(
  value: number,
  options: { decimals?: number; maxDecimals?: number } = {},
): string {
  if (!Number.isFinite(value)) return String(value)

  // Extreme magnitudes — fall back to scientific so a huge value doesn't
  // become a 20-digit string in the tooltip and a tiny value doesn't
  // become `0` after toLocaleString's default 3-decimal rounding.
  const abs = Math.abs(value)
  if (value !== 0 && (abs >= 1e15 || abs < 1e-4)) {
    return formatScientific(value)
  }

  if (options.decimals !== undefined) {
    const d = clampDecimals(options.decimals)
    return value.toLocaleString('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  }

  if (options.maxDecimals !== undefined) {
    const d = clampDecimals(options.maxDecimals)
    return value.toLocaleString('en-US', { maximumFractionDigits: d })
  }

  // Preserve the decimal portion exactly as JS renders it. toLocaleString
  // without fraction-digit options would truncate to 3 decimals, which
  // loses precision for user-supplied numeric properties.
  const raw = value.toString()
  const [intPart, decPart] = raw.split('.')
  const sign = intPart.startsWith('-') ? '-' : ''
  const absInt = sign ? intPart.slice(1) : intPart
  const withCommas = sign + Number(absInt).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}

/**
 * Scientific notation with two significant decimal places, e.g.
 * `1.23e+18` or `4.50e-7`. We strip JavaScript's default `e+18` → `e18`
 * only when the exponent sign is negative (keeps parity with how
 * developers typically write scientific by hand: `1.5e-6` not `1.5e-06`).
 */
function formatScientific(value: number): string {
  return value.toExponential(2).replace(/e\+?(-?\d+)/, (_, exp) => `e${exp}`)
}

function clampDecimals(decimals: number): number {
  if (!Number.isFinite(decimals)) return 0
  return Math.min(20, Math.max(0, Math.floor(decimals)))
}

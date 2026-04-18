import type { PropertyType, PropertyValue } from '../types'
import {
  ISO_DATE_RE,
  createTypeState,
  resolveType,
  updateTypeState,
} from './typeDetection'

/**
 * A parsed CSV/XML column header.
 */
export interface TypedHeader {
  name: string
  type?: PropertyType
}

const KNOWN_TYPES = new Set<PropertyType>(['number', 'string', 'boolean', 'date', 'string[]'])

/**
 * Parse a column header of the form `name` or `name:type`.
 *
 * Recognised type suffixes: `number`, `string`, `boolean`, `date`, `string[]`.
 * Anything else (including colons embedded in the name that aren't followed by a recognised
 * type) is treated as part of the name.
 *
 * @param raw - The column header string.
 * @returns The parsed header.
 *
 * @example
 * parseTypedHeader('age:number')  // → { name: 'age', type: 'number' }
 * parseTypedHeader('label')       // → { name: 'label' }
 * parseTypedHeader('weird:thing') // → { name: 'weird:thing' }
 */
export function parseTypedHeader(raw: string): TypedHeader {
  const colon = raw.lastIndexOf(':')
  if (colon === -1) return { name: raw.trim() }
  const namePart = raw.slice(0, colon).trim()
  const typePart = raw.slice(colon + 1).trim()
  if (KNOWN_TYPES.has(typePart as PropertyType)) {
    return { name: namePart, type: typePart as PropertyType }
  }
  return { name: raw.trim() }
}

/**
 * Split a pipe-delimited string array. `\|` decodes to a literal pipe and `\\` decodes to
 * a literal backslash; a `\` followed by any other character is kept as-is.
 *
 * @param raw - The encoded string.
 * @returns The decoded array of strings.
 *
 * @example
 * splitStringArray('red|green|blue') // → ['red', 'green', 'blue']
 * splitStringArray('a\\|b|c')        // → ['a|b', 'c']
 * splitStringArray('')               // → []
 */
export function splitStringArray(raw: string): string[] {
  if (raw === '') return []
  const out: string[] = []
  let current = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '\\') {
      const next = raw[i + 1]
      if (next === '|' || next === '\\') {
        current += next
        i++
        continue
      }
    }
    if (ch === '|') {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out
}

/**
 * Serialise a string array for storage as a pipe-delimited cell. Backslashes are escaped as
 * `\\` first, then literal pipes as `\|`, so round-trip through splitStringArray is lossless.
 *
 * @param arr - The array to serialise.
 * @returns The pipe-delimited string.
 *
 * @example
 * serializeStringArray(['red', 'green']) // → 'red|green'
 * serializeStringArray(['a|b', 'c'])     // → 'a\\|b|c'
 */
export function serializeStringArray(arr: string[]): string {
  return arr.map((v) => v.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')).join('|')
}

/**
 * Coerce a raw cell string to a typed property value. An empty cell is reported as `undefined`
 * (i.e. missing — the downstream pipeline fills it with the type default).
 *
 * @param raw - The raw cell content.
 * @param type - The declared property type.
 * @returns The typed value, or `undefined` for an empty cell.
 * @throws If the cell cannot be coerced to the declared type.
 */
export function parseTypedCell(raw: string, type: PropertyType): PropertyValue | undefined {
  if (raw === '') return undefined
  switch (type) {
    case 'number': {
      const n = Number(raw)
      if (!Number.isFinite(n)) throw new Error(`Invalid number: "${raw}"`)
      return n
    }
    case 'boolean': {
      const lower = raw.toLowerCase()
      if (lower === 'true' || raw === '1') return true
      if (lower === 'false' || raw === '0') return false
      throw new Error(`Invalid boolean: "${raw}"`)
    }
    case 'date': {
      if (!ISO_DATE_RE.test(raw)) throw new Error(`Invalid date (expected ISO 8601): "${raw}"`)
      return raw
    }
    case 'string[]':
      return splitStringArray(raw)
    case 'string':
      return raw
  }
}

const LEADING_ZERO_INT_RE = /^0\d/

function coerceSampleValue(raw: string): PropertyValue {
  const lower = raw.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  if (!LEADING_ZERO_INT_RE.test(raw) && Number.isFinite(Number(raw))) return Number(raw)
  return raw
}

/**
 * Infer a column's PropertyType from a sample of raw cell strings. Empty cells are ignored.
 *
 * Arrays (`string[]`) are never inferred — they must be declared explicitly via a
 * `:string[]` type hint — because pipe characters can legitimately appear inside strings.
 *
 * Numbers are guarded against leading-zero integer strings (e.g. zip codes like `0012`)
 * to avoid corrupting ID-shaped data.
 *
 * @param samples - The raw strings to inspect.
 * @returns The inferred PropertyType (falls back to `string`, or `number` for all-empty input).
 */
export function inferColumnType(samples: string[]): PropertyType {
  const state = createTypeState()
  for (const raw of samples) {
    if (raw === '') continue
    updateTypeState(state, coerceSampleValue(raw))
  }
  const resolved = resolveType(state)
  // resolveType can return 'string[]' only if we fed arrays; we never do.
  return resolved === 'string[]' ? 'string' : resolved
}

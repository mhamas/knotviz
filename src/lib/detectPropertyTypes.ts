import type { NodeInput, PropertyType } from '../types'

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

/**
 * Infers the type of every property key by examining all node values.
 *
 * Rules (applied in order):
 * 1. All non-null values are JS booleans → 'boolean'
 * 2. All non-null values are JS numbers → 'number'
 * 3. 100% of non-null values match ISO 8601 date regex → 'date'
 * 4. Otherwise → 'string'
 *
 * Edge case: if all values are null/undefined → default to 'number'.
 *
 * Memory-optimised: tracks type candidates per key without collecting all values.
 *
 * @param nodes - Array of NodeInput objects to analyse.
 * @returns Map of propertyKey → PropertyType.
 * @example
 * detectPropertyTypes(graphData.nodes)
 * // → Map { 'age' → 'number', 'joined' → 'date', 'active' → 'boolean' }
 */
export function detectPropertyTypes(nodes: NodeInput[]): Map<string, PropertyType> {
  // Track type state per key without storing all values.
  // isAllBoolean / isAllNumber / isAllDate start true and get flipped to false
  // on the first non-matching value. nonNullCount tracks how many real values seen.
  const keyState = new Map<string, {
    nonNullCount: number
    isAllBoolean: boolean
    isAllNumber: boolean
    isAllDate: boolean
    isAllStringArray: boolean
  }>()

  for (let i = 0; i < nodes.length; i++) {
    const props = nodes[i].properties
    if (!props) continue
    for (const key of Object.keys(props)) {
      let state = keyState.get(key)
      if (!state) {
        state = { nonNullCount: 0, isAllBoolean: true, isAllNumber: true, isAllDate: true, isAllStringArray: true }
        keyState.set(key, state)
      }

      const value = props[key]
      if (value === null || value === undefined) continue
      state.nonNullCount++

      const isStringArray = Array.isArray(value) && value.every((v: unknown) => typeof v === 'string')

      if (state.isAllBoolean && typeof value !== 'boolean') state.isAllBoolean = false
      if (state.isAllNumber && typeof value !== 'number') state.isAllNumber = false
      if (state.isAllDate && !(typeof value === 'string' && ISO_DATE_RE.test(value))) state.isAllDate = false
      if (state.isAllStringArray && !isStringArray) state.isAllStringArray = false
    }
  }

  const result = new Map<string, PropertyType>()
  for (const [key, state] of keyState) {
    if (state.nonNullCount === 0) {
      result.set(key, 'number')
    } else if (state.isAllBoolean) {
      result.set(key, 'boolean')
    } else if (state.isAllNumber) {
      result.set(key, 'number')
    } else if (state.isAllDate) {
      result.set(key, 'date')
    } else if (state.isAllStringArray) {
      result.set(key, 'string[]')
    } else {
      result.set(key, 'string')
    }
  }

  return result
}

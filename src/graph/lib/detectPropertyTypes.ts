import type { NodeInput, PropertyType } from '../types'
import { createTypeState, updateTypeState, resolveType } from './typeDetection'

/**
 * Infers the type of every property key by examining all node values.
 *
 * Rules (applied in order):
 * 1. All non-null values are JS booleans → 'boolean'
 * 2. All non-null values are JS numbers → 'number'
 * 3. 100% of non-null values match ISO 8601 date regex → 'date'
 * 4. All non-null values are arrays of strings → 'string[]'
 * 5. Otherwise → 'string'
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
  const keyState = new Map<string, ReturnType<typeof createTypeState>>()

  for (let i = 0; i < nodes.length; i++) {
    const props = nodes[i].properties
    if (!props) continue
    for (const key of Object.keys(props)) {
      let state = keyState.get(key)
      if (!state) {
        state = createTypeState()
        keyState.set(key, state)
      }

      const value = props[key]
      if (value === null || value === undefined) continue
      updateTypeState(state, value)
    }
  }

  const result = new Map<string, PropertyType>()
  for (const [key, state] of keyState) {
    result.set(key, resolveType(state))
  }

  return result
}

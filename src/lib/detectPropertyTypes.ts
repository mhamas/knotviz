import type { NodeInput, PropertyType } from '../types'

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

/**
 * Infers the type of every property key by sampling all node values.
 *
 * Rules (applied in order):
 * 1. All non-null values are JS booleans → 'boolean'
 * 2. All non-null values are JS numbers → 'number'
 * 3. 100% of non-null values match ISO 8601 date regex → 'date'
 * 4. Otherwise → 'string'
 *
 * Edge case: if all values are null/undefined → default to 'number'.
 *
 * @param nodes - Array of NodeInput objects to analyse.
 * @returns Map of propertyKey → PropertyType.
 * @example
 * detectPropertyTypes(graphData.nodes)
 * // → Map { 'age' → 'number', 'joined' → 'date', 'active' → 'boolean' }
 */
export function detectPropertyTypes(nodes: NodeInput[]): Map<string, PropertyType> {
  const valuesByKey = new Map<string, unknown[]>()

  for (const node of nodes) {
    if (!node.properties) continue
    for (const [key, value] of Object.entries(node.properties)) {
      if (!valuesByKey.has(key)) {
        valuesByKey.set(key, [])
      }
      valuesByKey.get(key)!.push(value)
    }
  }

  const result = new Map<string, PropertyType>()

  for (const [key, values] of valuesByKey) {
    const nonNull = values.filter((v) => v !== null && v !== undefined)

    if (nonNull.length === 0) {
      result.set(key, 'number')
      continue
    }

    if (nonNull.every((v) => typeof v === 'boolean')) {
      result.set(key, 'boolean')
      continue
    }

    if (nonNull.every((v) => typeof v === 'number')) {
      result.set(key, 'number')
      continue
    }

    if (nonNull.every((v) => typeof v === 'string' && ISO_DATE_RE.test(v))) {
      result.set(key, 'date')
      continue
    }

    result.set(key, 'string')
  }

  return result
}

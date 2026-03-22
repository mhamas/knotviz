import type { GraphData, NullDefaultResult, PropertyType, PropertyValue } from '../types'
import { detectPropertyTypes } from './detectPropertyTypes'

const TYPE_DEFAULTS: Record<PropertyType, PropertyValue> = {
  number: 0,
  string: '',
  boolean: false,
  date: '1970-01-01',
}

/**
 * Detects missing property values across all nodes and replaces them with
 * type defaults. Type detection happens here first (via detectPropertyTypes).
 *
 * Defaults: number → 0 | string → "" | boolean → false | date → "1970-01-01"
 *
 * @param data - Validated GraphData from validateGraph.
 * @returns NullDefaultResult with mutated data and replacement count.
 * @example
 * const { data, replacementCount } = applyNullDefaults(validatedGraph)
 */
export function applyNullDefaults(data: GraphData): NullDefaultResult {
  const types = detectPropertyTypes(data.nodes)
  let replacementCount = 0

  const allKeys = Array.from(types.keys())

  if (allKeys.length === 0) {
    return { data, replacementCount: 0 }
  }

  for (const node of data.nodes) {
    if (!node.properties) {
      node.properties = {}
    }

    for (const key of allKeys) {
      if (!(key in node.properties) || node.properties[key] === null || node.properties[key] === undefined) {
        const type = types.get(key)!
        node.properties[key] = TYPE_DEFAULTS[type]
        replacementCount++
      }
    }
  }

  return { data, replacementCount }
}

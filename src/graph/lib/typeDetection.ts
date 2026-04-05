import type { PropertyType } from '../types'

/** ISO 8601 date regex: YYYY-MM-DD with optional time component. */
export const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

/** Per-key type inference state. Flags start true and flip false on first mismatch. */
export interface TypeState {
  nonNullCount: number
  isAllBoolean: boolean
  isAllNumber: boolean
  isAllDate: boolean
  isAllStringArray: boolean
}

/** Create a fresh TypeState with all flags set to true. */
export function createTypeState(): TypeState {
  return { nonNullCount: 0, isAllBoolean: true, isAllNumber: true, isAllDate: true, isAllStringArray: true }
}

/**
 * Update a TypeState with a new non-null value. Call once per value.
 *
 * @param state - The TypeState to mutate.
 * @param value - The property value to examine.
 */
export function updateTypeState(state: TypeState, value: unknown): void {
  state.nonNullCount++
  const isStringArray = Array.isArray(value) && value.every((v: unknown) => typeof v === 'string')
  if (state.isAllBoolean && typeof value !== 'boolean') state.isAllBoolean = false
  if (state.isAllNumber && typeof value !== 'number') state.isAllNumber = false
  if (state.isAllDate && !(typeof value === 'string' && ISO_DATE_RE.test(value))) state.isAllDate = false
  if (state.isAllStringArray && !isStringArray) state.isAllStringArray = false
}

/**
 * Resolve a TypeState to a PropertyType.
 *
 * @param state - The TypeState after processing all values.
 * @returns The inferred PropertyType.
 */
export function resolveType(state: TypeState): PropertyType {
  if (state.nonNullCount === 0) return 'number'
  if (state.isAllBoolean) return 'boolean'
  if (state.isAllNumber) return 'number'
  if (state.isAllDate) return 'date'
  if (state.isAllStringArray) return 'string[]'
  return 'string'
}

/**
 * Check if a value is a valid property value (number, string, boolean, or string[]).
 *
 * @param value - The value to check.
 * @returns Whether the value is a valid property value.
 */
export function isValidPropertyValue(value: unknown): boolean {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return true
  return Array.isArray(value) && value.every((v: unknown) => typeof v === 'string')
}

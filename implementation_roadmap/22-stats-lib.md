# Task 22: Stats Library Functions

**Release:** R3 | **Chunk:** 7 — Stats Tab
**Size:** M
**Prerequisites:** Task 02

## Goal

Two pure functions — `computeStats` and `computeHistogram` — compute descriptive statistics and a histogram bucket array over an array of numbers. Both are fully unit-tested with edge cases covered.

## Deliverables

### Files to create
- `src/lib/computeStats.ts`
- `src/lib/computeHistogram.ts`
- `src/test/computeStats.test.ts`
- `src/test/computeHistogram.test.ts`

## Implementation Notes

### `computeStats`
```ts
export function computeStats(values: Array<number | null | undefined>): PropertyStats | null
```
- Exclude `null`/`undefined` before all calculations
- Return `null` if no non-null values exist
- Percentiles: sort ascending, use linear interpolation for P25/P75
- NOTE: only called with number property values — never called with ISO date strings

### `computeHistogram`
```ts
export function computeHistogram(values: number[]): HistogramBucket[]
```
- Sturges' rule: `buckets = Math.ceil(Math.log2(n) + 1)`, clamped to `[3, 20]`
- `from` is inclusive; `to` is exclusive except on the last bucket (inclusive)
- **min === max guard:** when all values identical, produce 3 buckets each with width 0 — all values fall in the first bucket; never divide by zero

## Tests

### Unit — `src/test/computeStats.test.ts`
- `[1,2,3,4,5]` → `{ min:1, max:5, mean:3, median:3, p25:2, p75:4 }`
- Even-length array → correct median (average of two middle values)
- `[null, 5, null, 10]` → calculated only over `[5, 10]`
- Single element `[42]` → all stats equal 42
- Empty array `[]` → returns `null`
- All-null array → returns `null`

### Unit — `src/test/computeHistogram.test.ts`
- `[1,2,3,4,5]` (n=5) → `ceil(log2(5)+1) = 4` buckets
- Every value falls into exactly one bucket
- Buckets span `[min, max]` range
- Empty input → returns `[]`
- Single value → 3 buckets (minimum), value in first bucket
- `[5,5,5,5]` (min===max) → 3 buckets, width 0, all values in first bucket, no error

### Manual verification
- `npm run test` → all new tests pass with zero failures

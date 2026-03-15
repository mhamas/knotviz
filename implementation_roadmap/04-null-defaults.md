# Task 04: Property Type Detection and Null Defaults

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** M
**Prerequisites:** Task 03

## Goal

Two pure library functions — `detectPropertyTypes` and `applyNullDefaults` — handle property type inference and missing-value normalisation. Both are fully unit-tested. After this task, every node in the pipeline has complete, typed property values.

## Deliverables

### Files to create
- `src/lib/detectPropertyTypes.ts`
- `src/lib/applyNullDefaults.ts`
- `src/test/detectPropertyTypes.test.ts`
- `src/test/applyNullDefaults.test.ts`

## Implementation Notes

### `detectPropertyTypes`

Detection rules (applied in order, per property key):
1. All non-null values are JS booleans → `'boolean'`
2. All non-null values are JS numbers → `'number'`
3. 100% of non-null values match ISO 8601 regex → `'date'`
4. Otherwise → `'string'`

**ISO 8601 regex:**
```ts
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/
```

Edge case: if all values for a key are null/undefined → default to `'number'`.

### `applyNullDefaults`

Type defaults: `number → 0`, `string → ""`, `boolean → false`, `date → "1970-01-01"`

Returns `NullDefaultResult`:
```ts
{ data: GraphData, replacementCount: number, defaultedByNode: Map<string, string[]> }
```

`defaultedByNode` maps `nodeId → [propertyKey, ...]` for every key that was replaced.
If `replacementCount === 0`, `defaultedByNode` is an empty Map.

## Tests

### Unit — `src/test/detectPropertyTypes.test.ts`
- All boolean values → `'boolean'`
- All number values → `'number'`
- 100% valid ISO dates (e.g. `"2021-03-15"`) → `'date'`
- Any non-ISO string present → `'string'`
- Mixed numbers and strings → `'string'`
- All null/undefined → `'number'` (safe default)
- Datetime format `"2021-03-15T10:30:00Z"` → `'date'`
- `"2021"` alone → `'string'` (not a full date)

### Unit — `src/test/applyNullDefaults.test.ts`
- No missing values → `replacementCount === 0`, `defaultedByNode` is empty Map
- Missing number property on one node → replaced with `0`, count === 1
- Missing string property → replaced with `""`
- Missing boolean property → replaced with `false`
- Missing date property → replaced with `"1970-01-01"`
- Multiple nodes missing multiple keys → correct total count, correct `defaultedByNode` entries
- Node that has all keys present → not in `defaultedByNode`

### Manual verification
- `npm run test` → all new tests pass

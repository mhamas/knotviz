# Task 03: JSON Parsing and Graph Validation

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** M
**Prerequisites:** Task 02

## Goal

Two pure library functions — `parseJSON` and `validateGraph` — handle the first two stages of the data pipeline. Both are fully unit-tested and throw exact error messages that the rest of the app can depend on.

## Deliverables

### Files to create
- `src/lib/graphSchema.json` — JSON Schema for the graph format (version, nodes, edges)
- `src/lib/parseJSON.ts` — wraps `JSON.parse`, throws `"Invalid JSON file"` on failure
- `src/lib/validateGraph.ts` — validates shape and version; skips bad nodes/edges with `console.warn`
- `src/test/validateGraph.test.ts` — full unit test suite

## Implementation Notes

### `parseJSON`
```ts
export function parseJSON(text: string): unknown {
  try { return JSON.parse(text) }
  catch { throw new Error('Invalid JSON file') }
}
```

### `validateGraph` — exact thrown messages (tests assert on these strings)
| Condition | Thrown message |
|---|---|
| Missing or wrong `version` | `"Unsupported schema version"` |
| `nodes` or `edges` missing / not array | `"File must contain nodes and edges arrays"` |
| Zero nodes after filtering invalid | `"Graph has no nodes to display"` |

Non-fatal skips (console.warn, do not throw):
- Node missing `id` → skip node
- Edge referencing unknown node id → skip edge
- Property value of wrong type → treat as null (handled downstream)

## Tests

### Unit — `src/test/validateGraph.test.ts`
- Valid full input → returns typed `GraphData`
- Missing `version` → throws `"Unsupported schema version"`
- `version: "2"` → throws `"Unsupported schema version"`
- Missing `nodes` → throws `"File must contain nodes and edges arrays"`
- Missing `edges` → throws `"File must contain nodes and edges arrays"`
- `nodes` is not an array → throws `"File must contain nodes and edges arrays"`
- All nodes missing `id` → throws `"Graph has no nodes to display"`
- One node missing `id` → node skipped, `console.warn` called, valid result returned
- Edge referencing unknown node → edge skipped, `console.warn` called
- Node with `properties: { age: 34, active: true, name: "Alice" }` → accepted
- Empty `nodes: []` → throws `"Graph has no nodes to display"`

### Manual verification
- Run `npm run test` → all `validateGraph.test.ts` tests pass

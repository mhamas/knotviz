# Task 05: Build Graphology Graph

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** M
**Prerequisites:** Task 04

## Goal

`buildGraph` converts the normalised `NullDefaultResult` into a Graphology `MultiGraph` instance with correct node attributes, position logic, and `_defaultedProperties` populated. The full pipeline (`parseJSON → validateGraph → applyNullDefaults → buildGraph`) can now run end-to-end.

## Deliverables

### Files to create
- `src/lib/buildGraph.ts`
- `src/test/buildGraph.test.ts`
- `e2e/fixtures/sample-graph.json`
- `e2e/fixtures/partial-positions-graph.json`

## Implementation Notes

### Position logic
| Condition | `positionMode` | Behaviour |
|---|---|---|
| All nodes have `x` + `y` | `'all'` | Use as-is |
| Some nodes have `x` + `y` | `'partial'` | Ignore all, randomise all |
| No nodes have `x` + `y` | `'none'` | Randomise all |

Random positions: `graphology-layout-random` with `{ scale: 1, center: 0 }` — unit square `[-0.5, 0.5] × [-0.5, 0.5]`.

### Node attributes set on every node
```ts
{
  color: '#94a3b8',
  size: 5,
  label: node.label ?? node.id,
  _defaultedProperties: nullDefaultResult.defaultedByNode.get(node.id) ?? [],
}
```

### Edge attributes
```ts
{ color: '#94a3b8', size: 1 }
```

Edge to unknown node: skip + `console.warn`.

### Fixture files

**`e2e/fixtures/sample-graph.json`** — 5 nodes (Alice, Bob, Carol, Dave, Eve) with all 4 property types: `age` (number), `score` (number), `joined` (date), `active` (boolean), `status` (string). 6 edges forming a cycle plus one cross-edge.

**`e2e/fixtures/partial-positions-graph.json`** — 5 nodes where nodes 1 and 2 have `x`/`y`, nodes 3–5 do not. Used to verify partial-position warning behaviour.

## Tests

### Unit — `src/test/buildGraph.test.ts`
- All nodes have x+y → `positionMode === 'all'`, x/y attributes match input exactly
- Some nodes have x+y → `positionMode === 'partial'`, all positions are random (not input values)
- No nodes have x+y → `positionMode === 'none'`, all positions are random
- Returned graph has correct node count and edge count
- Edge to unknown node → skipped, `console.warn` called
- Node `label` stored as Graphology attribute
- Node `properties` stored as Graphology attributes
- Node with defaulted properties → `_defaultedProperties` contains correct keys
- Node with no defaulted properties → `_defaultedProperties` is `[]`

### Manual verification
- `npm run test` → all `buildGraph.test.ts` tests pass
- Inspect fixture files are valid JSON parseable without error

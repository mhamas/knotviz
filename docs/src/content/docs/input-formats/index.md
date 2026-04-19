---
title: Input formats
description: Five formats, one internal model. Choose the one that matches your data source.
---

*Knotviz reads JSON, CSV edge lists, CSV nodes+edges pairs, GraphML, and GEXF. Same internal model underneath; pick whatever is easiest to produce.*

## Which format

| Your data source | Use |
|---|---|
| Already producing JSON (most tools) | [JSON](/docs/input-formats/json) |
| List of edges in a spreadsheet | [CSV edge list](/docs/input-formats/csv-edge-list) |
| Nodes with rich properties + separate edges | [CSV nodes+edges pair](/docs/input-formats/csv-pair) |
| Gephi / NetworkX / yEd export | [GraphML](/docs/input-formats/graphml) |
| Gephi native export | [GEXF](/docs/input-formats/gexf) |

## Shared conventions

These rules apply across every format.

### Property types

`number` · `string` · `boolean` · `date` (ISO 8601 `YYYY-MM-DD` or full timestamp) · `string[]` (multi-valued).

### String arrays are pipe-delimited

```
tags = "engineer|founder|alumnus"
```

Literal `|` inside a value escapes as `\|`; literal `\` escapes as `\\`. Applies to CSV / GraphML / GEXF since none have a native array type.

### Missing values backfill on load

| Type | Default |
|---|---|
| `number` | `0` |
| `string` | `""` |
| `boolean` | `false` |
| `string[]` | `[]` |
| `date` | `"1970-01-01"` |

A modal reports the replacement count before loading. Cancel if the count looks wrong.

### Type inference

Knotviz infers column types from sample values unless declared explicitly. Two gotchas:

- `string[]` is **never** inferred. Declare it with a `:string[]` header suffix or it'll come through as a plain string.
- Leading-zero strings (zip codes, phone numbers) are kept as strings to avoid corrupting ids. Use `:number` to force numeric.

### Positions

| Shape | Behaviour |
|---|---|
| All nodes have `x`/`y` | Positions preserved as-is |
| No nodes have them | Randomised, force sim from scratch |
| Some have them | All randomised, warning banner shown |

### Node property descriptions

Optional `nodePropertiesMetadata` (JSON only) maps property keys to `{ description }`. Descriptions appear as `?` popovers in filter panels and the node tooltip.


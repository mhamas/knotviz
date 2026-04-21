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

### Type inference vs. declaration

Each format handles property types differently. Same five `PropertyType`s land in the UI in every case.

| Format | Types are… | Notes |
|---|---|---|
| JSON | **inferred** from native values | Booleans, numbers, arrays are native; ISO-8601 strings become `date`. No declaration needed. |
| CSV pair / TSV | **declared** via `:type` suffix **or inferred** from sample values | `string[]` is auto-detected if every non-empty cell contains `\|`; use `:string` as an escape hatch. |
| CSV edge list | n/a | No custom properties. |
| GraphML | **declared** via `attr.type` | `int/long/float/double → number`. Strings matching ISO 8601 are re-classified as `date` (GraphML has no native date type). |
| GEXF | **declared** via `<attribute type>` | `integer/long/float/double → number`; `liststring → string[]`. ISO-8601 strings re-classified as `date`. |

Inference rules applied in order: all booleans → `boolean`, all numbers → `number`, all ISO dates → `date`, all arrays (or pipe-per-cell in CSV) → `string[]`, otherwise `string`.

Gotchas:

- Leading-zero strings (zip codes, phone numbers) are kept as strings to avoid corrupting ids. Use `:number` to force numeric.
- Columns inferred from sample values look only at non-empty cells; an all-empty column defaults to `number`.

### Positions

| Shape | Behaviour |
|---|---|
| All nodes have `x`/`y` | Positions preserved as-is |
| No nodes have them | Randomised, force sim from scratch |
| Some have them | All randomised, warning banner shown |

### Node property descriptions

Optional `nodePropertiesMetadata` (JSON only) maps property keys to `{ description }`. Descriptions appear as `?` popovers in filter panels and the node tooltip.

**This is description-only.** It does not declare types — Knotviz still infers them from the values. A `nodePropertiesMetadata` entry with no matching property in any node is ignored.


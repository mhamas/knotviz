---
title: Input formats
description: Five formats, one internal model. Choose the one that matches your data source.
---

*Knotviz reads JSON, CSV edge lists, CSV nodes + edges pairs, GraphML, and GEXF. Same internal model underneath; pick whatever is easiest to produce.*

## Pick a format

Match the shape of the data you already have, not the format you'd like to generate.

| Format | When to use |
|---|---|
| [CSV edge list](/docs/input-formats/csv-edge-list) | A list of connections in a spreadsheet, no per-node data. One row per edge; nodes auto-derived from `source`/`target`. |
| [CSV nodes + edges pair](/docs/input-formats/csv-pair) | Nodes with properties (age, category, tags, …) plus connections. Two files — one for nodes, one for edges. |
| [JSON](/docs/input-formats/json) | You're generating the file yourself and want full fidelity. Knotviz's own schema — no tool exports it natively, but the page has drop-in snippets for NetworkX, Neo4j, pandas, and plain Python. |
| [GraphML](/docs/input-formats/graphml) | You have a `.graphml` file from Gephi, yEd, Cytoscape, or `nx.write_graphml`. Most portable XML graph format. |
| [GEXF](/docs/input-formats/gexf) | You have a `.gexf` file (typically from Gephi or `nx.write_gexf`) and want to preserve positions. Native `<viz:position>` round-trips layouts end-to-end. |

Still unsure? If you're producing the file yourself from scratch, use **JSON**. It has zero ambiguity, supports every property type natively, and rendering features map one-to-one.

## Shared conventions

These rules apply across every format. Each format page has the details; this is the common core.

### Property types

Five types total — the same set across every format.

| Type | What it holds | Example |
|---|---|---|
| `number` | Integers or floats. | `34`, `-3.14`, `1.5e3` |
| `string` | Any text. | `"Alice"`, `"engineering"` |
| `boolean` | `true` / `false`. | `true` |
| `date` | ISO 8601 `YYYY-MM-DD` or a full timestamp. | `"2021-03-15"`, `"2021-03-15T12:00:00Z"` |
| `string[]` | Multi-valued strings. | `["engineer", "founder"]` (JSON), `engineer\|founder` (CSV/XML) |

### Type inference vs. declaration

Each format picks types differently. Same five types land in the UI either way.

| Format | Types are… | Detail |
|---|---|---|
| **JSON** | Inferred from native values | Booleans, numbers, arrays are native; ISO-8601 strings become `date`. No declaration needed. |
| **CSV pair / TSV** | Declared via `:type` suffix **or** inferred | `string[]` is auto-detected when every non-empty cell contains a pipe. `:string` overrides. |
| **CSV edge list** | — | No custom properties (only `source`, `target`, `weight`, `label`). |
| **GraphML** | Declared via `attr.type` | `int/long/float/double → number`. `string` columns whose values are all ISO-8601 get re-classified as `date`. |
| **GEXF** | Declared via `<attribute type>` | Same as GraphML plus `liststring → string[]`. ISO-8601 strings also re-classified. |

Inference order (JSON + CSV pair): all booleans → `boolean`; else all numbers → `number`; else all ISO dates → `date`; else all arrays (or pipe-per-cell in CSV) → `string[]`; otherwise `string`.

**Gotchas**:

- **Leading-zero strings during inference** (`0012`, phone numbers) stay as `string` — the numeric-type test won't cross the leading-zero guard. This only applies to inference; if you explicitly declare the column as `:number` in CSV pair, the parser coerces and `"0012"` becomes `12`.
- **All-empty columns** default to `number`. The column is preserved and still appears in filters (back-fills with `0`).
- **Mixed values in one column** (e.g. half numbers, half strings) fall back to `string`.

### String arrays are pipe-delimited

For the four formats without a native array type (CSV, TSV, GraphML, GEXF):

```
tags = "engineer|founder|alumnus"
```

A literal `|` inside a value escapes as `\|`; a literal `\` escapes as `\\`. JSON uses native arrays — no encoding needed.

### Positions

| Shape | Behaviour |
|---|---|
| All nodes have `x` and `y` | Positions preserved; no force sim needed on load |
| No nodes have them | Randomised; force sim runs from scratch |
| Some have them | All randomised (partial positions are discarded); a warning banner shows |

### Missing-value defaults

When a property is declared but some nodes don't carry a value for it, Knotviz backfills with the type default so filters and gradients still work:

| Type | Default |
|---|---|
| `number` | `0` |
| `string` | `""` |
| `boolean` | `false` |
| `string[]` | `[]` |
| `date` | `"1970-01-01"` |

A modal before the graph loads reports the replacement count — cancel and fix the source if that count looks wrong.

### Data-quality warnings on load

If a declared column has cells that don't match the type (e.g. `"thirty-four"` under `age:number`, or `"March 15 2021"` under `joined:date`), Knotviz **drops the offending cell** and records a warning. The pre-load modal lists the per-column failure counts with an example value so you can fix the source. Format affected: CSV pair.

JSON-only: `nodePropertiesMetadata` attaches a human-readable description to each property key, surfaced as `?` popovers in filter panels and the node tooltip. See [JSON → `nodePropertiesMetadata` is description-only](/docs/input-formats/json#nodepropertiesmetadata-is-description-only).

---
title: Input formats
description: Five formats, one internal model. Choose the one that matches your data source.
---

*Knotviz reads JSON, CSV edge lists, CSV nodes + edges pairs, GraphML, and GEXF. Same internal model underneath; pick whatever is easiest to produce.*

## Pick a format

Start with the left column — match the shape of the data you already have, not a format you'd like to generate.

| You have… | Use | Because |
|---|---|---|
| A list of connections in a spreadsheet, and no per-node data | [CSV edge list](/docs/input-formats/csv-edge-list) | Simplest format. One row per edge; nodes auto-derived from `source`/`target`. |
| Nodes with properties (age, category, tags, …) plus connections | [CSV nodes + edges pair](/docs/input-formats/csv-pair) | Two files. Typed columns like `age:number`, `tags:string[]`. |
| A JSON export from NetworkX, Neo4j, d3, a custom pipeline | [JSON](/docs/input-formats/json) | Knotviz's native format. Full fidelity — round-trips every feature. |
| A Gephi / yEd / Cytoscape / NetworkX **XML** export | [GraphML](/docs/input-formats/graphml) | Most portable XML graph format. |
| A Gephi export **with positions** you want preserved | [GEXF](/docs/input-formats/gexf) | Native `<viz:position>` round-trips layouts end-to-end. |

Still unsure? If you're going to produce the file yourself from scratch, use **JSON**. It has zero ambiguity, supports every property type natively, and rendering features map one-to-one.

## Shared conventions

These rules apply across every format. Each format page has the details; this is the common core.

### Property types

Five types total. Four are self-explanatory; `string[]` is the multi-valued one.

`number` · `string` · `boolean` · `date` (ISO 8601 `YYYY-MM-DD` or full timestamp) · `string[]`

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

- Leading-zero strings (`0012`, phone numbers) stay as `string`. Use `:number` to force numeric.
- An all-empty column defaults to `number`. The column is preserved and still appears in filters.
- Mixed values in one column (e.g. half numbers, half strings) fall back to `string`.

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

### Node property descriptions

Optional `nodePropertiesMetadata` (**JSON only**) maps property keys to `{ description }`. Descriptions surface as `?` popovers in filter panels and the node tooltip.

**This is description-only.** It does not declare types — Knotviz still infers them from the values. Entries in `nodePropertiesMetadata` with no matching property in any node are ignored silently.

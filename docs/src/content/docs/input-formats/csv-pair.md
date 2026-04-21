---
title: CSV nodes + edges pair
description: Two files — one for nodes with rich properties, one for edges. Dropped separately into labelled slots.
---

*Two files: `nodes.csv` with per-node properties, `edges.csv` with the connections. Drop each into its labelled slot on the drop zone.*

## Example

```csv title="nodes.csv"
id,label,x,y,age:number,joined:date,active:boolean,tags:string[]
n1,Alice,10,20,34,2021-03-15,true,engineer|founder
n2,Bob,-5,8,28,2023-11-02,false,designer
n3,Carol,100,-30,45,2019-07-20,true,
```

```csv title="edges.csv"
source,target,weight,label
n1,n2,0.8,knows
n2,n3,1.2,follows
```

[Download nodes.csv](/samples/csv-pair/1k-nodes.csv) · [Download edges.csv](/samples/csv-pair/1k-edges.csv) · [Try it in Knotviz ↗](/graph?example=csv-pair/1k)

TSV variants work identically — rename to `.tsv`.

## How to drop

Two ways. **Labelled slots** (recommended) — drop one file into `Nodes` and one into `Edges`; the graph loads as soon as both are filled, filenames irrelevant. **Multi-select** — drag both files at once; Knotviz pairs them by filename (must contain `nodes` / `edges` tokens).

## Nodes file columns

| Column | Required | Notes |
|---|---|---|
| `id` | yes | Unique string |
| `label` | no | Display text |
| `x`, `y` | no | See [positions](/docs/input-formats#positions) |
| Anything else | no | Per-node properties |

### Typed column headers

Declare a property's type with a `name:type` suffix — recognised types: `number`, `string`, `boolean`, `date`, `string[]`.

```
age:number
joined:date
tags:string[]
```

Columns without a suffix are inferred from sample values. `string[]` is auto-detected when *every* non-empty cell contains a pipe (`|`); if some cells are plain prose that happens to have a pipe, fall back to `:string` to force the literal interpretation.

The edges file takes the same shape as [CSV edge list](/docs/input-formats/csv-edge-list).

### The `label` column

`label` is dual-role: it drives the node's display label *and* is exposed as a filterable / colourable property. So a CSV with a real `label` column of domain data (e.g. taxonomy names) keeps it for filters and colour-encoding instead of having it silently consumed by the display layer.

`id`, `x`, and `y` stay structural-only.

## Gotchas

- Edge endpoints must match ids in the nodes file. Unknown ids are skipped with a console warning.
- Cells that don't match a declared `:type` (e.g. `"thirty-four"` under `age:number`) are dropped with a warning; a modal summarises the count before the graph loads.
- Declared-but-all-empty columns are preserved as `null` on every node (they back-fill with the type default later), so the column still appears in filters.
- Leading-zero ids like `0012` stay as strings (good for zip codes / phone numbers). Use `:number` to force numeric.


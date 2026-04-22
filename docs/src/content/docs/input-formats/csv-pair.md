---
title: CSV nodes + edges pair
description: Two files — one for nodes with rich properties, one for edges. Dropped separately into labelled slots.
---

*Two files: `nodes.csv` carries per-node properties, `edges.csv` carries the connections. This is the right format when your spreadsheet has columns like `age`, `category`, `tags` on each node.*

## Minimum viable example

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

TSV works identically — save with tab separators and rename to `.tsv`.

## How to drop

**Labelled slots** (recommended). The drop zone has two slots — `Nodes` and `Edges`. Drop one file into each; the graph loads the moment both slots are filled. Filenames don't matter.

**Multi-select**. Drag both files onto the drop zone at once. Knotviz pairs them by filename — one must contain `nodes`, the other `edges`.

## Nodes file — columns

| Column | Required | Notes |
|---|---|---|
| `id` | yes | Unique string. |
| `label` | no | Display text. Also exposed as a filterable property (see [the `label` column](#the-label-column) below). |
| `x`, `y` | no | Numeric positions. Preserved only if *all* nodes have them ([positions](/docs/input-formats#positions)). |
| Any other | no | Per-node property. Typed via `:type` suffix or inferred from sample values. |

### Typed column headers

Append `:type` to a column name to declare its type explicitly. Five recognised types:

```
age:number
joined:date
active:boolean
homepage:string
tags:string[]
```

**Inference** fills in untyped columns. For `string[]` specifically, Knotviz auto-detects the type when every non-empty cell in the column contains a pipe — so a column literally named `tags` with values `a|b`, `c|d`, `e|f` becomes `string[]` without a suffix. If some cells are prose that happens to contain a pipe (`"a | b"` as a sentence), use `:string` to force the literal interpretation.

Full inference rules and edge cases: [Shared conventions → Type inference](/docs/input-formats#type-inference-vs-declaration).

### The `label` column

`label` is dual-role: it drives the node's display label **and** is exposed as a filterable / colourable property. So if your data has a real `label` column (e.g. taxonomy names, category labels), you keep it for filters and colour-encoding rather than having the display layer silently absorb it.

`id`, `x`, and `y` stay structural-only — they never appear in the Filter or Analyze panels.

## Edges file — columns

Same shape as the [CSV edge list](/docs/input-formats/csv-edge-list) format. Unknown `source` / `target` ids (ones not in the nodes file) skip the edge with a console warning.

## Data-quality warnings

If a typed column has cells that don't match the declared type, Knotviz **drops the offending cell** and counts it. Before the graph loads, a modal summarises per-column failures so you can fix the source file:

> `age` — 300 nodes failed (e.g. `"thirty-four"`)
> `joined` — 12 nodes failed (e.g. `"March 15 2021"`)

Cancel if the numbers look wrong, fix the source, re-drop. Load anyway if you're comfortable treating the failed cells as missing — they'll back-fill with the type default.

## Gotchas

- **Edge endpoints must match ids in the nodes file.** Unknown ids are skipped with a console warning.
- **Pipe cells in non-array columns.** A column with pipes only in *some* cells infers as `string` (pipes treated literally). A column with pipes in *every* non-empty cell infers as `string[]`. When in doubt, declare with `:string` or `:string[]`.
- **Leading-zero strings stay strings.** `0012` as an id or property value is kept as `"0012"` (zip codes, phone numbers). Force numeric with `:number` if you want `12`.
- **Declared-but-empty columns survive.** A column whose every cell is empty is still registered — it defaults to `number` and back-fills with `0`. Example: `id,label,notes` with every `notes` cell blank will still produce a `notes` number filter in the UI. You'll see a pre-load modal reporting the replacement count.
- **A column called `label` isn't lost.** It shows up as both the display label *and* a filterable property.

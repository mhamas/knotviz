---
title: CSV edge list
description: Single CSV or TSV file, one edge per row. Nodes auto-derived.
---

*Simplest format. One edge per row; nodes are derived from the set of `source` / `target` ids. No per-node properties — use [CSV pair](/docs/input-formats/csv-pair) if you need those.*

## Minimum viable example

```csv title="edges.csv"
source,target,weight,label
alice,bob,0.8,knows
bob,carol,1.2,follows
alice,carol,0.5,knows
```

[Download example](/samples/csv-edge-list/1k.csv) · [Try it in Knotviz ↗](/graph?example=csv-edge-list/1k)

TSV works identically — save with tab separators and rename to `.tsv`.

## Columns

Headers are case-insensitive. Only the four columns below are read; any others are dropped silently.

| Column | Required | Notes |
|---|---|---|
| `source` | yes | Node id (any non-empty string). |
| `target` | yes | Node id. |
| `weight` | no | Parsed as a number. Non-numeric values are dropped with a warning; the edge still loads without a weight. |
| `label` | no | Read and preserved on export, but **not currently rendered in the canvas**. Safe to include; harmless if you omit. |

## Coming from another tool

### Pandas

```python title="pandas_to_edges_csv.py"
# edges_df has whatever columns your pipeline produced; rename to Knotviz's
# required column names, keep weight if you have it, drop everything else.
(edges_df
    .rename(columns={"src": "source", "dst": "target", "w": "weight"})
    [["source", "target", "weight"]]
    .to_csv("edges.csv", index=False))
```

### PostgreSQL

```sh title="pg_to_edges_csv.sh"
psql -d mydb -c "\copy (
  SELECT source_id AS source, target_id AS target, weight
  FROM edges
) TO 'edges.csv' CSV HEADER"
```

### NetworkX

```python title="nx_to_edges_csv.py"
import csv, networkx as nx
with open("edges.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["source", "target", "weight"])
    for u, v, data in G.edges(data=True):
        w.writerow([u, v, data.get("weight", 1)])
```

### Git commit co-author network

Who's collaborated with whom on the same files, counted.

```sh title="git_coauthors.sh"
git log --name-only --pretty=format:'=== %an' \
  | awk '/^=== /{a=substr($0,5); next} NF{print a"\t"$0}' \
  | sort -u -k2 \
  | awk '{by[$2]=by[$2]"\t"$1} END{for (f in by) print by[f]}' \
  | awk -F'\t' '{for(i=2;i<=NF;i++) for(j=i+1;j<=NF;j++) if ($i<$j) print $i","$j; else print $j","$i}' \
  | sort | uniq -c \
  | awk '{print $2","$1}' \
  | (echo "source,target,weight"; cat) > authors.csv
```

### Excel / Google Sheets

Save As → CSV (UTF-8). Headers must include `source` and `target`. Optional `weight` and `label` work as-is.

## Gotchas

- **No per-node properties.** The edge list can't attach `age`, `community`, tags, etc. to nodes. If you need that, switch to [CSV pair](/docs/input-formats/csv-pair).
- **Typed headers don't apply here.** Writing `weight:number` or `age:number` won't parse the way it does in CSV pair — the column name is checked literally, and anything that isn't one of `source`/`target`/`weight`/`label` is ignored.
- **Nodes are auto-created** from every id appearing in `source` or `target`. You can't "pre-declare" a node — if you want isolated nodes (with no edges), use CSV pair or JSON.
- Quoted cells follow RFC 4180 — commas and newlines inside `"..."` are preserved.
- UTF-8 only. A BOM (Excel's default when exporting UTF-8) is handled automatically.

---
title: CSV edge list
description: Single CSV or TSV file, one edge per row. Nodes auto-derived.
---

*Simplest format. One edge per row, nodes derived from `source`/`target` ids.*

## Example

```csv title="edges.csv"
source,target,weight,label
alice,bob,0.8,knows
bob,carol,1.2,follows
alice,carol,0.5,knows
```

[Download example](/samples/csv-edge-list/1k.csv) · [Try it in Knotviz ↗](/graph?example=csv-edge-list/1k)

Same file with tab delimiters works too — rename to `.tsv`.

## Columns

| Column | Required | Notes |
|---|---|---|
| `source` | yes | Node id |
| `target` | yes | Node id |
| `weight` | no | Number, used for edge-filtering and sizing |
| `label` | no | Display text |

Headers are case-insensitive. Extra columns are ignored.

## Coming from another tool

### PostgreSQL

```sh title="export_edges.sh"
psql -d mydb -c "\copy (
  SELECT source_id AS source, target_id AS target, weight
  FROM edges
) TO 'edges.csv' CSV HEADER"
```

### Pandas

```python title="pandas_to_csv.py"
# rename columns to match, drop the rest
df[["src", "dst", "w"]].rename(
    columns={"src": "source", "dst": "target", "w": "weight"}
).to_csv("edges.csv", index=False)
```

### Git commit author network

Map who collaborates with whom on the same files. Edges are co-authorship weight.

```sh title="git_coauthors.sh"
# Pairs of authors that touched the same file, counted
git log --name-only --pretty=format:'=== %an' \
  | awk '/^=== /{a=substr($0,5); next} NF{print a"\t"$0}' \
  | sort -u -k2 \
  | awk '{by[$2]=by[$2]"\t"$1} END{for (f in by) print by[f]}' \
  | awk -F'\t' '{for(i=2;i<=NF;i++) for(j=i+1;j<=NF;j++) if ($i<$j) print $i","$j; else print $j","$i}' \
  | sort | uniq -c \
  | awk '{print $2","$1}' \
  | (echo "source,target,weight:number"; cat) > authors.csv
```

### NetworkX

```python title="nx_to_csv.py"
import csv, networkx as nx
with open("edges.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["source", "target", "weight"])
    for u, v, data in G.edges(data=True):
        w.writerow([u, v, data.get("weight", 1)])
```

### Excel / Google Sheets

Save As → CSV (UTF-8). Column headers must include `source` and `target`. Optional `weight` and `label` can be added. See [shared conventions](/docs/input-formats) for typed columns like `weight:number`.

## Gotchas

- No per-node properties in this format. If you need `age`, `community`, etc., use [CSV pair](/docs/input-formats/csv-pair) instead.
- Quoted cells work per RFC 4180 — commas and newlines inside `"..."` are preserved.
- BOM (Excel default) is handled. UTF-8 only.


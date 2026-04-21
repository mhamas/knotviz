---
title: JSON
description: Native Knotviz format. Versioned schema. Full fidelity for every feature.
---

*The canonical format. Every Knotviz feature round-trips through it.*

## Example

```json title="graph.json"
{
  "version": "1",
  "nodes": [
    { "id": "n1", "label": "Alice", "x": 10, "y": 20,
      "properties": { "age": 34, "active": true, "joined": "2021-03-15", "tags": ["engineer", "founder"] } },
    { "id": "n2", "label": "Bob" }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "label": "knows", "weight": 0.8 }
  ],
  "nodePropertiesMetadata": {
    "age": { "description": "Age in years" }
  }
}
```

[Download example](/samples/json/1k.json) · [Try it in Knotviz ↗](/graph?example=json/1k)

## Shape

| Field | Required | Notes |
|---|---|---|
| `version` | yes | Must be `"1"` |
| `nodes[]` | yes | See below |
| `edges[]` | yes | See below |
| `nodePropertiesMetadata` | no | Map of `propertyKey → { description }` |

### Node

| Field | Required | Notes |
|---|---|---|
| `id` | yes | String, unique |
| `label` | no | Display text |
| `x`, `y` | no | Preserved if *all* nodes have them (see [positions](/docs/input-formats#positions)) |
| `properties` | no | Object of `key → number \| string \| boolean \| string[]` |

### Edge

| Field | Required | Notes |
|---|---|---|
| `source`, `target` | yes | Must match existing node `id`s |
| `label` | no | Display text |
| `weight` | no | Used for edge-filtering and size |

## Property types

JSON values pass through as-is; Knotviz **infers** each property's type from the values it sees. There's no type declaration in the schema, and no `:type` suffix like CSV — just use the native JS value.

| Value shape | Inferred type |
|---|---|
| JS `number` (int or float) | `number` |
| JS `boolean` | `boolean` |
| JS array of strings | `string[]` |
| String matching ISO 8601 (`2021-03-15`, `2021-03-15T12:00:00Z`, …) | `date` |
| Any other string | `string` |
| All values null/missing | `number` (default) |

Mixed-type columns (e.g. half numbers, half strings) fall back to `string`. See [shared conventions](/docs/input-formats#type-inference-vs-declaration) for the full algorithm.

### `nodePropertiesMetadata` is description-only

The optional `nodePropertiesMetadata` field maps property keys to `{ description }`. Descriptions surface as `?` popovers in filter panels and the node tooltip. **It does not declare types** — Knotviz still infers them from the node values regardless of what's in metadata.

## Coming from another tool

### NetworkX

`node_link_data` is almost right — it calls edges `links`, and it omits `version`.

```python title="networkx_to_knotviz.py"
import json, networkx as nx

data = nx.node_link_data(G)
data["version"] = "1"
data["edges"] = data.pop("links")  # NetworkX convention

# Optional: move node attributes into properties for cleaner viz
for node in data["nodes"]:
    attrs = {k: v for k, v in node.items() if k not in {"id", "label", "x", "y"}}
    if attrs:
        node["properties"] = attrs
        for k in list(attrs):
            node.pop(k, None)

json.dump(data, open("graph.json", "w"))
```

### Pandas DataFrames

Two DataFrames (`nodes_df` with an `id` column, `edges_df` with `source` and `target`).

```python title="pandas_to_knotviz.py"
import json, pandas as pd

nodes = [
    { "id": str(row["id"]),
      "label": str(row.get("name", row["id"])),
      "properties": {k: v for k, v in row.items() if k not in {"id", "name"}} }
    for _, row in nodes_df.iterrows()
]
edges = [
    { "source": str(row["source"]), "target": str(row["target"]),
      "weight": float(row["weight"]) if "weight" in row else 1.0 }
    for _, row in edges_df.iterrows()
]
json.dump({ "version": "1", "nodes": nodes, "edges": edges }, open("graph.json", "w"))
```

### Neo4j (via APOC JSON export)

```sh title="neo4j_export.sh"
# Call apoc.export.json.all('out.json') in a browser/bolt session first,
# then reshape with jq:
jq '{ version: "1",
      nodes: [.nodes[] | { id: .id, label: .properties.name, properties: .properties }],
      edges: [.relationships[] | { source: .start, target: .end, label: .type }] }' \
  out.json > graph.json
```

### Raw Python (no graph lib)

Useful when your data is a list of tuples or dicts — no NetworkX needed.

```python title="raw_python.py"
import json

# Say you have:
# people = [{"id": "alice", "email": "alice@co"}, ...]
# connections = [("alice", "bob"), ...]

nodes = [{ "id": p["id"], "label": p["id"], "properties": {k: v for k, v in p.items() if k != "id"} }
         for p in people]
edges = [{ "source": s, "target": t } for s, t in connections]

json.dump({ "version": "1", "nodes": nodes, "edges": edges }, open("graph.json", "w"))
```

## Gotchas

- `version` must be the string `"1"`, not the number `1`.
- `edges` not `links` — if you're porting from NetworkX's `node_link_data`, rename.
- Edge endpoints must reference node `id`s that exist; unknown ids are skipped with a console warning.
- For files over 200 MB Knotviz streams instead of parsing the whole tree. No action needed from you.


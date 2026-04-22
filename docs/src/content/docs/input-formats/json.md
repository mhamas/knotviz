---
title: JSON
description: Native Knotviz format. Versioned schema. Full fidelity for every feature.
---

*The canonical format. Every Knotviz feature round-trips through it; everything else is a translation layer.*

## Minimum viable example

```json title="graph.json"
{
  "version": "1",
  "nodes": [
    { "id": "n1", "label": "Alice", "properties": { "age": 34, "active": true, "joined": "2021-03-15", "tags": ["engineer", "founder"] } },
    { "id": "n2", "label": "Bob" }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "label": "knows", "weight": 0.8 }
  ]
}
```

[Download example](/samples/json/1k.json) · [Try it in Knotviz ↗](/graph?example=json/1k)

## Shape

| Field | Required | Notes |
|---|---|---|
| `version` | yes | The string `"1"`. |
| `nodes[]` | yes | See below. |
| `edges[]` | yes | See below. |
| `nodePropertiesMetadata` | no | `{ [key]: { description } }` — description-only; not a type declaration (see below). |

### Node

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique string. Numeric ids are **silently skipped** — a node with `"id": 1` doesn't error, it just disappears from the graph with a `console.warn`. Stringify to `"1"`. |
| `label` | no | Display text (shown on hover and in the tooltip header). |
| `x`, `y` | no | Preserved only if *all* nodes have them ([positions](/docs/input-formats#positions)). |
| `properties` | no | `{ [key]: number \| string \| boolean \| string[] \| null }` |

### Edge

| Field | Required | Notes |
|---|---|---|
| `source`, `target` | yes | Must reference existing node `id` values. Unknown ids skip the edge with a console warning. |
| `label` | no | Read and preserved on export, but **not currently rendered in the canvas**. |
| `weight` | no | Number. Drives edge filtering and edge-size rendering. |

Edge-level `properties` are NOT read. If your domain needs edge metadata, move it onto the source or target node instead — edge-level data has no visual affordance in the current UI.

## Property types

JSON values pass through as-is; Knotviz **infers** each property's type from the values it sees. No `:type` suffix, no `attr.type` — just native JS types.

| Value shape | Inferred type |
|---|---|
| JS `number` (int, float, negative, scientific notation) | `number` |
| JS `boolean` | `boolean` |
| JS array of strings | `string[]` |
| String matching ISO 8601 (`2021-03-15`, `2021-03-15T12:00:00Z`, `2021-03-15T12:00:00.000+02:00`) | `date` |
| Any other string | `string` |
| All values null/missing | `number` (default) |

Mixed-type columns (e.g. half numbers, half strings) fall back to `string`. Full inference order and leading-zero guard: [Shared conventions → Type inference](/docs/input-formats#type-inference-vs-declaration).

### `nodePropertiesMetadata` is description-only

```json
"nodePropertiesMetadata": {
  "age": { "description": "Years since signup" },
  "community": { "description": "Cluster label from the clustering pipeline" }
}
```

Descriptions surface as `?` popovers in filter panels and the node tooltip. **They do not declare types** — Knotviz still infers from the values regardless. Entries without a matching property on any node are ignored.

## Coming from another tool

### NetworkX

`node_link_data` is 90% right — it calls edges `links`, and omits `version`.

```python title="networkx_to_knotviz.py"
import json, networkx as nx

data = nx.node_link_data(G)
data["version"] = "1"
data["edges"] = data.pop("links")

# Optional: move node attributes into properties for cleaner type inference
for node in data["nodes"]:
    attrs = {k: v for k, v in node.items() if k not in {"id", "label", "x", "y"}}
    if attrs:
        node["properties"] = attrs
        for k in list(attrs):
            node.pop(k, None)

json.dump(data, open("graph.json", "w"))
```

### Pandas DataFrames

Two DataFrames: `nodes_df` with an `id` column, `edges_df` with `source` and `target`.

```python title="pandas_to_knotviz.py"
import json

nodes = [
    { "id": str(row["id"]),
      "label": str(row.get("name", row["id"])),
      "properties": {k: v for k, v in row.items() if k not in {"id", "name"}} }
    for _, row in nodes_df.iterrows()
]
edges = [
    { "source": str(row["source"]), "target": str(row["target"]),
      **({"weight": float(row["weight"])} if "weight" in row else {}) }
    for _, row in edges_df.iterrows()
]
json.dump({ "version": "1", "nodes": nodes, "edges": edges }, open("graph.json", "w"))
```

### Neo4j (APOC JSON export)

Run `CALL apoc.export.json.all('out.json', {useTypes: true})` in Neo4j Browser or cypher-shell, then reshape with `jq`. Neo4j ids are numeric — Knotviz requires string ids, so the pipeline coerces them.

```sh title="neo4j_to_knotviz.sh"
jq '{ version: "1",
      nodes: [.nodes[] | { id: (.id | tostring), label: .properties.name, properties: .properties }],
      edges: [.relationships[] | { source: (.start | tostring), target: (.end | tostring), label: .type }] }' \
  out.json > graph.json
```

Edge properties (including weight) are dropped by this snippet — Knotviz edges carry only `label` (preserved on export; not rendered) and `weight` (used for edge filtering and size). Add `weight: .properties.weight` to the edge projection if you need it.

### Plain Python (no graph library)

Useful when your input is a list of dicts and a list of tuples.

```python title="raw_python.py"
import json

# people = [{"id": "alice", "email": "alice@co"}, ...]
# connections = [("alice", "bob"), ...]

nodes = [{ "id": p["id"], "label": p["id"], "properties": {k: v for k, v in p.items() if k != "id"} }
         for p in people]
edges = [{ "source": s, "target": t } for s, t in connections]

json.dump({ "version": "1", "nodes": nodes, "edges": edges }, open("graph.json", "w"))
```

## Gotchas

- **`version` is a string, not a number.** Use `"1"`, not `1`.
- **`edges`, not `links`.** Rename if you're porting from `node_link_data`.
- **Numeric ids are silently dropped.** `{ "id": 42 }` doesn't throw — the node is skipped with a `console.warn` and the graph loads without it. If a node count looks low, check devtools.
- **Unknown edge endpoints are skipped** too, also with a `console.warn`. Same story.
- **Edge properties beyond `label` and `weight` are dropped.** And even `label` isn't rendered in the canvas today — it only round-trips through export. Move edge metadata onto a source/target node property if you need it visible.
- **Silent failures land in the browser console.** Nothing in the UI flags them. If a load "worked" but the graph looks wrong, open devtools first.

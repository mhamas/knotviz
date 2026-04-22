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
| `version` | yes | The string `"1"` (not the number `1`). |
| `nodes[]` | yes | See below. |
| `edges[]` | yes | See below. |
| `nodePropertiesMetadata` | no | `{ [key]: { description } }` — description-only; not a type declaration (see below). |

### Node

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique string. Numeric ids must be stringified — `1` doesn't work, `"1"` does. |
| `label` | no | Display text (shown on hover and in the tooltip header). |
| `x`, `y` | no | Preserved only if *all* nodes have them ([positions](/docs/input-formats#positions)). |
| `properties` | no | `{ [key]: number \| string \| boolean \| string[] \| null }` |

### Edge

| Field | Required | Notes |
|---|---|---|
| `source`, `target` | yes | Must reference existing node `id` values. Unknown ids skip the edge with a console warning. |
| `label` | no | Display text. |
| `weight` | no | Number. Drives edge filtering and edge-size rendering. |

Edge-level `properties` are NOT read. If your domain needs edge metadata, encode it in `label` (short string) or preprocess into node attributes.

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

## Loading at scale

JSON under 200 MB uses `JSON.parse` end-to-end. Files ≥ 200 MB switch to a streaming parser automatically — no configuration, but the load takes longer because it's bounded by disk-read speed. See [limits](/docs/limits) for the hard ceiling (~5 M nodes, ~1 GB file).

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

Edge properties (including weight) are dropped by this snippet — Knotviz edges carry only `label` and `weight`. Add `weight: .properties.weight` to the edge projection if you need it.

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

- **`version` is a string, not a number.** `"1"` works; `1` fails validation.
- **`edges`, not `links`.** Rename if you're porting from `node_link_data`.
- **Numeric ids must be stringified.** `{ "id": 42 }` fails; `{ "id": "42" }` works.
- **Unknown edge endpoints are skipped** with a `console.warn` — check devtools if an edge count looks off.
- **Edge properties beyond `label` and `weight` are dropped.** No way to attach arbitrary data to edges today.

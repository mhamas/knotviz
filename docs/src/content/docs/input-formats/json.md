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
    { "source": "n1", "target": "n2", "weight": 0.8 }
  ]
}
```

[Download example](/samples/json/1k.json)

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
| `weight` | no | Number. Drives edge filtering and edge-size rendering. |

Edge-level `properties` are NOT read. Edges have no visual affordance in the UI beyond `weight` — move any per-edge metadata onto the source or target node instead.

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
      edges: [.relationships[] | { source: (.start | tostring), target: (.end | tostring) }] }' \
  out.json > graph.json
```

Edge properties are dropped by this snippet. Add `weight: .properties.weight` to the edge projection if your relationships carry one and you want to use edge filtering.

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

## Full JSON Schema

Draft-07. Canonical copy lives at [`/docs/schema.json`](/docs/schema.json) — fetch it in a validator, a code generator, or an LLM tool call. The schema is versioned alongside the parser; the hosted copy is always in sync with the production build.

```json title="graphSchema.json"
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Knotviz Graph",
  "description": "A graph data file for the Knotviz visualizer. Contains versioned node and edge definitions with optional properties for visualization and analysis.",
  "type": "object",
  "required": ["version", "nodes", "edges"],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "const": "1", "description": "Schema version. Must be \"1\"." },
    "nodes": {
      "type": "array",
      "description": "Array of node objects in the graph.",
      "items": {
        "type": "object",
        "required": ["id"],
        "additionalProperties": false,
        "properties": {
          "id":    { "type": "string", "description": "Unique identifier for the node." },
          "label": { "type": "string", "description": "Display name shown on the canvas. Falls back to id if omitted." },
          "x":     { "type": "number", "description": "Initial X position. If omitted, a random position is assigned." },
          "y":     { "type": "number", "description": "Initial Y position. If omitted, a random position is assigned." },
          "properties": {
            "type": "object",
            "description": "Arbitrary key-value pairs for the node. Values can be number, string, boolean, or array of strings. ISO 8601 date strings (e.g. \"2024-01-15\") are auto-detected as dates.",
            "additionalProperties": {
              "oneOf": [
                { "type": "number" },
                { "type": "string" },
                { "type": "boolean" },
                { "type": "array", "items": { "type": "string" } }
              ]
            }
          }
        }
      }
    },
    "nodePropertiesMetadata": {
      "type": "object",
      "description": "Optional metadata for node properties. Maps property keys to objects with a description field.",
      "additionalProperties": {
        "type": "object",
        "required": ["description"],
        "additionalProperties": false,
        "properties": {
          "description": { "type": "string", "description": "Human-readable description of this property." }
        }
      }
    },
    "edges": {
      "type": "array",
      "description": "Array of edge objects connecting nodes.",
      "items": {
        "type": "object",
        "required": ["source", "target"],
        "additionalProperties": false,
        "properties": {
          "source": { "type": "string", "description": "ID of the source node." },
          "target": { "type": "string", "description": "ID of the target node." },
          "label":  { "type": "string", "description": "Edge label or relationship type." },
          "weight": { "type": "number", "description": "Edge weight used by the ForceAtlas2 layout simulation." }
        }
      }
    }
  }
}
```

## Gotchas

- **`version` is a string, not a number.** Use `"1"`, not `1`.
- **`edges`, not `links`.** Rename if you're porting from `node_link_data`.
- **Numeric ids are silently dropped.** `{ "id": 42 }` doesn't throw — the node is skipped with a `console.warn` and the graph loads without it. If a node count looks low, check devtools.
- **Unknown edge endpoints are skipped** too, also with a `console.warn`. Same story.
- **Edge properties beyond `weight` are dropped.** Per-edge metadata has no rendering path today — move it onto a source or target node property if you need it visible.
- **Silent failures land in the browser console.** Nothing in the UI flags them. If a load "worked" but the graph looks wrong, open devtools first.

---
title: GraphML
description: W3C-ish XML standard. Round-trips Gephi, NetworkX, yEd exports.
---

*Standard GraphML with typed `<key>` declarations and `<data>` values. Best-supported format for interop — most graph tools export it natively.*

## Minimum viable example

```xml title="graph.graphml"
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="lbl" for="node" attr.name="label" attr.type="string"/>
  <key id="age" for="node" attr.name="age"   attr.type="int"/>
  <key id="w"   for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="lbl">Alice</data>
      <data key="age">34</data>
    </node>
    <node id="n2"><data key="lbl">Bob</data></node>
    <edge source="n1" target="n2"><data key="w">0.8</data></edge>
  </graph>
</graphml>
```

[Download example](/samples/graphml/1k.graphml) · [Try it in Knotviz ↗](/graph?example=graphml/1k)

## Supported attribute types

| `attr.type` | Maps to | Note |
|---|---|---|
| `int`, `long`, `float`, `double` | `number` | Range/precision not checked — all become JS numbers. |
| `boolean` | `boolean` | `"true"` / `"false"` (case-insensitive) and `"1"` / `"0"`. |
| `string` | `string` | Promoted to `date` if every value is ISO 8601 (see below). |

GraphML's schema has no `list` type that Knotviz reads — represent arrays as pipe-delimited strings inside an `attr.type="string"` column and Knotviz will NOT auto-detect them (unlike CSV pair). If you need real arrays, the safer path is GEXF's `liststring` or JSON.

### Dates in GraphML

GraphML has no native `date` type, so the convention is: declare the column as `attr.type="string"` and store ISO-8601 values.

```xml
<key id="joined" for="node" attr.name="joined" attr.type="string"/>
...
<data key="joined">2021-03-15</data>
<data key="joined">2021-03-15T12:00:00Z</data>
```

Knotviz re-inspects the column after parse. If every value matches ISO 8601, it re-classifies to `date`, and you get a date picker in filters + a timeline gradient in Analyze. If even one value isn't ISO, it stays `string`.

**Opting out.** If you have an ISO-looking value that isn't actually a date — a version tag like `2021-03-15`, say — stop it from matching the regex. Prefix with `v`, drop the dashes, or wrap it: `v2021-03-15`, `20210315`, or `ver:2021-03-15` all stay as `string`.

## Structural mappings

| GraphML element | Becomes | Note |
|---|---|---|
| `<node id="…">` | `NodeInput.id` | Required. |
| Node `<key attr.name="label">` | `NodeInput.label` | Display text. |
| Node `<key attr.name="x">`, `<key attr.name="y">` | `NodeInput.x` / `.y` | Numeric. [Positions rules](/docs/input-formats#positions) apply. |
| Any other node `<data>` | Node property | Typed per the `<key>` declaration. |
| Edge `<key attr.name="weight">` | `EdgeInput.weight` | Numeric. Drives edge filtering + size. |
| Any other edge `<data>` | **Dropped** | Knotviz edges only carry `weight`. |

`<default>` inside a `<key>` is honoured when a node omits that `<data>` element.

## Coming from another tool

### NetworkX

```python title="nx_to_graphml.py"
import networkx as nx
nx.write_graphml(G, "graph.graphml")
```

### Gephi

File → Export → Graph File → **.graphml**. Uncheck "Normalize values" to keep original attribute precision. Positions are preserved if you've run a layout.

### yEd

File → Export → **GraphML** (`.graphml`). yEd adds visual styling (`<y:Geometry>`, `<y:Fill>`) — Knotviz ignores it cleanly. Structure loads; appearance does not transfer.

### Cytoscape

File → Export → Network to File → GraphML. The node `id` will be Cytoscape's internal id, not the display name — make sure a `name` attribute is also present. If you rename `name` → `label`, Knotviz picks it up as the display label automatically.

### igraph (R)

```r title="igraph_to_graphml.R"
library(igraph)
write_graph(g, "graph.graphml", format = "graphml")
```

## Gotchas

- **Edges can't carry arbitrary data.** Only `weight` transfers. Any other `<data>` on edges is dropped on load.
- **No array type.** Pipe-delimited strings stay as strings — no auto-detection. Use JSON or GEXF (`liststring`) if you need real arrays.
- **yEd visual styling is ignored.** `<y:Geometry>`, `<y:Fill>`, etc. parse cleanly but don't render.
- **Hyperedges are not supported.** A `<hyperedge>` element will parse but no edge is created.
- **Multiple `<graph>` elements** — only the first is read. A warning is logged if more exist.
- **Silent skips land in the console.** Nodes without a valid `id`, `<data>` with an unknown `key`, edges referencing unknown nodes — all are dropped with a `console.warn`. Open devtools if a count looks off.
- **No streaming parser.** Files above ~500k nodes may OOM a 4 GB browser tab — see [limits](/docs/limits) for the hard ceiling.
- **UTF-8 recommended.** Knotviz doesn't strip a leading BOM before handing the document to the XML parser. If you hit a "Malformed GraphML XML" error on a file that looks fine, check the first bytes and save without BOM.

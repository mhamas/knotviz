---
title: GraphML
description: W3C-ish XML standard. Round-trips Gephi, NetworkX, yEd exports.
---

*Standard GraphML with typed `<key>` declarations and `<data>` values.*

## Example

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

| `attr.type` | Maps to |
|---|---|
| `int`, `long`, `float`, `double` | `number` |
| `boolean` | `boolean` |
| `string` | `string`, or `date` if every value matches ISO 8601 (see below) |

### Dates in GraphML

The GraphML subset Knotviz reads has no native `date` type, so the idiomatic approach is to declare the column as `attr.type="string"` and store ISO-8601 values (`2021-03-15`, `2021-03-15T12:00:00Z`). Knotviz re-inspects the column after parse: if every value parses as ISO-8601, the column becomes `date` and you get a date picker in filters and a timeline gradient in the Analyze panel. If even one value isn't ISO, the column stays `string`.

If you need an ISO-8601-looking string to stay a string (e.g. a version identifier), re-shape the value so it doesn't match — add a prefix, drop the dashes, etc.

## Structural mappings

| GraphML | Knotviz |
|---|---|
| Node `<key>` named `label` | `NodeInput.label` |
| Node `<key>` named `x`, `y` (numeric) | `NodeInput.x/y` |
| Edge `<key>` named `label` | `EdgeInput.label` |
| Edge `<key>` named `weight` (numeric) | `EdgeInput.weight` |
| Any other `<data>` on nodes | `properties` |
| Any other `<data>` on edges | Ignored (edges carry only `label` + `weight`) |

`<default>` inside a `<key>` is honoured when a node omits that `<data>`.

## Coming from another tool

GraphML is the interop format, so most tools export it natively.

### NetworkX

```python title="nx_to_graphml.py"
import networkx as nx
nx.write_graphml(G, "graph.graphml")
```

### Gephi

File → Export → Graph File → select **.graphml**. Positions are preserved if you've run a layout. Uncheck "Normalize values" to keep the original attribute precision.

### yEd

File → Export → **GraphML** (`.graphml`). yEd adds visual styling (`<y:Geometry>`, `<y:Fill>`) that Knotviz ignores cleanly — structure loads; appearance does not transfer.

### Cytoscape

File → Export → Network to File → GraphML. Node `id` will be the network internal id, not the name — make sure your node `name` column is present, and Knotviz will pick it up as the label automatically if the attribute is named `label`.

### igraph (R)

```r title="igraph_to_graphml.R"
library(igraph)
write_graph(g, "graph.graphml", format = "graphml")
```

## Gotchas

- yEd-specific extensions (`<y:Geometry>`, `<y:Fill>`, visual styling) are ignored. Structure parses fine; appearance does not transfer.
- Hyperedges and nested `<graph>` elements are not supported.
- Files above ~500k nodes may OOM a 4 GB browser tab — GraphML has no streaming parser. See [limits](/docs/limits).


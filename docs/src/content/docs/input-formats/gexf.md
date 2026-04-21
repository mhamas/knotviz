---
title: GEXF
description: Gephi's native XML format. Supports viz:position for preserved layouts.
---

*GEXF 1.3 static graphs. Advantage over GraphML: native `<viz:position>` element for node x/y.*

## Example

```xml title="graph.gexf"
<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="age" type="integer"/>
    </attributes>
    <nodes>
      <node id="n1" label="Alice">
        <attvalues><attvalue for="0" value="34"/></attvalues>
        <viz:position x="10" y="20" xmlns:viz="http://gexf.net/1.3/viz"/>
      </node>
      <node id="n2" label="Bob"/>
    </nodes>
    <edges>
      <edge source="n1" target="n2" weight="0.8"/>
    </edges>
  </graph>
</gexf>
```

[Download example](/samples/gexf/1k.gexf) · [Try it in Knotviz ↗](/graph?example=gexf/1k)

## Supported attribute types

| `type` | Maps to |
|---|---|
| `integer`, `long`, `float`, `double` | `number` |
| `boolean` | `boolean` |
| `string`, `anyURI` | `string`, or `date` if every value matches ISO 8601 |
| `liststring` | `string[]` (pipe-decoded) |

GEXF has no native date type; the convention is to use `type="string"` with ISO-8601 values (`2021-03-15`, `2021-03-15T12:00:00Z`). Knotviz re-inspects the column after parse and promotes it to `date` when every value matches — you get a date picker in filters and a timeline gradient in Analyze. If even one value isn't ISO, the column stays `string`.

## Structural mappings

| GEXF | Knotviz |
|---|---|
| `<node label="…">` element attribute | `NodeInput.label` |
| `<viz:position x="…" y="…"/>` (z ignored) | `NodeInput.x/y` |
| `<edge weight="…" label="…">` element attributes | `EdgeInput.weight/label` |
| `<attvalues>` on node | `properties` |

Element attributes on `<edge>` win over `attvalues` with matching titles.

## Coming from another tool

### Gephi

File → Export → Graph File → select **.gexf**. Tick **Export positions** if you want the layout preserved (Knotviz reads `viz:position` automatically). Untick **Export visual config** — those are ignored on our side and bloat the file.

### NetworkX

```python title="nx_to_gexf.py"
import networkx as nx
nx.write_gexf(G, "graph.gexf")
```

NetworkX writes GEXF 1.2 by default; Knotviz accepts both 1.2 and 1.3.

### ForceAtlas2 / Gephi round-trip

If you've run Gephi's ForceAtlas2 layout and want to preserve it exactly, export as `.gexf` (positions ride in `viz:position`). Knotviz will use them as the initial layout; press Space only if you want to re-simulate.

### Why GEXF over GraphML?

Use GEXF if you're specifically round-tripping with Gephi and want positions preserved end-to-end. Otherwise GraphML is more widely supported by other tools.

## Gotchas

- Dynamic mode / `<spells>` elements are ignored — GEXF 1.3 static only.
- `viz:color`, `viz:size`, `viz:shape` styling is ignored. Use Knotviz's [Analyze](/docs/analyze) panel instead.
- Files above ~1M nodes may OOM a 4 GB browser tab — GEXF has no streaming parser. See [limits](/docs/limits).


---
title: GEXF
description: Gephi's native XML format. Supports viz:position for preserved layouts.
---

*GEXF static graphs. Advantage over GraphML: a native `<viz:position>` element for node x/y, and a real `liststring` type for arrays. Knotviz doesn't validate the `version` attribute, so any GEXF 1.x file that matches the structure below will load.*

## Minimum viable example

```xml title="graph.gexf"
<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="age" type="integer"/>
      <attribute id="1" title="tags" type="liststring"/>
    </attributes>
    <nodes>
      <node id="n1" label="Alice">
        <attvalues>
          <attvalue for="0" value="34"/>
          <attvalue for="1" value="engineer|founder"/>
        </attvalues>
        <viz:position x="10" y="20"/>
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

| `type` | Maps to | Note |
|---|---|---|
| `integer`, `long`, `float`, `double` | `number` | Range/precision not checked — all become JS numbers. |
| `boolean` | `boolean` | `"true"` / `"false"` (case-insensitive) and `"1"` / `"0"`. |
| `string`, `anyURI` | `string` | Promoted to `date` if every value is ISO 8601 (see below). |
| `liststring` | `string[]` | Pipe-delimited. `\|` escapes a literal pipe; `\\` escapes a literal backslash. |

### Dates in GEXF

GEXF has no native date type. Declare the column as `type="string"` with ISO-8601 values and Knotviz will re-classify it to `date` after parse — you get a date picker in filters and a timeline gradient in Analyze.

```xml
<attribute id="joined" title="joined" type="string"/>
...
<attvalue for="joined" value="2021-03-15"/>
```

If even one value doesn't match ISO 8601, the column stays `string`.

**Opting out.** To keep an ISO-looking value as a plain string (e.g. a version tag), re-shape it so it doesn't match the regex: `v2021-03-15`, `20210315`, `ver:2021-03-15`.

## Structural mappings

| GEXF element / attribute | Becomes | Note |
|---|---|---|
| `<node id="…">` | `NodeInput.id` | Required. |
| `<node label="…">` | `NodeInput.label` | Display text, read from the element attribute. |
| `<viz:position x="…" y="…"/>` | `NodeInput.x` / `.y` | `z` is ignored. [Positions rules](/docs/input-formats#positions) apply. |
| `<attvalues>` on node | Node properties | Typed per the matching `<attribute>` declaration. |
| `<edge weight="…">` | `EdgeInput.weight` | Numeric. Read from the element attribute; if missing, falls back to an `<attvalue>` on the edge titled `weight`. |
| `<edge label="…">` | `EdgeInput.label` | Read and preserved on export, but **not currently rendered in the canvas**. Same attribute-then-attvalue fallback as weight. |
| Any other edge `<attvalue>` | **Dropped** | Knotviz edges only carry `label` + `weight`. |

## Coming from another tool

### Gephi

File → Export → Graph File → **.gexf**. Tick **Export positions** if you want the layout preserved (Knotviz reads `viz:position` automatically). Untick **Export visual config** — `viz:color` / `viz:size` / `viz:shape` are ignored on our side and just bloat the file.

### NetworkX

```python title="nx_to_gexf.py"
import networkx as nx
nx.write_gexf(G, "graph.gexf")
```

NetworkX defaults to GEXF 1.2. Knotviz was written against the 1.3 spec but doesn't check the version declaration, so 1.2 files load fine in practice — the element names and attribute shapes Knotviz reads are the same in both.

### ForceAtlas2 / Gephi round-trip

If you've run Gephi's ForceAtlas2 layout and want to preserve it, export as `.gexf` — positions ride inside `<viz:position>`. Knotviz uses them as the initial layout; press Space only if you want to re-simulate.

## GEXF or GraphML?

- **Positions.** If you need to preserve x/y end-to-end, use GEXF. GraphML has no standard position element.
- **Arrays.** If you need real `string[]` properties, use GEXF (`liststring`). GraphML can only carry them as pipe-delimited strings that stay `string`.
- **Portability.** More graph tools read and write GraphML than GEXF. If interop matters more than positions/arrays, use GraphML.
- **File size.** GEXF's XML is slightly more verbose; 10–20% bigger at comparable fidelity.

## Gotchas

- **Dynamic mode / `<spells>` elements are ignored.** Knotviz reads GEXF as static only.
- **Visual styling is ignored.** `viz:color`, `viz:size`, `viz:shape` parse cleanly but don't render. Use Knotviz's [Analyze](/docs/analyze) panel for colour and size.
- **Edges can't carry arbitrary data.** Only `label` and `weight` transfer; other `<attvalue>` entries on edges are dropped.
- **Namespaces are stripped.** The parser normalises prefixed elements (`<gexf:node>` → `<node>`) before matching. In practice every standard writer uses the default namespace, so this rarely matters — but if a hand-authored file uses a non-standard prefix and that somehow affects the element name after stripping, parsing may skip those elements silently.
- **Silent skips land in the console.** Unknown `<attvalue for="…">` references, edges to unknown node ids, and nodes without an id all fall through with a `console.warn`. Open devtools if a count looks off.
- **No streaming parser.** Files above ~1M nodes may OOM a 4 GB browser tab — see [limits](/docs/limits) for the hard ceiling.
- **UTF-8 recommended.** No explicit BOM handling. If a file that looks fine errors with "Malformed GEXF XML", save without the BOM.

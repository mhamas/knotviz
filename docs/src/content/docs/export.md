---
title: Export
description: Download the current graph in your choice of five formats. Respects filters. Round-trips losslessly through JSON, CSV pair, and GEXF.
---

*Download writes the current visible graph to a file. Pick from five formats — JSON, CSV edge list, CSV pair, GraphML, GEXF — using the chevron next to the download button.*

Export is how you save the time you've spent. A force-laid-out 1M-node graph takes 30s to compute; an exported snapshot preserves every `x`/`y` so re-opening renders exactly where you left off — no re-simulation required. The default format is whatever you picked last in the current session (JSON on a fresh page).

## How to download

Two-click flow:

1. **Body click** on **↓ Download as `<format>`** in the left sidebar runs the last format you picked this session (JSON the first time).
2. **Chevron click** opens a picker listing all five formats with a one-line description and a yellow **Lossy** badge on the formats that drop data.

Picking a lossy format opens a confirmation dialog explaining what won't survive — cancel to back out, "Download anyway" to proceed.

The download filename uses the source filename's stem with the new extension swapped in (`acme-network.json` → `acme-network.gexf`). If you opened the graph from an example URL with no filename, you get `knotviz-export.<ext>`.

## Pick a format

| Format | When to use |
|---|---|
| [JSON](/docs/input-formats/json) | Default. Lossless round-trip; the only format that preserves every property type Knotviz knows. |
| [CSV edge list](/docs/input-formats/csv-edge-list) | When you only need the edges (e.g. feeding into a graph algo that ignores per-node data). **Lossy** — drops every per-node property. |
| [CSV nodes + edges (ZIP)](/docs/input-formats/csv-pair) | Spreadsheet-friendly. Two CSVs zipped into one download; unzip and the nodes file carries typed column headers (`age:number`, `tags:string[]`). |
| [GraphML](/docs/input-formats/graphml) | Interop with Gephi / yEd / NetworkX. **Lossy** — `string[]` properties flatten to pipe-encoded strings (no list type in GraphML). |
| [GEXF](/docs/input-formats/gexf) | Round-trip into Gephi specifically; preserves positions in `<viz:position>` and arrays as `liststring`. |

## What's in the file

Every format includes:

- **Every visible node** (filters respected). Filtered-out nodes are not included.
- **Every visible edge** (both endpoints visible, edge not dropped by the edges-to-keep slider).
- Current `x` / `y` positions (where the format supports them — JSON, CSV pair, GEXF, and GraphML via `x`/`y` keys).
- All declared properties, with the format's typed encoding.
- Edge `weight` when present.

Format-specific extras:

- **JSON only** — `nodePropertiesMetadata` (the per-property `?` descriptions) is re-written from current state.

## What's NOT in the file

Intentional omissions to keep exports portable and small:

- **Hidden nodes and their edges.** Filter state is *applied* to the export, not stored with it. If you want hidden nodes back, clear the filter and export again.
- **Mid-simulation state.** The export captures where nodes *are*, not the simulation in motion. Re-opening loads those positions; pressing Space starts a fresh sim that may reshape them.
- **Visualisation settings** — colour / size encoding, palette, mode, log-scale toggle. Re-apply after re-opening.
- **Custom palettes** you created live in browser state only.
- **Edge `label` and edge-level properties.** Knotviz doesn't render edge labels and the docs are explicit that edges only carry `weight`. Other edge attributes are dropped on import too, so there's nothing to round-trip.

## Round-trip

```
1. Load a 100k-node graph (sim ~15s to lay out)
2. Filter down to the 20k nodes you care about
3. Colour by community, spot the cluster
4. Click ↓ Download as JSON  →  filtered-20k.json
5. Tomorrow → drop the file back in → rendering starts at the saved positions
```

The 25-pair round-trip matrix in the test suite verifies that every (source format, target format) combination preserves the structure intact. The cells that matter:

- **JSON / CSV pair / GEXF** as both source and target → full property fidelity, including `string[]`.
- **GraphML** anywhere in the chain → `string[]` round-trips as a pipe-delimited string (`"engineer|founder"`), not as an array. The data is intact; the type isn't.
- **CSV edge list** as source or target → only structure (node ids, edges, weights) survives the trip.

The re-opened graph **will still start simulation** if you press Space (it has positions, not a frozen layout). Hit **Stop** immediately if you only wanted to inspect the saved state.

## File size

Output is packed tight (no pretty-printing for JSON; RFC-4180 CRLF rows for CSV; single-space indent for XML) so files stay compact. Rough estimates for the JSON path:

| Graph size | File size |
|---|---|
| 1k nodes / 1.5k edges | ~200 KB |
| 100k / 150k | ~20 MB |
| 1M / 1.5M | ~215 MB |
| 5M / 7.5M | ~1 GB |

Other formats land within ±30% of these numbers. Property values dominate for large files — a graph with 10 string properties per node is roughly 3× the size of one with just `id` and `label`.

## Use cases

**Save a long-running layout.** 1M-node simulation takes 30s. Do it once, export as JSON or GEXF, re-open whenever.

**Hand to a colleague.** Filter to the cluster you care about and export — they open it in their own browser tab and start with your filtered subset, your positions, your community labels.

**Pipeline the output.** Export as JSON for `jq` queries; export as GEXF if the next tool is Gephi; export as CSV pair if you want spreadsheet-friendly per-node tables.

**Version-control layouts.** Check the exported file into git alongside the graph data. Reproducible renderings even years later.

## Gotchas

- **Filter state isn't saved.** It's *applied* to the export, not stored. Re-importing gives you the filtered subset as the full graph; you can't un-filter back to the original.
- **Visualisation settings aren't saved.** Colour, palette, size mode all need to be re-applied on re-open.
- **CSV edge list strips properties.** Confirmation dialog warns before download. If you need to keep `age` / `community` / `tags`, pick CSV pair (or any other format) instead.
- **GraphML can't represent arrays.** Confirmation dialog warns. The data round-trips as a pipe-delimited string; no information lost, but the type demotes from `string[]` to `string`.
- **Edges hidden by the edges-to-keep slider during simulation are dropped from the export** — exports reflect what's currently visible, not the original edge count.
- **Default format is per-session.** Each new browser tab starts with JSON as the default; whatever you pick last in a session sticks for that session only.

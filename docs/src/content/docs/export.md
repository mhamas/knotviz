---
title: Export
description: Download the current layout as JSON. Respects filters. Round-trips.
---

*Download button writes a JSON file containing the current node positions, labels, properties, and edges. Re-importing restores the exact layout.*

Export is how you save the time you've spent. A force-laid-out 1M-node graph takes 30s to compute; exported JSON preserves every `x`/`y` so re-opening it renders exactly where you left off — no re-simulation required. The file is plain [Knotviz JSON](/docs/input-formats/json), readable by any tool that speaks the format, round-trip-clean.

## What's in the file

Click **↓ Download graph** in the left sidebar. You get a single `.json` file containing:

- **Every visible node** (filters respected). Filtered-out nodes are not included.
- **Every visible edge** (both endpoints visible, edge not dropped by the edges-to-keep slider).
- Current `x` / `y` positions for each node — whatever the last simulation / rotation / manual drag left.
- All original properties, unchanged from input. Including any you didn't visualise.
- `label` and `weight` for edges (when present).
- `nodePropertiesMetadata` re-written from the current state — fresh descriptions, not a copy of input.

The shape is standard Knotviz JSON — see the [JSON format reference](/docs/input-formats/json). Any tool that speaks that format can read the file, including Knotviz itself for round-tripping.

## What's NOT in the file

Intentional omissions, to keep exports interop-friendly and small:

- **Hidden nodes and their edges.** If you want them back, clear the filter and export again.
- **Simulation state** — not resumable. The export is a snapshot of positions, not the physics simulator's velocity/force state.
- **Colour / size gradient settings** — the palette you picked, the property you encoded, the mode (colour vs size). Re-apply after re-opening.
- **Filter state** — the filters you configured are *applied* to the export, not *saved* with it. Re-importing gives you the filtered subset as the full graph; you can't un-filter back to the original.
- **Custom palettes** you created live in browser state only.

The pattern: if it's a view setting, it doesn't export. Only the underlying graph (nodes + edges + positions + properties) does.

## Round-trip

Load → simulate → export → drop back in. Positions are preserved, so the re-imported graph renders exactly where you left it — no force sim re-run needed. This is how you save a layout.

```
1. Load a 100k-node graph (15s sim to lay out)
2. Filter down to 20k interesting nodes
3. Colour by community, spot a cluster
4. Click ↓ Download graph → filtered-20k.json
5. Re-open tomorrow → ↓ drop → rendering starts at the saved positions
```

The re-opened graph **will still start simulation** if you press Space (it has positions, not a frozen layout). Hit **Stop** immediately after loading if you only wanted to inspect the saved state.

## File size expectations

Compact JSON, no pretty-printing — we prioritise file size over human readability for exports. Rough estimates:

| Graph size | File size (compact JSON) |
|---|---|
| 1k nodes / 1.5k edges | ~200 KB |
| 100k / 150k | ~20 MB |
| 1M / 1.5M | ~215 MB |
| 5M / 7.5M | ~1 GB |

Property values dominate for large files. A graph with 10 string properties per node will be 3× the size of one with just `id` and `label`.

## Use cases

**Save a long-running layout.** 1M-node simulation takes 30s. Do it once, export, reload whenever.

**Send an annotated view.** You've filtered to the suspicious cluster and laid it out; export and share the JSON so a colleague opens it in the same state. Colour/size config doesn't travel, but the layout and data subset do.

**Pipeline the output.** Export JSON is machine-readable — feed it into NetworkX, Gephi, or a custom script. Use `jq` on the file directly for ad-hoc queries.

**Version-control layouts.** Check the exported JSON into git alongside the graph data. Reproducible renderings even years later.

## Gotchas

- Filter state is *applied* to the export, not saved with it. Re-import doesn't restore your filter — the filtered subset becomes the whole graph.
- Colour / size gradient configuration is not saved. Re-apply after re-importing.
- Large exports (>1M nodes) produce large JSON files. Knotviz writes compact JSON (no whitespace) to keep size down — the file is not human-readable without reformatting.
- `nodePropertiesMetadata` is re-written from *current* state, not copied from input. If you loaded a file without metadata, the export will have none either.
- Edges hidden by the **edges-to-keep** slider during simulation are dropped from the export — we export the visible edge set, not the original.

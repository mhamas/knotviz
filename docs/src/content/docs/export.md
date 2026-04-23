---
title: Export
description: Download the current graph in your choice of five formats. Respects filters. Round-trips losslessly through JSON, CSV pair, and GEXF.
---

*Save the current view to a file in one click, or pick from five formats to hand off to another tool.*

## Download

**↓ Download as `<format>`** in the left sidebar. One click downloads in the last format you picked (JSON on a fresh page). The chevron next to it opens a picker with all five formats.

The filename carries your input's stem: `acme-network.json` opens → `acme-network.gexf` downloads.

## Pick a format

| Format | Use when |
|---|---|
| [JSON](/docs/input-formats/json) | Default. Lossless — round-trips every property type Knotviz knows. |
| [CSV edge list](/docs/input-formats/csv-edge-list) | You only need the connections. **Drops all per-node properties.** |
| [CSV nodes + edges (ZIP)](/docs/input-formats/csv-pair) | Spreadsheet-friendly. Two CSVs zipped. Unzip to edit in Excel / Sheets. |
| [GraphML](/docs/input-formats/graphml) | Interop with Gephi / yEd / NetworkX. **Arrays flatten to pipe-joined strings.** |
| [GEXF](/docs/input-formats/gexf) | Gephi round-trip. Preserves positions and arrays. |

Lossy formats (CSV edge list, GraphML) ask for confirmation before downloading.

## What's in the file

- Every **visible** node and edge (filters respected — hidden nodes don't travel).
- Current `x` / `y` positions, so re-opening renders where you left off.
- All node properties, in their original types — except where the format can't represent them (see the per-format pages).
- Edge weights.

## What's not saved

View settings live in the tab, not the file:

- **Filters** are applied, not stored. Re-importing gives you the filtered subset as the full graph.
- **Colour / size encoding**, **palette**, **log-scale toggle** — re-apply after re-opening.
- **Custom palettes** you created stay in this browser.

The idea: the file is the *graph*; the tab is the *view*. Exports are portable because they don't carry anything tab-specific.

## Gotchas

- **Filters don't come back.** If you exported a filtered subset, re-importing gives you *that subset as the whole graph* — there's no "show hidden nodes again" button.
- **Visualisation settings don't travel.** Your palette and encoding choices don't come along; re-apply on the other side.
- **Pressing Space after re-opening starts a fresh simulation** and reshapes the saved positions. Hit Stop immediately if you just want to view the layout.
- **Edges dropped by the edges-to-keep slider aren't in the export** — the file reflects what's on screen.
- **Default format is per-session.** Each new tab starts at JSON; whatever you last picked in a session sticks for that session.

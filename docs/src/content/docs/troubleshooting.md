---
title: Troubleshooting
description: Concrete failure modes and fixes. Find your symptom, apply the fix.
---

*Find the symptom that matches what you're seeing. Fixes are one or two lines.*

## My file won't load

**"Invalid JSON file"** — run it through `jq .` or `python -m json.tool`. Usually a trailing comma or unquoted key.

**"File must contain `nodes` and `edges` arrays"** — top-level object needs both keys, both arrays. See [JSON](/docs/input-formats/json).

**"Graph has no nodes to display"** — your `nodes` array is empty, or every node was skipped for missing `id`.

**"Unsupported format"** — extension must be `.json`, `.csv`, `.tsv`, `.graphml`, or `.gexf`. Rename if your file is correctly shaped but wrongly named.

**Tab crashes with "Aw, Snap!"** — renderer ran out of memory. You're above the per-format load limit. See [limits](/docs/limits).

**Drop does nothing** — try clicking the drop zone instead. Some browsers block drag events from certain sources (terminal, archive viewers).

## My graph looks wrong

**All nodes in one blob at centre** — simulation hasn't run yet. Press **Space** or click **Run**. Or your graph has no edges, so there's nothing to push nodes apart.

**Nodes fly off-screen then snap back** — normal for the first few seconds. `fitView(0)` re-centres every tick. Let it settle.

**Nodes clump at the boundary** — you're near or past the ~1M useful ceiling. The 8192×8192 simulation grid is saturating. See [limits](/docs/limits).

**Disconnected components drift apart forever** — expected with default gravity. Turn up **Gravity** in the simulation panel until components hold together.

**Edges look wrong / go to wrong nodes** — check your `source` / `target` columns are named correctly and point to existing node ids. Unknown ids are skipped with a console warning.

**No labels visible** — labels cap at 300 on screen. Zoom in until fewer nodes are in view, or disable via the right sidebar.

## My properties don't look right

**"N values were defaulted" modal on load** — some nodes were missing property values. Number → `0`, string → `""`, boolean → `false`, date → `1970-01-01`, string[] → `[]`. Cancel and fix the source, or confirm to proceed.

**Property shows as string when it should be number** — type inference checks every value. One non-numeric row demotes the column to string. Clean the data or declare the type in a typed CSV header (`age:number`). See [conventions](/docs/input-formats#shared-conventions).

**Date property sorts alphabetically not chronologically** — ISO 8601 strings (`2024-01-15`) sort correctly; `15/01/2024` or `Jan 15 2024` do not. Re-format.

**Array property shows a single concatenated string** — use `|` as the delimiter in CSV, not `,` or `;`. See [CSV conventions](/docs/input-formats#shared-conventions).

## My filters / search aren't behaving

**Filter hides nothing / everything** — multi-filter uses AND. Check no two filters contradict (e.g. `age < 10` AND `age > 50`).

**Search highlights nothing for a term I can see on screen** — substring, case-insensitive, matches `id` and `label` only — not other properties. Use a filter for non-label text.

**A filter-hidden node doesn't reappear when I search for it** — by design. Clear the filter first. See [search](/docs/search#search--filters).

**Statistics numbers look wrong** — stats reflect the **visible** set, not the whole graph. Clear filters to see totals.

**Gradient colours all look the same** — the scale normalises to visible min/max. If your filter leaves near-identical values, the gradient compresses. Try log scale or clear the filter.

## CSV pair specifically

**Nodes file loaded into Edges slot or vice-versa** — drop zones are labelled. Click the wrong-slot file's `×` to remove and re-drop into the correct slot.

**"Edge references unknown node id"** — every `source` / `target` in the edges file must appear as `id` in the nodes file. Check for whitespace or case differences.

**"Duplicate node id"** — ids must be unique across the nodes file. De-dupe at the source.

## GPU / browser

**"WebGL2 not supported"** — update your browser, or enable hardware acceleration in settings. Chromebooks with integrated GPUs sometimes need `chrome://flags` → "Override software rendering list".

**Simulation runs but feels sluggish** — check `chrome://gpu` that "WebGL2: Hardware accelerated" is green. Software rendering is 10–100× slower.

**"The spaceSize has been reduced to N due to WebGL limits"** (console) — your GPU's `MAX_TEXTURE_SIZE` is below 8192. Simulation still works, just in a smaller grid. See [limits](/docs/limits#gpu-note).

## Still stuck?

- Check the browser console (`Cmd+Opt+J` / `Ctrl+Shift+J`) — most failures log a specific reason
- File an issue with the console output at [github.com/apify/knotviz/issues](https://github.com/apify/knotviz/issues)


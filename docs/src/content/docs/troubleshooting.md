---
title: Troubleshooting
description: Concrete failure modes and fixes. Find your symptom, apply the fix.
---

*Find the symptom that matches what you're seeing. Fixes are one or two lines. For anything format-specific not listed here, check the gotchas on the relevant [input-format](/docs/input-formats) page.*

## File won't load

**"Invalid JSON file"** — run it through `jq .` or `python -m json.tool`. Almost always a trailing comma or unquoted key.

**"File must contain `nodes` and `edges` arrays"** — the top-level object needs both keys, both as arrays. See [JSON](/docs/input-formats/json).

**"Graph has no nodes to display"** — your `nodes` array is empty, or every node was skipped for missing `id`. Numeric ids count as "missing" — stringify them.

**"Unsupported format"** — extension must be `.json`, `.csv`, `.tsv`, `.graphml`, or `.gexf`. Rename if the file is correctly shaped but wrongly named.

**Tab crashes with "Aw, Snap!"** — the renderer ran out of memory. You're past the per-format load ceiling. See [limits](/docs/limits).

**Drop does nothing** — some browsers block drag events from certain sources (terminal, archive viewers, remote-desktop clients). Click the drop zone instead and pick the file through the native dialog.

## Graph looks wrong

**All nodes in a single blob at the centre** — the simulation hasn't run. Press **Space** or click **Run**. If the graph has no edges, there's nothing to push nodes apart — that's the only expected blob.

**Nodes fly off-screen briefly at the start** — normal for the first few seconds of a fresh simulation. The camera re-centres automatically; let it settle.

**Nodes compress into a ring at the boundary** — you're near the ~1M useful ceiling. See [Limits](/docs/limits).

**Edges go to the wrong nodes** — check your `source` / `target` values reference existing node ids exactly. Unknown ids are skipped with a `console.warn` — open devtools if an edge count looks off.

**No labels visible** — labels cap at 300 on screen at once. Zoom in until fewer nodes are in view. The toggle is **Show node labels** in the left sidebar.

## CSV pair

**Nodes file loaded into the Edges slot (or vice-versa)** — the drop zones are labelled. Click the `×` on the wrong-slot file to remove it, then drop into the correct slot.

**"Edge references unknown node id"** — every `source` / `target` in the edges file must also appear as an `id` in the nodes file. Whitespace and case differences are common culprits.

## Browser / GPU

**"WebGL2 not supported"** — update your browser, or enable hardware acceleration in its settings. On Chromebooks with integrated GPUs, try `chrome://flags` → "Override software rendering list".

**Simulation runs but feels sluggish** — your browser may be rendering via software, which is 10–100× slower than a GPU. On Chrome, check `chrome://gpu` and look for "WebGL2: Hardware accelerated". On Firefox, `about:support` → Graphics.

## Still stuck?

- Open the browser console (`Cmd+Opt+J` on Mac / `Ctrl+Shift+J` on Windows / Linux). Silent failures (skipped nodes, coerced properties, unknown edge endpoints) all log a specific reason there.
- File an issue with the console output at [github.com/mhamas/knotviz/issues](https://github.com/mhamas/knotviz/issues).

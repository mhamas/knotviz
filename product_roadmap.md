# Graph Visualizer — Product Roadmap

---

## Overview

Four releases, each shippable and useful on its own. Each release is broken into smaller logical chunks that can be built, reviewed, and demoed independently.

| Release | Chunks | Complexity |
|---|---|---|
| R1: Core Viewer | 1 + 2 + 3 + 4 | XL |
| R2: Filter System | 5 + 6 | XL |
| R3: Stats + Export | 7 + 8 | L |
| R4: Color | 9 | L |

---

## R1: Core Viewer

**After this release, the user can** drop a JSON graph file, run the ForceAtlas2 simulation to lay out the graph, navigate the canvas, and click any node to inspect its properties.

---

### Chunk 1 — Static Graph Viewer *(M)*

**After this chunk:** Load a file and see a static graph on screen.

- File drop zone with inline error display
- Data pipeline: `parseJSON → validateGraph → applyNullDefaults → buildGraph`
- Null-default blocking modal (count of replaced values, Cancel or Load anyway)
- Sigma.js + Graphology canvas rendering
- Node states: default / highlighted / grayed-out / selected (4 colors)
- Edge states: default / grayed-out
- Node labels (fade in at 8px visual radius threshold, ~150ms CSS transition)
- Filename displayed on canvas (muted, top-left, 12px)
- Canvas navigation: scroll zoom, double-click zoom, pan, on-screen +/−/fit buttons
- Canvas resize handling (`resize()` debounced 100ms)
- React Error Boundary wrapping `GraphView`
- Left sidebar shell (240px)
- Graph info: node count + edge count

---

### Chunk 2 — Simulation *(L)*

**After this chunk:** Lay out the graph with FA2 and tune the layout.

- ForceAtlas2 Web Worker integration
- Run / Stop buttons (separate, inactive one grayed out)
- Simulating… indicator (`animate-pulse` dot)
- Gravity + Speed sliders (log scale, 150ms debounce before stop/restart cycle; `start()` waits for worker confirmation)
- Randomize Layout (preserves prior running/stopped state)
- Large-graph warning dialog (>10,000 nodes before Run)
- Worker crash error handling (inline error near Run/Stop + `console.error`)
- Position-aware loading (x/y honored if all nodes have positions; partial = ignore all + inline warning)
- Camera fits to graph on file load and after Randomize Layout

---

### Chunk 3 — File Management *(S)*

**After this chunk:** Safely replace a loaded graph without losing current state accidentally.

- "Load new file" button in top of left sidebar
- Drop-while-loaded confirmation dialog ("Loading a new file will clear the current graph. Continue?")
- Simulation-running + new file drop: stop simulation first, then show confirmation dialog
- Canvas drag-over overlay ("Drop to load new graph")
- On confirm: full app state reset. On cancel: current graph intact.

---

### Chunk 4 — Node Tooltip *(M)*

**After this chunk:** Click any node and read all its properties.

- Click to open; clicked node gains selected visual state (blue-500, 2px ring)
- Instantly reposition to newly clicked node (no animation)
- Close on × button, Escape, or outside click; focus returns to canvas on close
- Focus moves into tooltip on open
- Content: `label` as heading; node `id` as smaller secondary line beneath heading
- All properties displayed alphabetically
- Dates: two lines — formatted (`2021-03-15 · 1,423 days ago`) + raw ISO string (muted, smaller)
- Numbers, strings, booleans: single formatted line
- Long property names truncated with ellipsis; full name shown in `title` attribute on hover
- Tooltip positioned to maximise visibility (flips horizontally/vertically within canvas bounds)

---

## R2: Filter System

**After this release, the user can** filter visible nodes by any property — numeric ranges, string values, date ranges, or booleans — with live match counts and AND logic across all active filters.

---

### Chunk 5 — Core Filters *(L)*

**After this chunk:** Filter by number and boolean properties; see nodes highlight and gray out live.

- Right sidebar shell with Filters / Stats / Color tab structure
- Number filter: dual-handle range slider, initialised to `[min, max]`, 150ms debounce
- Boolean filter: three-way toggle (true / false / either)
- Enable/disable checkbox per filter panel (disabled controls dimmed at 50% opacity)
- AND logic across all enabled filters
- "N nodes match" count pinned at top of Filters tab
- AND-logic note pinned immediately below count: *"Filters combine with AND — nodes must match all enabled filters."*
- "Clear all filters" button (full reset to initial defaults)
- Node highlight states: highlighted `#93c5fd`, grayed-out `#e2e8f0`, default `#94a3b8`
- Highlighted nodes rendered at 1.15× default radius
- Edge grayed-out when at least one endpoint node is grayed-out
- Zero-match empty state banner inside sidebar below count
- Tooltip auto-closes (silent dismiss) when its node becomes grayed-out
- Grayed-out nodes unclickable (cursor: `default` on hover)
- Switching between Filters / Stats / Color tabs does not change highlight state

---

### Chunk 6 — String + Date Filters *(M)*

**After this chunk:** Filter by all four property types.

- String filter: prefix-match text input, dropdown shows up to 10 matching values, selected values as removable tags
- String filter: empty tag selection = no restriction for all cardinalities; hint text *"All values included"* when no tags selected
- String filter: default state ≤50 unique values → all pre-selected; >50 → no restriction, placeholder *"Search to filter by specific values."*
- String filter: `""` displayed as `""` in tags and dropdown
- String filter: tag overflow — "+N more" chip; clicking expands tag area
- String filter: dropdown search debounced 150ms
- Date filter: After (inclusive) + Before (inclusive) date pickers; either bound optional
- Date filter: invalid range inline error (*"After date must be earlier than Before date"*); zero nodes pass until corrected
- Date filter: 150ms debounce
- Collapsible filter panels (chevron ▾/▶ toggles; checkbox remains interactive when collapsed)
- Type badges on each filter panel header (`number` / `string` / `date` / `boolean`, 11px, slate-100 background)
- Filters tab scrolls independently at 10+ properties

---

## R3: Stats + Export

**After this release, the user can** view computed statistics over their filtered node set and download the current graph layout as a schema-valid JSON file for round-trip re-import.

---

### Chunk 7 — Stats Tab *(M)*

**After this chunk:** Get computed statistics over the filtered node set.

- Stats tab in right sidebar
- Total node count + filtered node count (`aria-live="polite"` on both)
- Number property dropdown (hidden when no number properties; shows *"Property analysis is available for number properties only. No number properties detected."*)
- Statistics computed over filtered nodes (or all nodes when no filters active): min, max, average, median, P25, P75
- Histogram: Sturges' rule (`ceil(log2(n) + 1)`), min 3 buckets, max 20 buckets
- Histogram: hover tooltip per bar showing bucket range + node count (e.g. *"23.4 – 31.1: 48 nodes"*)
- Histogram: no Y-axis labels
- Stats and histogram update live as filters change

---

### Chunk 8 — Export *(S)*

**After this chunk:** Save the current layout and reload it exactly.

- "↓ Download Graph" button in left sidebar (below GRAPH INFO)
- On click: filename prompt pre-filled with original filename; user may edit before confirming
- Exported file: schema-valid JSON (`version: "1"`), all original node + edge fields preserved, each node gains `x` and `y` (current canvas position in graph coordinate space)
- Toast notification on success: *"Graph downloaded."*
- E2E round-trip test: export → re-import → verify graph loads without validation error and positions are restored exactly

---

## R4: Color

**After this release, the user can** color-code active nodes by any property using a gradient palette, with a live legend, adding a new analytical dimension alongside filters and stats.

---

### Chunk 9 — Color Tab *(L)*

**After this chunk:** Color-code active nodes by any property using a palette.

- Color tab in right sidebar
- Property selector (all property types; "None" default disables gradient)
- Palette selector: Viridis, Plasma, Blues, Reds, Rainbow, RdBu (diverging). Default: Viridis.
- Custom color picker: add colors to any palette via color picker in palette dropdown; custom colors persist for the session
- **Number / Date:** continuous gradient mapped linearly across `[min, max]` of active nodes. Dates converted to ms at display time only.
- **Boolean:** binary — `false` → low-end palette color; `true` → high-end palette color
- **String:** each distinct value assigned a unique palette color; round-robin cycling on overflow (no warning)
- **min === max guard:** when all active nodes share the same value, apply midpoint color (t = 0.5) and show note: *"All nodes have the same value — uniform color applied."*
- Grayed-out nodes always stay `#e2e8f0`; gradient does not apply to them
- Selected node retains 2px ring in `#3b82f6` on top of gradient color
- Gradient legend: continuous horizontal bar with min/max labels for number/date; discrete colored chips with value labels for boolean/string
- Gradient updates live when filters change (active node set changes) or new property/palette selected
- Gradient persists when switching to Filters or Stats tabs; clears only when property selector set to None
- Color tab shows *"Select a property to visualise node colors."* when no property selected
- Color tab shows *"No data for selected property"* when selected property has no values among active nodes
- Active color gradient indicator visible on Color tab label when gradient is active (badge or dot)

---

## Post-MVP Backlog

| Feature | Notes |
|---|---|
| Dual-line tooltip for non-date properties (formatted + raw) | Only dates show two lines in v1 |
| Active filter indicator dot on collapsed filter panel header | Visual signal when filter has non-default values |
| String / date distribution charts in Stats tab | Number stats only in v1 |
| Expanded histogram modal | No click-to-expand in v1 |
| Community detection / clustering visualization | Post-MVP |

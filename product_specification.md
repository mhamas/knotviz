# Graph Visualizer — Product Specification

---

## Overview

**Problem statement:** A technical data engineer or analyst has a graph dataset exported from a database or pipeline. They want to explore its structure, identify clusters, and filter nodes by properties to surface patterns. This tool gives them a single-page environment to load a graph, position it with a force-directed simulation, and interactively filter nodes by their properties to narrow down the data to what matters.

**Primary user:** Technical data engineer or analyst — someone who understands graph structures and can interpret visualizations. Domain knowledge can be assumed; no hand-holding is needed in the UI.

**Target scope:** Clean, working prototype. Correctness and clarity take priority over polish.

---

## Interaction Flow

1. **Load** — User drops a `.json` file onto the full-screen drop zone. The file is validated against the versioned schema; errors are shown inline. If a graph is already loaded, a "Load new file" button remains accessible in the top of the left sidebar; clicking it or dropping a new file onto the canvas triggers a confirmation dialog ("Loading a new file will clear the current graph. Continue?"). Confirming stops any running simulation and resets the entire app state. Cancelling keeps the current graph intact.

2. **Simulate** — User presses **Run** in the left sidebar. ForceAtlas2 positions the nodes. The user tunes Gravity/Speed sliders until the layout looks good, then presses **Stop**. Simulation never auto-starts on file load — always manual.

3. **Explore** — User zooms, pans, and navigates the canvas using mouse/trackpad or on-screen controls (see Canvas Navigation).

4. **Filter** — The right sidebar **Filters** tab shows one filter panel per node property. Each filter can be individually toggled on or off. Only enabled filters participate in highlighting. Multiple enabled filters combine with logical AND. Nodes matching all enabled filters are highlighted; all others are grayed out. Edges connected to at least one grayed-out node are also grayed out.

5. **Inspect** — Clicking a node opens a floating tooltip showing all its properties. Clicking a second node moves the tooltip to that node instantly.

6. **Color** — The right sidebar **Color** tab lets the user map a single node property to a color gradient across all active (non-grayed-out) nodes, revealing value distribution directly on the canvas.

7. **Export** — The **Download Graph** button in the left sidebar exports the current graph as a JSON file enriched with each node's current x/y canvas position, so the layout can be reloaded exactly.

---

## UI Layout

### Drop zone (before file load)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│        Drop a graph JSON file here                      │
│        or click to browse                               │
│                                                         │
│   [Spinner shown while parsing after drop]              │
│   [Inline error shown if validation fails]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Main layout (after file load)

```
┌──────────────────┬────────────────────────┬────────────────────────────────┐
│  Left Sidebar    │                        │  Right Sidebar                 │
│  (240px)         │   Sigma canvas         │  (300px)                       │
│                  │   (fills space)        │  [ Filters | Stats | Color ] ← tabs
│  [Load new file] │                        │                                │
│  ─────────────── │   filename.json        │  ── Filters tab ──             │
│  SIMULATION      │   (muted, top-left)    │  N nodes match                 │
│                  │                        │  [Clear all filters]           │
│  [▶ Run] [⏹ Stop]│                        │                                │
│  ● Simulating... │                        │  ▾ ☑ age          (number)     │
│  (when running)  │                        │    [●────────●]                │
│                  │                        │     12        45               │
│  Gravity         │                        │                                │
│  [────●────]     │                        │  ▾ ☑ status       (string)     │
│  1.0             │                        │    [active ✕][pending ✕]       │
│                  │                        │    [Search...          ]       │
│  Speed           │                        │                                │
│  [────●────]     │                        │  ▾ ☑ joined       (date)       │
│  1.0             │                        │    after  [2021-01-01]         │
│                  │                        │    before [2024-12-31]         │
│  [↺ Randomize    │                        │                                │
│     Layout]      │                        │  ▾ ☑ active       (boolean)   │
│                  │                        │    ● true  ○ false  ○ either   │
│  ─────────────── │                        │                                │
│  GRAPH INFO      │                        │  ── AND logic note ──          │
│                  │                        │  Filters combine with AND —    │
│  Nodes:   1,234  │                        │  nodes must match all          │
│  Edges:   5,678  │                        │  enabled filters.              │
│                  │                        │                                │
│  [↓ Download     │        [+][-][⊡]       │                                │
│     Graph]       │                        │                                │
└──────────────────┴────────────────────────┴────────────────────────────────┘
```

### Stats tab (right sidebar)

```
┌────────────────────────────────────┐
│  Right Sidebar                     │
│  [ Filters | Stats ]  ← tabs       │
│                                    │
│  ── Stats tab ──                   │
│  Nodes (total):    1,234           │
│  Nodes (filtered):    38           │
│                                    │
│  Analyse  [score              ▾]   │
│                                    │
│  Min      12.3                     │
│  Max      99.1                     │
│  Average  54.6                     │
│  Median   51.2                     │
│  P25      34.7                     │
│  P75      71.8                     │
│                                    │
│  [▆▃█▅▂▇▄▃]  ← inline histogram   │
│  (hover bar for range + count)     │
└────────────────────────────────────┘
```

### Color tab (right sidebar)

```
┌────────────────────────────────────┐
│  Right Sidebar                     │
│  [ Filters | Stats | Color ]       │
│                                    │
│  ── Color tab ──                   │
│  Property  [score             ▾]   │
│  Palette   [Viridis           ▾]   │
│                                    │
│  [■■■■■■■■■■■■■■■■■■■■■■■■■]      │
│   12.3                    99.1     │
│   (min)                   (max)    │
│                                    │
│  (inactive/grayed nodes stay gray) │
└────────────────────────────────────┘
```

### Node tooltip (floating, anchored to clicked node)

```
┌──────────────────────────────[×]┐
│ Alice                           │
│ ─────────────────────────────   │
│ age      34                     │
│          34             ← raw   │
│ score    91.50                  │
│          91.5           ← raw   │
│ joined   2021-03-15 · 1,423d ago│
│          2021-03-15     ← raw   │
│ active   true                   │
│          true           ← raw   │
└─────────────────────────────────┘
```

Raw values appear as a smaller secondary line beneath each formatted value.

---

## Canvas Navigation

### Mouse / trackpad (built-in via Sigma.js)

| Action | Interaction |
|---|---|
| Zoom in/out | Scroll wheel / two-finger scroll |
| Zoom in | Double-click on canvas |
| Pan | Click and drag on empty canvas area |
| Touch zoom | Pinch / spread |

### On-screen controls

Small button group overlaid on the canvas, bottom-right corner:

| Button | Action |
|---|---|
| `+` | Zoom in |
| `−` | Zoom out |
| ⊡ | Fit graph to screen (reset zoom/pan to show all nodes) |

### Initial viewport

On file load, the camera **fits to graph** — all nodes are shown in view. The user zooms in from there.

When **Randomize Layout** is triggered, the camera fits to graph again after randomizing positions.

### Rotation

Canvas rotation is **not supported** in Sigma.js v3. Out of scope.

### Target viewport

Designed for **14-inch and 16-inch MacBooks** (approximately 1440×900 to 1728×1080 logical pixels). No mobile or touch-only support required.

### Drag-and-drop after initial load

After a graph is loaded, the canvas still accepts file drops. When a file is dragged over the window, a dim overlay appears with the text "Drop to load new graph." Releasing triggers the normal confirmation dialog flow.

---

## Input Data Format

Files must conform to the versioned graph JSON schema (`src/lib/graphSchema.json`). Current version: `"1"`.

**Top-level fields:**
- `version` (required, string) — schema version, must be `"1"`
- `nodes` (required, array)
- `edges` (required, array)

**Node fields:**
- `id` (required, string) — unique identifier
- `label` (optional, string) — display name shown on canvas
- `x` (optional, number) — canvas x position; honoured on load if present (see Position-Aware Loading)
- `y` (optional, number) — canvas y position; honoured on load if present (see Position-Aware Loading)
- `properties` (optional, object) — key/value pairs for filtering. Supported value types: `number`, `string`, ISO 8601 date string, or `boolean`.

**Edge fields:**
- `source`, `target` (required, string) — node IDs; these are schema convention only, not semantic direction
- `label` (optional, string) — stored but not rendered in v1

**Edges are undirected.** No arrowheads are rendered. The `source`/`target` fields are a schema convention.

All nodes should have the same property keys. Property keys are ordered **alphabetically** in the Filters tab and tooltip.

**Example (no positions — layout will be computed by FA2):**
```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15", "active": true } },
    { "id": "2", "label": "Bob",   "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02", "active": false } }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

**Example (with positions — exported by the app and re-importable):**
```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "x": 142.5, "y": -88.3, "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15", "active": true } },
    { "id": "2", "label": "Bob",   "x": -67.1, "y": 210.0, "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02", "active": false } }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

---

## Null-Default Handling

When a file is loaded, **missing property values are replaced with type defaults**:

| Property type | Default value |
|---|---|
| `number` | `0` |
| `string` | `""` |
| `boolean` | `false` |
| `date` | `"1970-01-01"` |

If **any** property values were replaced with defaults, a **blocking modal** is shown before the graph renders:

> **N values were replaced with defaults**
> Some nodes had missing property values that were replaced with type defaults (number → 0, string → "", boolean → false, date → 1970-01-01). This may affect filter and stats results.
>
> [Cancel] [Load anyway]

- **Cancel** — closes the modal; the previously loaded graph (if any) remains visible and intact. Nothing is reset.
- **Load anyway** — proceeds with defaults applied; the graph renders normally.

If no null values exist in the file, the modal does not appear.

---

## Position-Aware Loading

When a loaded file contains `x` and `y` fields on nodes, those positions are used directly to place nodes on the canvas — no random initialisation.

| Scenario | Behaviour |
|---|---|
| All nodes have `x` and `y` | Positions are used as-is. Camera fits to graph. Simulation does not auto-start. |
| Some nodes have `x` and `y`, some do not | Nodes with positions are placed at those coordinates. Nodes without positions are placed randomly in the neighbourhood of the graph centroid. |
| No nodes have `x` or `y` | All nodes are placed randomly (standard behaviour). |

- The simulation is **never** auto-started regardless of whether positions are present. The user always presses Run manually.
- **Randomize Layout** discards any imported positions and randomises all nodes.
- Positions are stored in graph coordinates (Sigma's internal space), not pixel coordinates.

---

## Property Types & Filter Controls

Property types are auto-detected from the values present across all nodes (after null defaults have been applied).

### Number
- **Detection:** All non-null values are JavaScript numbers.
- **Filter UI:** Dual-handle range slider initialised to `[min, max]` across all nodes.
- **Pass condition:** A node passes if its value is within the selected range (inclusive).
- **Debounce:** Slider handle drag events debounce at **150ms** — highlighting updates 150ms after the user stops moving the handle, not on every mouse-move event.

### String
- **Detection:** Values are strings that do not qualify as date type (see below).
- **Filter UI:** A text search input with prefix matching. As the user types, a dropdown shows up to 10 matching distinct values with already-selected values marked with a checkmark (✓). The user selects values to include; selected values appear as removable tags above the input.
- **Pass condition:** A node passes if its value is one of the selected values.
- **Default state — few unique values (≤ 50):** All values pre-selected (no filtering). Shows all values as tags with a "Clear all" link.
- **Default state — many unique values (> 50):** No restriction (no tags). Placeholder text: "Search to filter by specific values." This is functionally equivalent to the filter being disabled.
- **Empty string display:** A defaulted-from-null string value `""` is displayed in tags and the dropdown as `""` (double-quote notation).
- **Debounce:** Dropdown search is debounced at **150ms** after the user stops typing.

### Date
- **Detection:** **100% of non-null values** must be valid ISO 8601 date strings for the property to be classified as `date`. If any non-date value is present, the entire property falls back to `string` type.
- **Filter UI:** Two date pickers — **after** (inclusive) and **before** (inclusive). Either or both bounds are optional. Placeholder text: "Any date."
- **Pass condition:** A node passes if its date falls within the selected range. When both bounds are empty, the filter passes all nodes (functionally equivalent to disabled).
- **Debounce:** Date picker changes debounce at **150ms**.

### Boolean
- **Detection:** All non-null values are JavaScript booleans.
- **Filter UI:** Three-way toggle — **true**, **false**, or **either** (no restriction). Default: **either**.
- **Pass condition:** A node passes if its value matches the selected state. When **either** is chosen, all nodes pass.

---

## Filtering & Highlighting Behavior

- Each filter panel has an **enable/disable checkbox**. When unchecked, the filter is ignored entirely and its controls are dimmed (50% opacity, pointer-events disabled).
- All enabled filters combine with **logical AND** — a node must satisfy every enabled filter to be highlighted.
- A persistent note below the filter list reads: *"Filters combine with AND — nodes must match all enabled filters."*
- A live **"N nodes match"** count appears at the top of the Filters tab and updates as filters change.
- A **"Clear all filters"** button at the top of the Filters tab resets all filter controls to their defaults and unchecks all filter enable checkboxes.

### Node highlight states

| State | Color | Condition |
|---|---|---|
| Default (no filters active) | `#94a3b8` (slate-400) | No filters are enabled |
| Highlighted | `#93c5fd` (blue-300) | Node passes all enabled filters |
| Grayed-out | `#e2e8f0` (slate-200) | Node fails any enabled filter |
| Selected | `#3b82f6` (blue-500) with 2px ring | Node whose tooltip is currently open |

When no filters are enabled, all nodes show the **default** color (`#94a3b8`), not the highlighted color. This makes the neutral state visually distinct from the "everything passes" filtered state.

### Edge highlight states

| State | Color | Condition |
|---|---|---|
| Default | `#94a3b8` (slate-400) | No filters active |
| Active | `#94a3b8` (slate-400) | Both endpoint nodes are highlighted |
| Grayed-out | `#e2e8f0` (slate-200) | At least one endpoint node is grayed-out |

### Behavior rules

- Any filter change updates node and edge colors immediately (subject to debounce on continuous controls; see Property Types section).
- Filter and color changes **never restart the simulation or remount Sigma**. Use `graph.updateEachNodeAttributes()` + `sigma.refresh()` only.
- Switching between the Filters and Stats tabs does not change node/edge highlight state.
- **Zero-match empty state:** When all enabled filters produce 0 matching nodes, the canvas remains visible (all nodes grayed out) and a persistent banner is displayed: *"No nodes match the current filters."* with a "Clear all filters" button.

### Interaction with Color Gradient mode

When a property is selected in the **Color** tab, the color gradient **overrides** the default/highlighted colors for active (non-grayed-out) nodes only:

- **Active nodes** (passing all enabled filters): colored by gradient — normal highlight color (`#93c5fd`) is replaced by the gradient color for that node's value.
- **Grayed-out nodes** (failing any enabled filter): still rendered as `#e2e8f0` — the gradient does not apply.
- **Selected node** (tooltip open): still receives its 2px ring in `#3b82f6` on top of its gradient color.
- When the Color tab's property selector is cleared (set to none), nodes revert to normal filter-based colors.
- Switching to the Filters or Stats tab does **not** disable the color gradient — it persists until the user clears the property selection.

### Filter panel collapse

- Each filter panel has a **chevron icon** (▾/▶) at the right end of its header row. Clicking the chevron (not the checkbox or label) toggles collapse.
- **Collapsed state:** Header row remains visible showing the property name, type badge, enable/disable checkbox, and chevron. Filter controls are hidden. The checkbox remains fully interactive in the collapsed state.
- **Expanded state:** Full filter control is shown beneath the header.
- **Initial state:** All panels expanded.
- At 10+ properties, the Filters tab scrolls independently.
- Active filter indicator (colored dot on collapsed header when filter has non-default values): **post-MVP**.

---

## Simulation Controls

### Buttons

- **Run** and **Stop** are two separate buttons, always visible. The inactive button is grayed out (Run is grayed while simulating; Stop is grayed while stopped).
- When the simulation is running, a subtle **"Simulating…"** label with a pulsing indicator appears near the buttons.

### Sliders

| Control | Maps to | Default | Range | Scale |
|---|---|---|---|---|
| Gravity | FA2 `gravity` | 1.0 | 0.1 – 10.0 | Log |
| Speed | FA2 `scalingRatio` | 1.0 | 0.1 – 10.0 | Log |

Slider changes take effect immediately on the running simulation: `stop()` → update settings → `start()`.

### Randomize Layout button

- Label: **"↺ Randomize Layout"** (not "Reset" — "Randomize Layout" accurately describes the action).
- Action: `stop()` → randomize all node positions → `start()` → fit camera to graph.

### Large-graph warning

When the user presses **Run** on a graph with more than **10,000 nodes**, a confirmation dialog is shown:

> **Large graph detected**
> This graph has N nodes. ForceAtlas2 may take a long time to converge and the canvas may appear dense. Continue?
>
> [Cancel] [Run anyway]

### Layout behavior at 50k nodes

- At full zoom-out, a 50,000-node graph will render as a dense cluster. This is expected and acceptable.
- Node radius at full zoom-out will be 1–2px. Clicking within a small radius of a visible node still triggers tooltip selection for the nearest node (via Sigma's node reducer click zone, larger than visual radius).
- There is no time limit on the simulation. Users stop it manually when the layout looks useful.

---

## Stats View

The right sidebar has two tabs: **Filters** and **Stats**. The Stats tab is always accessible regardless of filter state.

### Always visible

- **Nodes (total)** — count of all nodes in the graph.
- **Nodes (filtered)** — count of nodes currently passing all enabled filters (i.e. highlighted nodes). Updates live as filters change.

### Property analysis (number properties only)

A dropdown lists all **number-type** properties. When one is selected, statistics are computed over the **filtered nodes** (nodes passing current filters) for that property:

| Stat | Description |
|---|---|
| Min | Minimum value |
| Max | Maximum value |
| Average | Arithmetic mean |
| Median | P50 |
| P25 | 25th percentile |
| P75 | 75th percentile |

A **histogram** is shown below the stats, computed over the filtered nodes' values using a **smart variable bucket algorithm** (Sturges' rule or Freedman-Diaconis estimator — not a fixed count). Each histogram bar shows a tooltip on hover with the bucket range and node count (e.g. "23.4 – 31.1: 48 nodes").

**Scope note:** Stats and histogram cover number properties only in v1. String and date distribution charts are post-MVP.

### Behavior

- If no number properties exist in the data, the dropdown is hidden and only the node counts are shown.
- If the selected property has no values among filtered nodes (e.g. all null), stats are shown as `—`.
- Stats and histogram update live as filters change.

---

## Node Color Gradient

The right sidebar has a third tab: **Color**. It lets the user map a single property to a color gradient applied across all active (non-grayed-out) nodes.

### Controls

- **Property selector** — dropdown listing all properties of any type. Selecting "None" (default) disables the gradient.
- **Palette selector** — dropdown listing available color schemes. Default: Viridis.

Available palettes: Viridis, Plasma, Blues, Reds, Rainbow, RdBu (diverging).

### Coloring behavior by property type

| Property type | Gradient behavior |
|---|---|
| **Number** | Continuous gradient mapped linearly across `[min, max]` of the property among active nodes. |
| **Date** | Same as number — the ISO date string is converted to milliseconds since epoch (`new Date(s).getTime()`) **at display time only** to compute gradient position. Stored values remain ISO strings. |
| **Boolean** | Binary: `false` nodes get the low-end palette color; `true` nodes get the high-end palette color. |
| **String** | Each distinct string value is assigned a unique color from the palette. Nodes sharing the same value share the same color. If the number of distinct values exceeds the palette's capacity (typically 8–12 colors), colors are reused with a console warning. |

### Gradient legend

A horizontal gradient bar is displayed beneath the palette selector showing the color ramp, with the min and max values labelled at either end. For boolean and string types, a discrete legend (colored chips with value labels) is shown instead.

### Behavior rules

- The gradient is computed over **active nodes only** (nodes passing all enabled filters). Grayed-out nodes stay `#e2e8f0`.
- The gradient updates live when filters change (active node set changes) or when a new property or palette is selected.
- When no property is selected, the Color tab shows: *"Select a property to visualise node colors."*
- If the selected property has no values among active nodes, the gradient is not rendered and the message "No data for selected property" is shown.

---

## Node Tooltip

- Opens when a node is clicked. The clicked node gains a **selected visual state** (blue-500, 2px ring) so its position on the canvas is clear.
- If a tooltip is already open, it **instantly repositions** to the newly clicked node (no slide or transition animation).
- Closes when the user clicks the **× close button**, clicks outside the tooltip, or presses **Escape**. When the tooltip closes, the selected node returns to its normal highlight state.
- When the tooltip closes via Escape or outside click, focus returns to the canvas.
- Positioned absolutely over the canvas, clamped to stay within canvas bounds.

### Content

- Node's `label` as a heading (or node `id` if no label).
- Table of all property key/value pairs, alphabetically sorted.
- Each row shows:
  - **Line 1:** Formatted value (primary text)
  - **Line 2:** Raw value (smaller, muted secondary text)

**Formatted values:**
- Numbers: rounded to 2 decimal places (e.g. `91.50`)
- Dates: `"2021-03-15 · 1,423 days ago"`
- Strings: shown as-is
- Booleans: `true` / `false`

**Raw values** (second line):
- Numbers: full-precision original (e.g. `91.5`)
- Dates: original ISO string (e.g. `2021-03-15`)
- Strings: identical to formatted
- Booleans: identical to formatted

---

## Graph Export

A **"↓ Download Graph"** button in the left sidebar (below GRAPH INFO) exports the current graph as a `.json` file.

### Exported format

The exported file is a valid graph JSON conforming to schema version `"1"`, with each node enriched with its current canvas position:

- All original node fields (`id`, `label`, `properties`) are preserved exactly.
- `x` and `y` (numbers) are added to each node with the node's current position in Sigma's graph coordinate space.
- All original edge fields are preserved exactly.

The exported file can be re-imported into the app. When re-imported, the saved positions are honoured (see Position-Aware Loading) so the layout is restored exactly.

### Button state

- The button is always visible once a graph is loaded.
- It is available before the simulation has ever been run (positions will be the random initial coordinates).
- The downloaded filename is the original loaded filename with `-positioned` appended before the extension (e.g. `my-graph.json` → `my-graph-positioned.json`).

---

## Visual Design

### Canvas

- **Background:** `#f8fafc` (slate-50) — very light gray.

### Node colors

| State | Color | Hex |
|---|---|---|
| Default (no filters active) | Neutral slate | `#94a3b8` |
| Highlighted (passes all enabled filters) | Light blue | `#93c5fd` |
| Grayed-out (fails any enabled filter) | Pale slate | `#e2e8f0` |
| Selected (tooltip open) | Blue-500 with 2px ring | `#3b82f6` |

### Edge colors

| State | Hex |
|---|---|
| Default | `#94a3b8` |
| Grayed-out | `#e2e8f0` |

- Edges are drawn as straight lines.
- Edge width: 1px (default), 0.5px for grayed-out.
- No arrowheads.
- Edge labels: stored in data but **not rendered** in v1. Architecture must leave a clean extension point for future edge label rendering.

### Node rendering

- Default node radius: 5px.
- Node labels appear when the node's rendered radius exceeds **8px** on screen (i.e. when sufficiently zoomed in). No labels are rendered below this threshold.
- When filters are active, **highlighted nodes** are rendered at **1.15× the default radius** to reinforce the color difference (accessibility for color vision deficiencies).

### Sidebar layout

- **Left sidebar width:** 240px.
- **Right sidebar width:** 300px.

Left sidebar sections, top to bottom:
1. **"Load new file"** — secondary/ghost button, small, muted.
2. **Section header: SIMULATION**
3. Run + Stop buttons (side by side), "Simulating…" indicator when running.
4. Gravity slider with label and current value.
5. Speed slider with label and current value.
6. "↺ Randomize Layout" button.
7. **Section header: GRAPH INFO**
8. Nodes: N / Edges: N counts.
9. **"↓ Download Graph"** — secondary/ghost button.

### Typography

| Element | Size | Weight | Notes |
|---|---|---|---|
| Canvas node labels | 12px | Regular | Scales with zoom |
| Sidebar body text | 14px | Regular | System-ui |
| Section headers | 11px | Semibold | Uppercase, muted |
| Stat values | 14px | Regular | Tabular numerals (`font-variant-numeric: tabular-nums`) |
| Tooltip heading | 16px | Semibold | |
| Tooltip row labels | 13px | Regular | |
| Tooltip raw value | 11px | Regular | Muted |

### Type badges

Each filter panel header shows the property type as a small pill badge (e.g. `number`, `string`, `date`, `boolean`). Badge styling: rounded, lowercase, muted background (slate-100), small font (11px). The badge remains visible in the collapsed panel header.

### Filename display

After a file is loaded, the filename is shown in small muted text (`#94a3b8`, 12px) in the top-left corner of the canvas. Example: `my-graph.json`.

---

## Accessibility

### Keyboard navigation (MVP scope)

- **Escape** closes the open tooltip.
- **Tab** moves focus through sidebar controls in logical order.
- Range slider handles respond to **arrow keys** (Left/Right to move by one step; Shift + arrow for larger increments).
- String filter dropdown supports **Up/Down arrow** keys to navigate options, **Enter** to select, **Escape** to close.
- Boolean toggle responds to **arrow keys** to cycle states.

### Screen reader

- The "Nodes (filtered)" count in both the Filters and Stats tabs uses `aria-live="polite"` so screen readers announce updates.

### Focus management

- When a tooltip opens, focus moves into the tooltip.
- When the tooltip closes, focus returns to the canvas.

### Color accessibility

- Highlighted nodes are rendered at 1.15× radius to supplement the color difference (see Node rendering above).
- The contrast ratio between highlighted (`#93c5fd`) and grayed-out (`#e2e8f0`) nodes must be verified against the canvas background (`#f8fafc`).

---

## Performance

Performance is a first-class requirement. The app must feel instantaneous at every interaction — sluggishness is a bug.

### Targets

| Scenario | Target |
|---|---|
| File parse + graph render | < 2s for 50,000 nodes |
| Filter change → node recolor | < 100ms after debounce completes |
| Continuous control debounce | 150ms (slider drag, date picker) |
| Simulation frame rate | 60fps while running |
| Canvas pan / zoom response | 60fps, no jank |
| Stats + histogram recompute | < 100ms on filter change |
| App initial load (blank state) | < 1s |

### Constraints

- **FA2 simulation must run in a Web Worker** — never on the UI thread. The canvas must remain responsive while the simulation is running.
- **Node color updates must not remount Sigma** — use `graph.updateEachNodeAttributes()` + `sigma.refresh()` only.
- **Label rendering is threshold-gated** — labels are only rendered when a node's visual radius exceeds 8px, critical for 50k node performance.
- **Filter and stats computation must be synchronous and cheap** — no async work, no full graph traversals on every keypress. Pre-compute numeric values per property on file load; recompute only what changes.
- **String filter search must not block the UI** — prefix matching against thousands of distinct values must complete within a single frame.

---

## Error Handling

### File validation errors

| Scenario | Behaviour |
|---|---|
| Invalid JSON | "Invalid JSON file" |
| Missing or unknown `version` | "Unsupported schema version" |
| Missing `nodes` or `edges` | "File must contain `nodes` and `edges` arrays" |
| Node missing `id` | Skip node, `console.warn` |
| Edge to unknown node id | Skip edge, `console.warn` |
| Empty graph (0 nodes) | "Graph has no nodes to display" |
| Property value not number, string, or boolean | Treat as null (replaced with default), `console.warn` |
| Date string fails `new Date()` parse | Treat as null (replaced with default), `console.warn` |
| Sigma mount fails | Catch in `useEffect`, render fallback error |
| Tooltip positioned off-canvas | Clamp position within canvas bounds |

### Error state transitions

- When a file drop fails validation, the **error is shown inline** on the drop zone or canvas area.
- If a valid graph was previously loaded, it **remains visible** — the error does not replace it.
- The drop zone **re-enables immediately** after a validation error, so the user can drop a corrected file.
- The error message persists until the user drops a new file (success or failure) or refreshes the page.
- The error message does not include a manual dismiss button.

---

## Filters Tab Empty State

When the loaded graph has no node properties at all (i.e. all nodes have `properties: {}` or omit `properties`), the Filters tab shows:

> *No properties.*

The Stats tab still shows node/edge counts. The property analysis dropdown is hidden.

---

## Definition of Done

1. `npm run dev` starts on `http://localhost:5173` with hot reload
2. Dropping a valid JSON file renders the graph; the drop zone shows a spinner while parsing
3. If any null property values were replaced with defaults, a blocking modal appears with the total replacement count; user may cancel (keeping current graph) or confirm (graph loads with defaults)
4. If no null values exist, the null-default modal does not appear
5. Dropping a file while a previous graph is loaded shows a confirmation dialog; cancelling keeps the current graph intact
6. Dropping a file while the simulation is running stops the simulation before resetting state
7. Node labels appear when zoomed in past the 8px radius threshold
8. Canvas supports zoom (scroll/double-click), pan (drag), and on-screen +/−/fit buttons
9. On file load and after Randomize Layout, the camera fits to graph
10. Run and Stop are two separate buttons; the inactive one is grayed out; a "Simulating…" indicator appears when simulation is running
11. Gravity and Speed sliders affect simulation in real time (stop → update → start)
12. Randomize Layout re-randomizes positions, restarts the simulation, and fits camera to graph
13. Graphs with more than 10,000 nodes prompt a confirmation dialog before simulation starts
14. Right sidebar has **Filters**, **Stats**, and **Color** tabs
15. Each property in the Filters tab shows the correct filter control (slider / multi-select / date pickers / boolean toggle) with a type badge
16. Each filter has an enable/disable checkbox; disabled filter controls are dimmed and inert
17. A live "N nodes match" count appears at the top of the Filters tab and updates as filters change
18. A "Clear all filters" button at the top of the Filters tab resets all filter controls and unchecks all checkboxes
19. Each filter panel is collapsible via a chevron icon; the collapsed header shows the property name, type badge, and checkbox (all interactive)
20. When no filters are active, nodes show the neutral default color (`#94a3b8`); when filters are active, nodes passing all filters are highlighted (`#93c5fd`) and others are grayed out (`#e2e8f0`)
21. When 0 nodes pass the active filters, a "No nodes match the current filters" banner appears with a "Clear all filters" button
22. Edges connecting to a grayed-out node are also grayed out
23. Highlighted nodes are rendered at 1.15× the default radius
24. Switching between Filters and Stats tabs does not change node/edge highlight state
25. Stats tab always shows total node count and filtered node count
26. Selecting a number property in the Stats tab shows min, max, average, median, P25, P75 and a histogram — computed over filtered nodes only
27. Stats and histogram update live as filters change; hovering a histogram bar shows a tooltip with the bucket range and count
28. Clicking a node opens a tooltip; the node gains a selected visual state (blue ring)
29. The tooltip shows formatted property values with raw values as smaller secondary lines beneath each row
30. The tooltip has a close button (×); clicking it closes the tooltip and clears the selected node state
31. Clicking a second node instantly repositions the tooltip to that node
32. Clicking outside the tooltip or pressing Escape closes the tooltip
33. Invalid files show a readable inline error; the previously loaded graph remains visible; the drop zone re-enables immediately
34. If the loaded graph has no properties, the Filters tab shows "No properties."
35. The canvas accepts file drops after initial load; dragging a file over the window shows a "Drop to load new graph" overlay
36. A "Load new file" button is visible in the top of the left sidebar once a graph is loaded
37. The filename is displayed in muted text on the canvas after file load
38. If a loaded file contains `x` and `y` on all nodes, those positions are used on render and no random layout is applied
39. If a loaded file contains `x` and `y` on some nodes, positioned nodes use their coordinates and unpositioned nodes are placed randomly near the graph centroid
40. The Color tab property selector lists all properties; selecting one applies a gradient to active nodes; grayed-out nodes remain `#e2e8f0`
41. The Color tab palette selector changes the color scheme applied to active nodes
42. The gradient legend updates to show the correct color ramp and min/max (or discrete chips for boolean/string) for the selected property
43. The gradient updates live when filters change or a new property/palette is selected
44. Switching tabs (Filters, Stats, Color) does not clear the gradient — it persists until the user clears the property selection
45. The "↓ Download Graph" button exports a valid schema-version-"1" JSON file with `x` and `y` added to each node
46. Re-importing an exported file restores the node positions exactly
47. App does not crash or freeze on 50,000 nodes
48. `npm run test` green
49. `npm run test:e2e` green
50. `npm run lint` exits with zero errors
51. All exported symbols have JSDoc

---

## What NOT to Build

| Feature | Rationale |
|---|---|
| Node size encoding by property | Out of scope for v1; binary color highlighting is sufficient |
| Multi-node selection | Out of scope; single-node inspection covers the use case |
| Neighbor highlighting (show only clicked node's neighbors) | Out of scope for v1 |
| Expanded histogram modal | Post-MVP. No "(click to expand)" affordance in the UI. |
| String/date distribution charts in Stats tab | Post-MVP (v1.1+); number stats only in v1 |
| Active filter indicator (colored dot on collapsed panel) | Post-MVP |
| Edge weight visualization | Out of scope |
| Directed edges / arrowheads | Out of scope; all edges are undirected |
| Edge label rendering | Not rendered in v1; architecture must allow future extension |
| Image / CSV export | Out of scope; only JSON graph export (with positions) is supported |
| Undo/redo | Out of scope |
| Routing / multi-page | Out of scope; single-page app |
| Backend / API calls | Out of scope; fully client-side |
| Session persistence (localStorage, URL hash) | Out of scope; refresh resets state |
| Multi-graph support | Out of scope; new file replaces current graph |
| Mobile / touch-only support | Out of scope; desktop MacBook only |
| Canvas rotation | Not supported in Sigma.js v3 |
| Community detection / clustering visualization | Post-MVP |
| React Testing Library component tests | E2E covers UI; unit tests cover pure lib/ functions only |

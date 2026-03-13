# Graph Visualizer — Product Specification

Single-page app that lets a user load a JSON graph file, position it with a force-directed simulation, and filter nodes by their properties.

---

## Interaction Flow

1. **Load** — user drops a `.json` file onto the full-screen drop zone. File is validated against the versioned schema; errors are shown inline. Once a graph is loaded, a "Load new file" button remains accessible; dropping a new file (or clicking the button) resets the entire app state and starts from scratch.
2. **Simulate** — user hits Run in the left sidebar. ForceAtlas2 positions the nodes. User tunes Gravity/Speed sliders until the layout looks good, then stops.
3. **Explore** — user zooms, pans, and navigates the canvas using mouse/trackpad or on-screen controls (see Canvas Navigation).
4. **Filter** — right sidebar shows one filter panel per node property. Each filter can be individually toggled on or off. Only enabled filters participate in highlighting. Multiple enabled filters combine with logical AND. Nodes matching all enabled filters are highlighted; all others are grayed out. Edges connected to at least one grayed-out node are also grayed out.
5. **Inspect** — clicking a node opens a floating tooltip showing all its properties. Clicking a second node moves the tooltip to that node.

---

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  [Drop Zone — full screen until graph is loaded] │
└─────────────────────────────────────────────────┘

After file is loaded:

┌──────────────┬──────────────────────┬──────────────────────────────┐
│  Left        │                      │  Right Sidebar               │
│  Sidebar     │   Sigma canvas       │  [ Filters | Data ]  ← tabs  │
│  [▶ Run /    │   (fills space)      │                              │
│   ⏹ Stop]    │                      │  ── Filters tab ──           │
│              │                      │  ☑ age          (number)     │
│  Gravity     │                      │    [●────────●]              │
│  [────●────] │                      │     12        45             │
│              │                      │                              │
│  Speed       │                      │  ☑ status       (string)     │
│  [────●────] │                      │    [active ✕][pending ✕]    │
│              │                      │    [Search...        ]       │
│  [↺ Reset]   │                      │                              │
│              │                      │  ☑ joined       (date)       │
│  Nodes: N    │                      │    after  [2021-01-01]       │
│  Edges: N    │                      │    before [2024-12-31]       │
│              │                      │                              │
│              │                      │  ☑ active       (boolean)    │
│              │                      │    ● true  ○ false  ○ either │
└──────────────┴──────────────────────┴──────────────────────────────┘

┌──────────────┬──────────────────────┬──────────────────────────────┐
│  ...         │                      │  Right Sidebar               │
│              │                      │  [ Filters | Data ]  ← tabs  │
│              │                      │                              │
│              │                      │  ── Data tab ──              │
│              │                      │  Nodes (total):    142       │
│              │                      │  Nodes (filtered):  38       │
│              │                      │                              │
│              │                      │  Analyse  [score      ▾]     │
│              │                      │                              │
│              │                      │  Min      12.3               │
│              │                      │  Max      99.1               │
│              │                      │  Average  54.6               │
│              │                      │  Median   51.2               │
│              │                      │  P25      34.7               │
│              │                      │  P75      71.8               │
│              │                      │                              │
│              │                      │  [▆▃█▅▂▇▄▃]  ← histogram    │
│              │                      │  (click to expand)           │
└──────────────┴──────────────────────┴──────────────────────────────┘

Node click → floating popover anchored to the clicked node:
┌──────────────────┐
│ Alice            │
│ ────────────     │
│ age     34       │
│ score   91.5     │
│ joined  2021-03-15│
│         (1,423d) │
└──────────────────┘
```

---

## Canvas Navigation

### Mouse / trackpad interactions (built-in via Sigma.js)

| Action | Interaction |
|---|---|
| Zoom in/out | Scroll wheel / trackpad two-finger scroll |
| Zoom in | Double-click on canvas |
| Pan | Click and drag on empty canvas area |
| Touch zoom | Pinch / spread (trackpad or touchscreen) |

### On-screen controls (buttons)

Displayed as a small button group overlaid on the canvas (bottom-right corner):

| Button | Action |
|---|---|
| `+` | Zoom in |
| `−` | Zoom out |
| ⊡ | Fit graph to screen (reset zoom/pan to show all nodes) |

### Rotation

Canvas rotation is **not supported** in Sigma.js v3 (planned for v4). Rotation is out of scope for this version.

### Target viewport

Designed for **14-inch and 16-inch MacBooks** (approximately 1440×900 to 1728×1080 logical pixels). No mobile or touch-only support required.

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
- `properties` (optional, object) — key/value pairs for filtering. Supported value types: `number`, `string`, ISO 8601 date string, or `boolean`.

**Edge fields:**
- `source`, `target` (required, string) — node IDs
- `label` (optional, string)

All nodes should have the same property keys. Missing values for a selected property are treated as `null`.

**Example:**
```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15" } },
    { "id": "2", "label": "Bob",   "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02" } }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

---

## Property Types & Filter Controls

Property types are auto-detected from the values present across all nodes.

### Number
- Filter UI: dual-handle range slider initialised to `[min, max]` across all nodes.
- A node passes if its value is within the selected range (inclusive).

### String
- Filter UI: a text search input with prefix matching. As the user types, a dropdown shows up to 10 matching distinct values. The user selects values to include; selected values appear as removable tags above the input.
- A node passes if its value is one of the selected values.
- A `null` value for this property is treated as an empty string `""` for all filtering purposes.
- Default state: all values selected (no filtering).

### Date
- Auto-detected when the majority of non-null values are valid ISO 8601 date strings.
- Filter UI: two date pickers — **after** (inclusive) and **before** (inclusive). Either bound is optional.
- A node passes if its date falls within the selected range.
- Tooltip displays both the original date string and elapsed duration (e.g. `"2021-03-15 · 1,423 days ago"`).

### Boolean
- Filter UI: three-way toggle — **true**, **false**, or **either** (no filter). Default: either.
- A node passes if its value matches the selected state (or either is chosen).

---

## Filtering & Highlighting Behavior

- Each filter panel has an **enable/disable toggle** (checkbox). Disabled filters are ignored entirely.
- All enabled filters combine with **logical AND** — a node must satisfy every enabled filter to be highlighted.
- A node is **highlighted** (`#93c5fd`, light blue) when it satisfies all enabled filters.
- A node is **grayed out** (`#e2e8f0`, slate-200) when it fails any enabled filter, or has a `null` value for any enabled filter's property.
- When no filters are enabled, all nodes are highlighted.
- Any filter change updates node colors immediately without restarting the simulation or remounting Sigma.
- **Edges** — an edge is grayed out (`#cbd5e1`) if at least one of its endpoint nodes is grayed out. Otherwise it uses the default edge color.
- The highlighted/grayed state of nodes and edges is **not affected** by switching between the Filters and Data tabs. It only changes when a filter value is modified or filters are reset.

---

## Data View

The right sidebar has two tabs: **Filters** and **Data**. The Data tab is always accessible regardless of filter state.

### Always visible

- **Nodes (total)** — count of all nodes in the graph.
- **Nodes (filtered)** — count of nodes currently passing all enabled filters (i.e. highlighted nodes). Updates live as filters change.

### Property analysis (optional)

A dropdown lists all **number-type** properties only. When one is selected, statistics are computed over the **filtered nodes** (nodes passing current filters) for that property:

| Stat | Description |
|---|---|
| Min | Minimum value |
| Max | Maximum value |
| Average | Arithmetic mean |
| Median | P50 |
| P25 | 25th percentile |
| P75 | 75th percentile |

A small inline histogram is shown below the stats, bucketed across the filtered nodes' values.

**Expanded histogram (non-MVP):** Clicking the histogram opens a modal with a larger, more readable version of the same histogram.

### Behavior notes

- If no number properties exist in the data, the dropdown is hidden and only the node counts are shown.
- If the selected property has no values among filtered nodes (e.g. all null), stats are shown as `—`.
- Stats and histogram update live as filters change.

---

## Node Tooltip

- Opens when a node is clicked. If a tooltip is already open, it moves to the newly clicked node.
- Closes when the user clicks outside the tooltip or presses Escape.
- Positioned absolutely over the canvas, clamped to stay within canvas bounds.
- Displays the node's `label` as a heading, followed by a table of all property key/value pairs.
- **Formatted values** are shown by default:
  - Numbers: rounded to 2 decimal places
  - Dates: shown as `"2021-03-15 · 1,423 days ago"`
  - Strings: shown as-is
  - Booleans: shown as `true` / `false`
- **Raw values** are revealed on hover over each row (e.g. via a tooltip-on-tooltip or a subtle secondary label).

---

## Performance

Performance is a first-class requirement. The app must feel instantaneous at every interaction — sluggishness is a bug.

### Targets

| Scenario | Target |
|---|---|
| File parse + graph render | < 2s for 50,000 nodes |
| Filter change → node recolor | < 100ms (imperceptible) |
| Simulation frame rate | 60fps while running |
| Canvas pan / zoom response | 60fps, no jank |
| Stats + histogram recompute | < 100ms on filter change |
| App initial load (blank state) | < 1s |

### Constraints

- **FA2 simulation must run in a Web Worker** — never on the UI thread. The canvas must remain responsive while the simulation is running.
- **Node color updates must not remount Sigma** — use `graph.updateEachNodeAttributes()` + `sigma.refresh()` only.
- **Label rendering is throttled** — labels are only rendered when a node reaches a minimum screen size (zoomed in), critical for 50k node performance.
- **Filter and stats computation must be synchronous and cheap** — no async work, no full graph traversals on every keypress. Pre-compute numeric values per property on file load; recompute only what changes.
- **String filter search must not block the UI** — prefix matching against thousands of distinct values must complete within a single frame.

### Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid JSON | "Invalid JSON file" |
| Missing or unknown `version` | "Unsupported schema version" |
| Missing `nodes` or `edges` | "File must contain `nodes` and `edges` arrays" |
| Node missing `id` | Skip node, `console.warn` |
| Edge to unknown node id | Skip edge, `console.warn` |
| Empty graph (0 nodes) | "Graph has no nodes to display" |
| Property value not number or string | Treat as null, `console.warn` |
| Date string fails `new Date()` parse | Treat as null, `console.warn` |
| Sigma mount fails | Catch in `useEffect`, render fallback error |
| Tooltip positioned off-canvas | Clamp position within canvas bounds |

---

## Definition of Done

1. `npm run dev` starts on `http://localhost:5173` with hot reload
2. Dropping a valid JSON file renders the graph; dropping a second file resets everything
3. Node labels appear when zoomed in
4. Canvas supports zoom (scroll/double-click), pan (drag), and on-screen +/−/fit buttons
5. Run/Stop controls the ForceAtlas2 simulation
6. Gravity and Speed sliders affect simulation in real time
7. Reset re-randomizes positions and restarts
8. Right sidebar has Filters and Data tabs
9. Each property in the Filters tab shows the correct filter control (slider / multi-select / date pickers / boolean toggle) with a type badge
10. Each filter has an enable/disable toggle; disabled filters have no effect
11. Nodes outside any enabled filter are grayed out; nodes passing all enabled filters stay light blue; updates in real time
12. Edges connecting to a grayed-out node are also grayed out
13. Switching between Filters and Data tabs does not change node/edge highlight state
14. Data tab always shows total node count and filtered node count
15. Selecting a number property in the Data tab shows min, max, average, median, P25, P75 and a histogram — computed over filtered nodes only
16. Stats and histogram update live as filters change
17. Clicking a node opens a tooltip showing formatted property values; hovering a row reveals the raw value
18. Clicking a second node moves the tooltip to that node
19. Clicking outside / pressing Escape closes the tooltip
20. Invalid files show a readable error
21. App does not crash or freeze on 50,000 nodes
22. `npm run test` green
23. `npm run test:e2e` green
24. `npm run lint` exits with zero errors
25. All exported symbols have JSDoc

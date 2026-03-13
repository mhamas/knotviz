# Graph Visualizer — Design Feedback

**Reviewer:** Senior UX/Product Designer
**Date:** 2026-03-12
**Spec version reviewed:** Product Specification (current)

---

## Executive Summary

The spec describes a functional prototype with a sensible three-column layout and reasonable feature scope. The interaction model is mostly sound, but there are several meaningful design gaps — particularly around filtering feedback, the tooltip design, visual language for node states, and the complete absence of keyboard navigation. These are not polish items; several of them will make the tool actively confusing for first-time users. The good news: the scope is tight enough that addressing these gaps is achievable without ballooning the MVP.

---

## 1. Information Architecture & Layout Critique

### Left Sidebar: Too narrow a purpose, underused vertical space

The left sidebar exists solely for simulation controls — Run/Stop, two sliders, Reset, and node/edge counts. That's five interactive elements and two statistics. On a 1440px screen, this sidebar will either be uncomfortably narrow (wasting real estate) or padded with dead space that sends a "something is missing" signal to users.

**Issues:**
- Nodes/Edges counts are buried at the bottom of the left sidebar, separated from the Data tab where the filtered count lives. A user looking for "how many nodes?" will find two different counts in two different places. The relationship between them is not self-evident.
- The left sidebar has no clear hierarchy. "Run/Stop" is an action; "Gravity/Speed" are parameters; "Reset" is a destructive action; "Nodes: N / Edges: N" are metadata. Visually treating all five things the same flattens importance.
- The spec shows "Load new file" as a button that "remains accessible" but never specifies *where* it lives. Omitting it from the layout diagram is a gap — if it ends up in the left sidebar, that changes the information architecture meaningfully.

**Recommendations:**
- Give the left sidebar a label or section headers to separate "Simulation" from "Graph Info."
- Promote the Nodes/Edges counts to a small persistent header bar below the graph title (or above the canvas) so they are globally visible alongside the filtered count.
- Explicitly place the "Load new file" button — top of left sidebar, small and secondary — so it doesn't float or end up as an afterthought.

### Right Sidebar: Tab structure is functional but the tab labels are weak

"Filters" and "Data" are accurate but generic. "Data" in particular is ambiguous — a user who has never seen this tool doesn't know whether "Data" means the raw graph data, the imported file, or statistics.

**Recommendations:**
- Rename "Data" to "Stats" or "Analysis." Either communicates intent immediately.
- Consider whether the two tabs should really be a single scrollable panel for small property sets. With 2–3 properties, maintaining tab state is friction for no payoff. Tabs add value when content doesn't fit together — with larger graphs it earns its keep, but that's a scale problem worth calling out explicitly.

### Canvas: No persistent context about what's loaded

Once a graph is loaded, the canvas fills the center. But there is no persistent label, file name, or graph title displayed anywhere. Users who open the tool, load a file, and return later have no way to confirm which file they're looking at without re-examining the nodes.

**Recommendation:** Add a subtle, non-intrusive file name or graph label in a corner of the canvas or the top bar. Even "sample-graph.json" as muted gray text is enough.

### The "load new file" state transition is abrupt

The spec says dropping a new file "resets the entire app state and starts from scratch." There is no confirmation dialog, no undo, no warning. For a user who has spent time positioning and filtering a graph, this is a destructive surprise.

**Recommendation:** If a graph is already loaded and the user drops a new file (or clicks "Load new file"), show a one-line confirmation: "Loading a new file will clear the current graph. Continue?" with a single confirm button. This adds one click in an edge case but prevents one very frustrating accident.

---

## 2. Interaction Design Concerns

### Filtering UX: The enable/disable toggle pattern has a discoverability problem

The spec uses a checkbox to enable or disable each filter panel. This is a reasonable pattern, but it creates a subtle cognitive issue: when a filter is *disabled*, its controls are presumably still visible (the range slider, the date pickers, etc.). Users will attempt to interact with those controls and wonder why nothing happens.

**Specific issues:**
- The spec does not state whether disabled filter controls are visually grayed out / inert. If they're not, users will manipulate a slider and see no effect, with no explanation.
- The boolean filter has three states ("true / false / either"). "Either" means no filter. But a user could also just uncheck the enable checkbox to disable the filter. Two different mechanisms for "no filter applied" will confuse users.
- For string filters, the default state is "all values selected (no filtering)." This is invisible — the user sees tags for every value, which looks like active filtering rather than a neutral baseline. Consider defaulting to no tags selected with an explicit "filter to specific values" affordance.

**Recommendations:**
- When a filter is disabled (checkbox unchecked), dim the entire filter control area (50% opacity, pointer-events: none). Make this visually explicit.
- Remove the "either" state from the boolean toggle if the enable/disable checkbox already covers the same ground. Or remove the checkbox from boolean filters entirely, using the three-way toggle as the only mechanism.
- For string filters, reconsider the default. Either show a "no restriction" placeholder state (no tags, no filtering) or show all values selected with a clear "Clear all" button.

### Filtering UX: AND logic needs to be surfaced

The spec specifies that multiple enabled filters combine with logical AND. This is not communicated anywhere in the UI. A user enabling two filters — say, age > 30 AND status = "active" — will see nodes disappear and have no way to understand why unless they already know about AND logic.

**Recommendation:** Add a small, persistent note below the filter list: "Filters combine with AND — nodes must match all enabled filters." This can be muted/secondary text. One sentence prevents a support question.

### Tooltip: The tooltip-on-tooltip pattern is a UX smell

The spec says raw values are "revealed on hover over each row (e.g. via a tooltip-on-tooltip or a subtle secondary label)." A tooltip triggered by hovering a row inside a floating tooltip is a deeply awkward interaction on every platform. It will be nearly impossible to trigger reliably on touchpads, it will fight with the tooltip's own positioning logic, and it adds cognitive overhead for something (raw values) that most users will rarely need.

**Recommendations:**
- Drop the raw value reveal entirely for the MVP. Formatted values are sufficient.
- If raw values are required, use a click-to-expand row pattern: clicking a row expands it to show the raw value below the formatted one, inline. This is reliable and requires no hover behavior.
- If the tooltip-on-tooltip pattern is kept, at minimum ensure the inner tooltip opens *above* or *to the right* of the row, never off-canvas, and that it has a reliable delay (200ms) to prevent accidental triggers.

### Tooltip: No way to dismiss without clicking outside

The spec says the tooltip closes when the user "clicks outside the tooltip or presses Escape." There is no close button on the tooltip. On dense graphs where the canvas is covered in nodes, "clicking outside the tooltip" may immediately open *another* node's tooltip. The user is trapped in tooltip state.

**Recommendation:** Add an explicit `×` close button to the tooltip. It's one element, it resolves the ambiguity, and it's standard practice for floating panels.

### Simulation controls: "Reset" is undefined in terms of consequence

The spec says "Reset re-randomizes positions and restarts." The word "Reset" in most UI contexts means "return to default values." In this context it means "randomize" — the opposite of a default. This will surprise users.

**Recommendation:** Rename "Reset" to "Randomize" or "Shuffle Layout." The button's action should match its label's common mental model.

### Simulation controls: No feedback while simulation is running

A ForceAtlas2 simulation on a large graph can run for a noticeable amount of time. The spec's Run/Stop button tells users when it's running, but there is no secondary indicator that the graph is actively moving. Users who load a graph and hit Run may not see immediate movement (nodes may start close together) and assume it's not working.

**Recommendation:** When the simulation is running, show a subtle animated badge or pulsing indicator near the Run/Stop button ("Simulating..."). This costs nothing to implement and prevents "is it working?" confusion.

### On-screen zoom controls: Poor placement for large graphs

Placing the zoom controls in the bottom-right corner of the canvas is conventional but problematic when the canvas has nodes clustered in that area. The controls will overlap node labels and require users to move them out of the way.

**Recommendation:** Consider the bottom-left corner or, better, embed the controls as a vertical pill on the left edge of the canvas (overlapping the left sidebar edge), keeping them close to the simulation controls conceptually.

---

## 3. Visual Design Gaps

### Node color scheme: Two-state highlighting is insufficient

The spec defines two node states: highlighted (`#93c5fd`, light blue) and grayed-out (`#e2e8f0`, slate-200). This is a minimal viable color scheme, but it has problems:

- The contrast between `#93c5fd` and `#e2e8f0` on a typical white or light gray canvas is very low. On a white background, slate-200 will visually disappear. Nodes that are "grayed out" may become invisible rather than de-emphasized.
- When no filters are enabled, all nodes are highlighted (`#93c5fd`). This makes the default state look like everything is "selected" rather than "no selection." It inverts the expected pattern (neutral baseline = no color; selected = highlighted).
- There is no selected/clicked state for nodes. When a user clicks a node to open a tooltip, that node has no visual differentiation from its neighbors. The tooltip appears, but the node itself doesn't visually confirm the selection.

**Recommendations:**
- Reconsider the default (no-filter) state: use a neutral medium gray or muted blue as the default node color, reserving the bright `#93c5fd` for *filtered matches*. This makes filtering feel like "surfacing" rather than "hiding."
- Add a third node color state: selected/active (the node whose tooltip is currently open). A distinct border ring or stronger blue (`#3b82f6`) communicates selection clearly.
- For the grayed-out state, use a color with enough contrast against a dark canvas background as well — `#e2e8f0` is fine on white but disappears on dark backgrounds. Specify canvas background color in the spec.
- Specify whether the canvas background is white, light gray, or dark. This is missing from the spec and affects every color decision.

### Edge visual language: Completely underspecified

The spec defines edge colors in the filtering context (grayed out = `#cbd5e1`) but says nothing about:
- Default edge color
- Edge width/thickness
- Whether directed edges have arrow heads
- How edge labels are displayed (the schema supports edge labels but the UI layout makes no mention of them)
- Whether edges are drawn as straight lines or curved (important for multi-edges)

This is a significant gap for implementation and will result in inconsistent decisions being made at the code level.

**Recommendations:**
- Define a default edge color explicitly (e.g., `#94a3b8` slate-400 — darker than the grayed state to maintain visual hierarchy).
- Specify whether edges should have directional arrows. Most graph visualizations default to directed (arrows), but the spec never mentions edge direction.
- Address edge labels: are they displayed? At what zoom level? This is in the schema but absent from the UI spec.

### Typography: Completely unspecified

The spec contains no typography decisions. Font family, font sizes for labels, sidebar text, tooltip content, stat values — all undefined. This will produce inconsistent results.

**Minimum required specification:**
- Canvas node labels: font size at 1x zoom (and whether they scale with zoom)
- Sidebar body text size
- Stat values in the Data tab (should be monospaced or tabular numerals for alignment)
- Tooltip heading vs. row text size hierarchy

### Spacing and sidebar width: No values given

The spec's ASCII layout gives no pixel dimensions. What is the left sidebar width? The right sidebar width? These decisions meaningfully affect the canvas-to-sidebar ratio and the readability of filter controls.

**Recommendation:** Specify sidebar widths (240px left, 280–320px right are reasonable starting points for this complexity level). This prevents the developer from making a guess that results in a cramped filter panel.

### Histogram: Visually underspecified

The spec shows `[▆▃█▅▂▇▄▃]` as the histogram, with "(click to expand)" as a note. No decisions are made about:
- Bar color (should it match the highlight color? A neutral gray?)
- Whether bars are labeled with bucket ranges on hover
- Whether the Y-axis shows counts or percentages
- What happens to the histogram when filtered nodes change (animated transition vs. instant redraw)

---

## 4. Accessibility Considerations

This is the largest gap in the spec. Accessibility receives zero dedicated attention.

### Keyboard navigation: Absent

There is no mention of keyboard navigation for any interactive element. Specific gaps:
- The canvas has no keyboard-navigable node selection. Users who cannot use a mouse cannot inspect any node.
- The filter sliders need explicit keyboard support (arrow keys to move handles).
- The boolean toggle needs keyboard support (arrow keys or Tab to cycle states).
- The string filter dropdown needs keyboard navigation (Up/Down arrows, Enter to select, Escape to close).
- The Escape key is mentioned for closing tooltips — this is good. It should be the *only* keyboard interaction in the spec, which is insufficient.

**Minimum required additions:**
- Tab order through sidebar controls must be specified and logical.
- Slider handles must respond to arrow keys (Left/Right, with Shift for larger increments).
- The dropdown for string values must support keyboard navigation.
- Canvas should support Tab to cycle through nodes, with Enter to open the tooltip for the focused node.

### Color as the sole differentiator

The entire filter highlighting system communicates via color alone (blue vs. gray). Users with color vision deficiencies (8% of males, 0.5% of females have some form) will struggle to distinguish highlighted from grayed-out nodes, especially with the chosen palette (`#93c5fd` vs. `#e2e8f0`).

**Recommendations:**
- Add a shape or size distinction: highlighted nodes could be rendered at a slightly larger radius (10–15% larger) to reinforce the color difference. This helps deuteranopia and protanopia users significantly.
- Ensure the contrast ratio between highlighted and grayed nodes is at least 3:1 (WCAG AA for non-text). The current palette does not meet this threshold on a white background.

### Screen reader support: Absent

The spec has no aria-label, role, or live-region specifications for any element. The dynamic node count ("Nodes (filtered): 38") should use `aria-live="polite"` so screen reader users hear updates. Filter changes should announce the number of matching nodes.

This is a prototype, but establishing even a basic aria-label pattern now prevents a full accessibility retrofit later.

### Focus management on tooltip open/close

When a tooltip opens (via node click), focus should move into the tooltip so keyboard users can read it and close it with Escape. When the tooltip closes, focus should return to the previously focused element (or the canvas). The spec does not address this.

---

## 5. Usability Issues for Large-Scale Graphs

The spec's Definition of Done includes "App does not crash or freeze on 50,000 nodes." This is a performance requirement, but it implies a corresponding design requirement: a 50,000-node graph needs different UX affordances than a 50-node graph.

### Cognitive load: Filter panels don't scale

If a graph has 20 properties, the Filters tab will show 20 filter panels. On a 1080px-tall sidebar, that's a wall of controls. The spec provides no mechanism for:
- Collapsing individual filter panels
- Sorting or searching filter panels
- Seeing at a glance which filters are currently active vs. default

**Recommendations:**
- Make each filter panel collapsible (expanded by default, collapsed when the user dismisses it).
- Add a small "active filters" summary at the top of the Filters tab: "3 filters active" with a "Clear all" button.
- Consider a "dirty" indicator on each filter panel when its values differ from the default (e.g., a blue dot on the panel header).

### Node labels at scale

At 50,000 nodes, rendering every node label simultaneously will be visually unreadable and potentially a performance issue. The spec says "node labels appear when zoomed in" (Definition of Done #3) but provides no threshold for when labels appear or disappear.

**Recommendation:** Specify a label visibility threshold: labels should be hidden when more than N nodes are visible in the current viewport, or when the node radius at current zoom falls below a minimum readable size (e.g., 8px equivalent). Sigma.js has built-in support for label rendering strategies that can handle this.

### The histogram "click to expand" affordance is hidden

The spec marks the expanded histogram as "non-MVP" but also says "(click to expand)" will appear in the UI. A clickable affordance that leads to a modal is fine, but a tiny inline histogram with no visible click target (no button border, no cursor change hint) is invisible to most users.

**Recommendation:** If the expand feature ships, add a visible `⤢` expand icon button in the top-right corner of the histogram container. If it's truly non-MVP, remove the "(click to expand)" text from the UI entirely — dangling affordances that do nothing erode trust.

### No "empty state" for filter results

When all filters are active and no nodes pass, the canvas shows every node grayed out. This looks identical to "filters applied but some nodes pass" except that 0 nodes are highlighted. The user has no clear signal that their filter combination produced zero results.

**Recommendation:** When 0 nodes pass the active filters, show a persistent banner or inline message: "No nodes match the current filters." and offer a "Clear all filters" button.

### String filter with many unique values

The spec says the string filter dropdown shows "up to 10 matching distinct values." What if a property has 10,000 unique string values (e.g., a name field)? The user would need to type a full prefix to find anything, and the "all values selected by default" state becomes conceptually broken (10,000 tags pre-selected?).

**Recommendation:** When a string property has more than 50 unique values, default to "no restriction" (no tags selected, all nodes pass) rather than "all values selected." Add a note: "Search to filter by specific values." This also scales better as a mental model.

---

## 6. Missing Affordances & Unclear Interactions

### "Load new file" button placement is unspecified

The spec mentions this button exists once a file is loaded but never shows it in the layout diagram. Where does it live? If it's in the left sidebar, it's far from the canvas where the user is working. If it's a floating overlay on the canvas, it's obtrusive.

**Recommendation:** Place a small "Load new file" button in the top-left of the left sidebar, styled as a secondary/ghost button. Keep it small and muted so it doesn't compete with the simulation controls.

### The drop zone is inaccessible after file load

The spec says the full-screen drop zone disappears once a graph is loaded. Users who want to drag-and-drop a new file onto the canvas cannot do so because the drop zone no longer covers the full screen — the canvas is now an interactive element that handles its own mouse events. Does dragging a file over the canvas trigger a new drop zone? Is there a visual affordance indicating that the canvas still accepts file drops?

**Recommendation:** Explicitly specify drag-and-drop behavior after initial load. If the canvas accepts file drops, add a visual overlay that appears when a file is dragged over the window: a dim overlay with "Drop to load new graph" text. This closes the loop for users who prefer drag-and-drop over the button.

### Filter reset per-panel vs. global

The spec has a global "Reset" button in the left sidebar (for simulation), but no reset mechanism for filters. Users who have configured 8 filter panels and want to start over have no "Clear all filters" affordance. They would need to manually uncheck or reset each panel.

**Recommendation:** Add a "Clear all" button at the top of the Filters tab. It resets all filter controls to their defaults and disables all filter panels.

### The date filter bounds are both optional

The spec says "Either bound is optional" for date filters. This is a reasonable design, but the UI shows both fields with placeholders. When both are empty, what is the filter state? Is the filter "pass all nodes" or "pass no nodes"? This ambiguity should be resolved and communicated visually.

**Recommendation:** Clarify: when a date filter is enabled but both bounds are empty, treat it as "pass all nodes" (functionally equivalent to disabled). Add a placeholder text that communicates this: "Any date" as the placeholder for both fields, so the user understands the current state.

### No indication of which node has an open tooltip

As mentioned in Section 3: when a tooltip is open, the source node has no visual selection state. On a dense graph, the user loses track of which node they clicked.

---

## 7. What's Well-Designed and Should Be Kept

**The three-column layout is the right call.** Simulation controls on the left, visualization in the center, analysis on the right matches the user's natural workflow (configure → visualize → analyze). This is a proven pattern for data exploration tools and should not be changed.

**Per-filter enable/disable toggles are excellent.** Most filtering UIs require users to remove a filter entirely to disable it. The checkbox approach lets users configure filters and toggle them on/off to compare states. This is a genuinely thoughtful feature.

**Filtering that doesn't restart the simulation is crucial.** The spec is explicit that filter changes don't remount Sigma or restart FA2. This is the correct call — layout and filtering are independent concerns, and conflating them would make the tool frustrating.

**The Data tab scope is appropriate.** Restricting property analysis to number properties only is the right constraint. Trying to provide statistics for strings or booleans would either be meaningless or require a much more complex UI. The histogram is a nice addition that fits naturally.

**Formatted + raw values in the tooltip is a good pattern.** The idea of showing human-readable formatted values by default (e.g., "1,423 days ago") with raw values available on demand is user-centric. The implementation mechanism (tooltip-on-tooltip) is the problem, not the concept.

**The versioned JSON schema is forward-thinking.** Many prototypes skip schema versioning and pay for it later. Including `version` in the schema now is good practice.

**Boolean filter "either" default is correct.** Defaulting to "either" rather than "true" or "false" means no filtering is applied until the user explicitly makes a choice. This is the right default for a passive tool.

**Escaping the simulation before slider changes (stop → update → start) is documented correctly.** This is a non-obvious implementation detail that the spec correctly calls out. It prevents subtle bugs from being introduced during implementation.

---

## 8. Prioritized Design Improvements

Ordered by user impact vs. implementation cost.

### P0 — Must fix before any user testing

1. **Specify canvas background color.** Every other visual decision depends on it. Choose it now.
2. **Add explicit visual state for disabled filter controls** (dim/inert when checkbox is unchecked). Without this, users will interact with disabled controls and see no effect.
3. **Add a node selected state** (visual difference for the node whose tooltip is open). Current spec has no way for users to know which node they clicked.
4. **Rename "Reset" to "Randomize Layout."** "Reset" communicates the wrong action.
5. **Add a "No nodes match current filters" empty state.** Silently showing a blank/all-gray canvas is confusing.

### P1 — Fix before first real user session

6. **Add a close button (`×`) to the tooltip.** Clicking outside on a dense graph will trigger another tooltip immediately.
7. **Add "AND logic" explanation to Filters tab.** One line of text prevents a major point of confusion.
8. **Specify edge visual language** (default color, direction arrows, label visibility). These will be decided at implementation time without this guidance.
9. **Add a "Clear all filters" button to the Filters tab.**
10. **Replace tooltip-on-tooltip raw value reveal** with a click-to-expand row pattern or remove it from MVP.

### P2 — Address before v1.0 release

11. **Add node size as a secondary differentiator** for highlighted vs. grayed-out states (accessibility).
12. **Specify node label visibility thresholds** for large graphs (don't render all labels at all zoom levels).
13. **Add keyboard navigation** for slider controls (arrow keys) and string filter dropdown.
14. **Define typography scale** (font sizes, font family, monospaced for stat values).
15. **Specify sidebar widths** in the layout.
16. **Filter panel collapsing:** ✅ **RESOLVED (2026-03-12)** — Individual filter panels should be collapsible so that panels the user isn't using can be collapsed, keeping the Data panel below visible. Up to ~10 properties is the typical norm; no search needed.

### P3 — Nice to have

16. **Add "active filters" summary** at the top of the Filters tab.
17. **Add per-filter panel collapse/expand** for graphs with many properties.
18. **Add loading/progress indicator** when simulation is actively running.
19. **Add a persistent graph label/filename display** somewhere on the canvas or header.
20. **Add `aria-live` region** for the filtered node count.

---

## Clarifying Questions for the PM

1. **Canvas background color:** Is the canvas light (white/off-white), dark, or user-selectable? This is the single most impactful unspecified visual decision.

2. **Directed vs. undirected edges:** The schema supports `source` and `target`, which implies directed edges. Should arrow heads be rendered? Is direction semantically meaningful in the expected use cases, or is the `source`/`target` distinction just a schema convention?
   > ✅ **RESOLVED (2026-03-12):** All edges are **undirected**. No arrowheads. The `source`/`target` distinction is a schema convention only, not semantic direction.

3. **Edge labels:** The schema includes an optional `label` on edges. Should edge labels be rendered on the canvas? At what zoom level? How should they interact with node labels for readability?
   > ✅ **RESOLVED (2026-03-12):** Edge labels are **decorative and ignorable for v1**. They do not need to be rendered meaningfully. However, the architecture should leave a clean extension point for future meaningful edge data.

4. **Graph size distribution:** What is the expected typical graph size for the primary user? 50,000 nodes is listed as the stress-test ceiling, but is the typical case closer to 500 nodes or 5,000? This changes several design decisions (label thresholds, filter panel UX, histogram bucket count).
   > ✅ **RESOLVED (2026-03-12):** 50k nodes is a **hard user requirement**, not a stretch goal. Datasets will reach this size. All design decisions should account for this scale.

5. **Who is the primary user?** Is this a developer/data engineer loading their own graph exports, a business analyst exploring structured data, or something else? The answer shapes how much domain knowledge we can assume and how much labeling/explanation the UI needs.
   > ✅ **RESOLVED (2026-03-12):** Primary user is a **technical data engineer or analyst** who understands graphs and can interpret visualizations. Domain knowledge can be assumed.

6. **Drop zone after initial load:** Does the canvas accept file drops after the initial load state? If so, how is it handled? If not, is the "Load new file" button the only mechanism?

7. **"Load new file" placement:** The spec mentions this button but never places it in the layout. Where should it live?

8. **Session persistence:** If the user refreshes the page, does the graph reset? Or is the loaded graph persisted (localStorage, URL hash, etc.)? This is not mentioned in the spec and has implications for the "start from scratch" behavior.

9. **String filter default state:** "All values selected (no filtering)" vs. "no values selected (requires user to choose)" — the spec chooses the former, but with large unique-value-count properties this breaks down. Is there a threshold (e.g., >50 unique values) where the behavior should change, or should it always be "all selected"?

10. **Simulation auto-run:** Should ForceAtlas2 start automatically when a file is loaded, or only when the user presses Run? The spec says "user hits Run" but it's not clear if this is a hard requirement or an implementation assumption. Auto-running (with an immediate Stop button) reduces friction for users who don't understand what "Run" means.
    > ✅ **RESOLVED (2026-03-12):** Simulation is **always manual**. User must explicitly press Run. Never auto-starts.

11. **Property key ordering:** How should properties be ordered in the Filters tab and the tooltip? Alphabetically? In insertion order from the JSON? Most frequently non-null first? With many properties, ordering matters.

12. **Multi-graph support scope:** The spec says dropping a new file "resets everything." Is there any future intent to support loading multiple graphs or overlaying graphs? Knowing this affects whether the reset-on-new-file design is acceptable long-term.

---

## Round 2 — Additional Design Review (2026-03-12)

**Reviewer:** Senior UX/Product Designer
**Focus:** Scale-specific interaction failures, null-value modal risks, collapsible filter interaction detail, unresolved visual decisions, cognitive load, micro-interactions, and first-user embarrassments.

---

### 1. 50k Node Scale — Interaction Patterns That Will Break

#### The filter highlighting pipeline is a performance time-bomb for the user experience

The spec says "any filter change updates node colors immediately." At 50k nodes, `graph.updateEachNodeAttributes(...)` followed by `sigma.refresh()` is called on every slider handle drag event, every keystroke in the string filter, and every date picker change. Even if the underlying computation is fast, the *perceived* responsiveness degrades as soon as there is any frame-rate drop. The spec commits to live updates but never specifies what "immediate" means when the graph has 50k nodes.

This matters from a design perspective because if the update lags by even 100–200ms on a slider drag, users will drag more slowly or jerkily to compensate, creating a frustrating feel. At 500ms lag it becomes actively broken.

**What the spec is missing:** A debounce strategy that is visible to the user. The design should specify that continuous controls (range slider, date pickers) update with a short debounce (e.g., 150ms after the user stops moving the handle) rather than on every mouse move event, and that a subtle visual indicator (a brief "Updating..." or spinner in the filter panel header) confirms the update is in progress. Instant-click controls (boolean toggle, string tag selection) can remain truly immediate since they don't fire continuously.

Without this decision made at the design level, the implementer will choose one of: (a) update on every event and discover performance issues in testing, (b) add an arbitrary debounce silently, or (c) add a separate "Apply" button — all of which are worse than a deliberate design decision now.

#### Sigma.js canvas rendering at 50k nodes will produce a black smear, not a graph

At 50k nodes with default node sizes, the canvas will render as an undifferentiated blob. Users will see nothing useful until they zoom in substantially. The spec's Definition of Done says "app does not crash or freeze on 50,000 nodes" but says nothing about whether the initial render is *usable*. These are different problems.

The spec says nothing about:
- Default node size. At 50k nodes, nodes need to be extremely small (1–2px radius) to avoid occlusion. At that size, they are barely clickable.
- Minimum clickable target size for nodes. A 2px node is not clickable. If nodes are rendered at 2px, how does tooltip interaction work? Does clicking within a certain radius trigger a tooltip for the nearest node?
- Whether zoom level is fit-to-graph on load (showing all 50k nodes at once, illegible) or zoomed in at a more readable scale with pan required to explore.

**What the spec must add:** An explicit statement about initial zoom level (fit-to-graph is almost certainly wrong at 50k nodes — starting at a readable zoom with "fit" available as a button is better), a minimum node radius for click targeting (Sigma supports a `nodeReducer` click zone separate from visual radius), and acknowledgment that at full zoom-out the graph will look like noise, and that is acceptable.

#### Tooltip click detection on a 50k-node dense canvas

The spec says "clicking a node opens a tooltip." At 50k nodes, nodes will be visually overlapping at any non-maximum zoom level. Sigma's click detection fires for the topmost node in the render order. Users will consistently click what they intend to click but get a tooltip for a different node. This is not a bug — it is an unavoidable consequence of visual density. But it will feel like a bug.

The spec has no guidance on this. There is no "you clicked node X, did you mean one of these nearby nodes?" affordance, no visual indicator of which node was selected before the tooltip opens (the Round 1 feedback already covers the missing selected-node visual state; the point here is that the cause of that confusion is the density problem, not just the missing highlight).

**What is missing:** An acknowledgment that node click targeting at high density is imprecise and a decision about whether to address it (nearest-node selection, click-to-select-then-inspect, etc.) or explicitly accept it as a limitation.

#### ForceAtlas2 convergence at 50k nodes will take a very long time

ForceAtlas2 is an O(n log n) algorithm. At 50k nodes, it will take minutes to converge to a meaningful layout, not seconds. The spec treats the simulation as something users "run until the layout looks good, then stop" — implying convergence happens within a few seconds of observation. At 50k nodes this assumption is broken.

The Run/Stop button label, the "Simulating..." indicator recommended in Round 1, and the entire user mental model of "run it and watch it settle" falls apart. Users will hit Run, see nodes slowly drifting for 3 minutes, and either Stop too early (getting a meaningless layout) or wait through an agonizing experience.

**What the spec must address:** Is there a time limit or iteration limit after which the simulation auto-stops? Is there a "speed vs. quality" tradeoff the user needs to understand? Should the Speed slider be renamed and re-explained in this context? This is not a performance engineering question — it is a design question about user expectations and progress communication.

---

### 2. The Null-Value Blocking Modal — Specific Risks

The resolved items include: "Null values are replaced with type defaults on load + blocking acknowledgement modal." This decision solves one problem and creates several.

#### The modal is a punishing gate for a recoverable technical condition

A blocking acknowledgement modal is the right call when the user must take an explicit action before proceeding (e.g., confirming data deletion). It is the wrong call when the condition is routine, expected, and non-destructive. Null values in a graph dataset are extremely common — the spec itself acknowledges this ("All nodes should have the same property keys. Missing values for a selected property are treated as `null`"). In practice, every real-world dataset will have at least some null values.

This means *every single file load* will show this modal for typical users. It becomes a speed bump they will learn to click through without reading. This is the definition of a modal that no longer serves its purpose.

**The spec does not define:** What the modal actually says, how many nulls trigger it (one null? Any null? Only if >N% of nodes have nulls for a property?), whether it lists which properties have nulls and how many, or what the "type defaults" are that nodes will be assigned. If the user doesn't know what defaults were applied, they cannot interpret the filtered results correctly.

**The risk:** A user loads a dataset where `score` is null for 30% of nodes. The modal fires, they click through. The range slider for `score` now includes those 30% of nodes as `0` (numeric default). The user filters score > 50 and sees 70% of nodes highlighted. They trust this result. But 30% of those highlighted nodes have no actual score — they're there because `null` was silently coerced to `0`. This is a data integrity problem presented through UI design.

**What the design should specify instead:**
- The modal should list *specifically* which properties have null values and how many nodes are affected per property. This takes it from "click to acknowledge" to "here is information you need."
- The user should have a choice at the modal: "Replace nulls with defaults" OR "Exclude null nodes from filtering" (the existing spec behavior, where null nodes are simply grayed out). The blocking modal is fine as a decision point — it is not fine as a pure acknowledgement gate.
- The defaults should be displayed in the modal ("missing `score` values will be treated as 0; missing `status` values will be treated as empty string").
- Threshold the modal: only show it if at least 1% of nodes or at least 5 nodes have null values. Silent loads for tiny/clean datasets.

#### The modal creates a mismatch with the CLAUDE.md project context

The CLAUDE.md project context says: "Missing property values on a node are treated as `null` (gray node, excluded from stats)." But the resolved design feedback says null values are "replaced with type defaults on load." These two statements directly contradict each other. This contradiction needs to be resolved before any implementation begins — the modal behavior implies a different data model than the project context file assumes.

---

### 3. Collapsible Filter Panels — Interaction-Level Gaps

The resolved item says filter panels should be collapsible. The spec and resolved feedback never go beyond that sentence. This is not enough to build from.

#### Collapse/expand trigger: where and how?

The spec's filter panel header shows a checkbox (enable/disable) and a property name. There is no chevron, no click target, no affordance for collapse. The design needs to specify:

- **What triggers collapse?** Clicking anywhere on the panel header row (checkbox excluded)? A dedicated chevron button? The property name only? Clicking the entire header row is the most obvious choice but conflicts with the enable/disable checkbox. A dedicated `▼`/`▶` chevron at the right end of the header is standard and avoids the conflict.
- **What is the collapsed state?** Does the panel header stay visible (showing the property name, type badge, and checkbox) while the filter controls beneath it are hidden? This is the correct behavior — the user needs to see the property name to know what's collapsed. But it needs to be explicit.
- **Does a dirty/active filter stay visible in the collapsed state?** If a filter is enabled and has non-default values but is collapsed, the user needs a signal that this panel is actively contributing to filtering. A blue dot or "active" indicator on the collapsed header row is essential, otherwise users will forget they have a hidden active filter and be confused by the results.
- **Initial state: expanded or collapsed?** The resolved feedback says "expanded by default." This is correct — but at 10 properties on a 1080px sidebar, 10 expanded panels will overflow the viewport, requiring scroll. What is the scroll behavior? Does the Filters tab scroll independently of the rest of the right sidebar? This needs to be specified.
- **Collapse all / Expand all:** With 10 properties, individual collapse is fine. At 10+ properties after scrolling through, a "Collapse all" link at the top of the Filters tab saves significant interaction time. This is a one-line addition to the spec.

#### The checkbox and the collapse state interact in an unspecified way

If a filter panel is collapsed and the user wants to enable/disable the filter, they should be able to do so from the collapsed state without expanding the panel first. The checkbox must remain visible in the collapsed header row. This seems obvious but is not stated anywhere, and an implementer who renders the checkbox only in the expanded body will produce an unusable collapsed state.

---

### 4. Unresolved Visual Decisions That Will Cause Implementation Chaos

#### The "type badge" is mentioned in the Definition of Done but never specified

DoD item 9: "shows the correct filter control with a type badge." What does a type badge look like? A pill? A colored dot? A text label in parentheses (as shown in the ASCII layout: `(number)`, `(string)`, `(date)`, `(boolean)`)? What are the badge colors? Does it appear in the collapsed header row? This will be designed on-the-fly by the developer and then re-designed when the first screenshot is shown, wasting time.

#### The string filter tag design is underspecified

The ASCII layout shows `[active ✕][pending ✕]` — removable tags. No decisions are documented about:
- What does a tag look like (pill shape, border, background, text color)?
- What happens when there are 15 selected tags? Do they wrap? Does the tag container have a fixed height with scrolling? Does it overflow visually?
- What is the visual relationship between the tags above the input and the dropdown below? Is the dropdown anchored to the input? Does it appear above or below?
- When the dropdown is open and the user has already selected 8 values, are those values marked with a checkmark inside the dropdown? Without this, users add duplicates by accident.

#### Filter panel visual state during active filtering vs. default state is undefined

When a number slider is at its default position (min to max, no actual filtering happening), it looks identical to a slider that is actively filtering (e.g., 20 to 80). The user cannot tell which panels are actively filtering anything just by looking at them.

This overlaps with the "dirty indicator" mentioned for collapsed panels, but it applies to expanded panels too. Without an indicator that says "this filter is set to non-default values," users will scan the sidebar and have no quick understanding of what's active.

---

### 5. Cognitive Load Issues Not Yet Raised

#### The Data tab stats scope is ambiguous to first-time users

The Data tab shows "Nodes (filtered): 38" and then a dropdown for property analysis. The stats shown (min, max, etc.) are computed "over the filtered nodes." But the stats dropdown is in the *Data* tab, while the filters that produce the "filtered" set are in the *Filters* tab. A user on the Data tab with active filters has no immediate reminder that their stats are scoped to a subset. The "Nodes (filtered): 38" count is the only signal, and it is at the top of the panel, disconnected from the stats below.

**What is missing:** The stat section should include a small contextual label: "Computed over 38 filtered nodes" — directly adjacent to the stats, not just at the top of the panel. When all nodes are unfiltered (all 142 match), this label can read "All 142 nodes" to reduce noise.

#### The histogram has no axis labels or scale

The inline histogram `[▆▃█▅▂▇▄▃]` shows bucket distribution but provides no x-axis scale (what are the bucket boundaries?) or y-axis scale (what does bar height represent, and what are the extreme values?). For a technical user who is trying to understand value distribution, a histogram with no scale is a decorative element, not an analytical one.

The expanded histogram modal is marked non-MVP, but the inline version ships with v1. It needs, at minimum, a tooltip on hover showing the bucket range and count for each bar. Without this, a user hovering over the tallest bar cannot determine the range of values it represents.

---

### 6. Micro-Interactions the Spec Is Silent On

#### File validation error — what happens after the user reads the error?

The spec says errors are "shown inline" on the drop zone. It does not say:
- Whether the error auto-dismisses or persists indefinitely
- Whether the drop zone remains active to accept a corrected file after showing an error (presumably yes, but not stated)
- Whether there is a "dismiss error" control or only the next file drop clears it

A user who drops an invalid file, reads the error, and then wants to correct it should be able to do so by dropping again. If the error message does not communicate "drop a corrected file to try again," many users will think the tool is broken. This is a micro-interaction but it is on the user's critical path.

#### What does the "loading" state look like between drop and render?

The spec describes the drop zone and the rendered graph but nothing in between. For a 50k-node JSON file, file parsing, schema validation, and initial graph layout construction will take a noticeable amount of time — potentially several seconds. The spec says the drop zone is "full screen until graph is loaded" but does not specify:
- Whether the drop zone transforms into a loading state (spinner, progress bar, "Parsing graph..." text) or just stays static until the graph appears
- Whether there is a transition animation between the drop zone and the three-column layout (a cross-fade? Instant swap? The three-column layout fading in?)

Dropping a file and staring at the unchanged drop zone for 3 seconds while parsing happens is an experience that will cause users to drop the file again, thinking their drop didn't register.

#### Simulation running state — canvas changes

Round 1 flagged the need for a "Simulating..." indicator near the Run/Stop button. The additional micro-interaction gap is on the canvas itself: when the simulation starts, does the camera stay locked at the current viewport, or does it fit-to-graph so the user can see the full layout in motion? When the user hits Stop, does the camera adjust? When Reset is triggered, does the camera fit-to-graph automatically (since random positions will scatter nodes)?

None of these are specified. Each will be decided differently by the developer, and at least one of those decisions will feel wrong to the first user.

#### The tooltip moves to a new node — but how?

"Clicking a second node moves the tooltip to that node." What does "moves" mean as an animation? Instant jump? Slide transition? A fade-out/fade-in? At 50k nodes where the two clicked nodes may be far apart on the canvas, an instant jump is correct (a sliding transition that traverses the full canvas would be nauseating). But near-adjacent nodes might benefit from a subtle position transition. This needs a decision: instant repositioning, no animation.

---

### 7. First External User Embarrassments

These are the things that look fine in a developer demo but will cause the first real user to raise an eyebrow or file a bug report on day one.

**The Run/Stop button label flip will confuse new users.** When the simulation is running, the button reads "Stop." When it is stopped, the button reads "Run." This is a single button that changes its label based on state. Users who see "Stop" when the simulation is running will not understand they need to click to stop — they will look for a separate "Stop" button. This is an old, well-documented UI pattern problem. The fix is a single button with an icon that makes state obvious (▶ for stopped, ⏸ for running) alongside the label, so the *icon* communicates current state even as the label communicates the action.

**Loading a second file while simulation is running has no defined behavior.** The spec says dropping a new file "resets the entire app state." But what if the FA2 Web Worker is currently running? Is the worker terminated before the reset? Is there a race condition where the old worker posts a message after the new graph is initialized? This is partly an implementation concern but it originates from a design gap: the spec never defines the loading behavior in the context of an active simulation. The design should explicitly say: loading a new file stops any running simulation immediately before clearing state.

**The "Nodes (filtered)" count in the Data tab does not update when the user is on the Filters tab.** The spec says it "updates live as filters change" — this is correct. But the count is in the Data tab. If the user is actively using the Filters tab, they cannot see the filtered count updating. They have to switch tabs to see the result of their filtering. The Filters tab has no live feedback about how many nodes match the current filter state. This is a fundamental flow problem: the primary action (filtering) is in one tab, and its primary output (how many nodes match) is in another tab. The filtered node count should appear in the Filters tab as well — ideally as a small, persistent element at the top or bottom of the filter panel list.

**The histogram expand modal is "non-MVP" but its click affordance will ship anyway.** The spec says "(click to expand)" will appear in the UI but the expanded modal is non-MVP. This will produce either: (a) a dead click that does nothing (worst case — users think the app is broken), or (b) a partially built modal (second worst case — unfinished UI in an external-facing product). The "(click to expand)" text must be completely removed from the UI if the feature is not shipping. Leaving a visible affordance for a non-functional feature in an external-facing product is not acceptable.

**The boolean filter "either" radio button and the enable/disable checkbox have opposite semantics at the same level.** The spec shows:
```
☑ active       (boolean)
   ● true  ○ false  ○ either
```
When "either" is selected, the filter passes all nodes. When the checkbox is unchecked, the filter is disabled and also passes all nodes. From the user's perspective, "☑ either" and "☐ (disabled)" produce identical results but are achieved through different controls. A user who set the boolean to "true," then wanted to clear the filter, will logically click "either" — but the checkbox remains checked, suggesting the filter is still "on." This is not a fine point — it will be a genuine point of confusion for every first-time user of the boolean filter.

---

## Round 2 — Open Questions for the Owner

These are new questions not addressed in any previous resolved items.

**Q13. Debounce on continuous filter controls:** Should range sliders and date pickers update node highlighting on every mouse-move event, or after a debounce delay? If debounce, what is the maximum acceptable lag before a visual update must appear (e.g., 150ms)? This must be decided before implementation begins.

**Q14. Null-value modal content and behavior:** The modal is resolved as "blocking acknowledgement." But what exactly does it display? Does it list which properties have nulls and how many nodes are affected? Does the user have any choice, or is it a pure "click OK to proceed"? And critically — what are the type defaults for each property type (number → 0? string → ""? boolean → false? date → what?)?
   > ✅ **RESOLVED (2026-03-12):** Modal shows total replacement count only (e.g., "10,847 values were replaced with defaults"). User can **cancel** the load (returns to current graph) or confirm. Type defaults: number → `0`, string → `""`, boolean → `false`, date → `"1970-01-01"`.

**Q15. Null-value handling contradiction:** The CLAUDE.md project context says "Missing property values on a node are treated as `null` (gray node, excluded from stats)." The resolved design feedback says nulls are "replaced with type defaults on load." Which is correct? These cannot both be true at the same time.
   > ⚠️ **NEEDS RESOLUTION:** CLAUDE.md must be updated to reflect the resolved null-default policy. Nulls are replaced with type defaults on load — the "gray node, excluded from stats" behavior is superseded. CLAUDE.md is stale on this point.

**Q16. Collapsible filter panel collapse trigger:** Is collapse triggered by clicking the panel header row (excluding the checkbox), or by a dedicated chevron icon? The checkbox must remain accessible in the collapsed state — is that confirmed?
   > ✅ **RESOLVED (2026-03-12):** Collapse is triggered by a **dedicated chevron icon** on the panel header. The checkbox remains visible and interactive in the collapsed state.

**Q17. Active filter indicator on collapsed panels:** When a filter panel is collapsed and has non-default values (i.e., is actively filtering), should there be a visual indicator (e.g., a colored dot on the header)? Without this, users forget they have hidden active filters.
   > ✅ **RESOLVED (2026-03-12):** Yes — colored dot indicator on the collapsed header. **Post-MVP.**

**Q18. Filtered node count in the Filters tab:** Should a live "N nodes match" count appear somewhere in the Filters tab itself, so users don't have to switch tabs to see filter results? Or is switching to Data tab the intended workflow?
   > ✅ **RESOLVED (2026-03-12):** Yes — a live "N nodes match" count should appear in the Filters tab as well, so users get immediate feedback without switching tabs.

**Q19. Initial viewport on load:** When a graph first renders, should the camera fit-to-graph (showing all nodes at once, likely illegible at 50k) or start at a fixed zoom level? Should Reset (Randomize Layout) also fit-to-graph after randomizing?
   > ✅ **RESOLVED (2026-03-12):** **Fit-to-graph on initial load.** Camera fits all nodes into view when a file is first loaded.

**Q20. Run/Stop button — single toggle vs. separate buttons:** Is the current design (single button, label flips between Run and Stop) intentional? Has the usability issue with this pattern been considered? Two separate buttons, one always visible with the inactive one grayed out, is a more legible alternative.
   > ✅ **RESOLVED (2026-03-12):** **Two separate buttons** — Run and Stop, always visible. Inactive button is grayed out.

**Q21. Loading state between file drop and graph render:** What visual state should the drop zone show while the file is being parsed and the graph is being built? A spinner? Progress text? Does the drop zone stay on screen until the graph is ready, or does the three-column layout appear immediately with a loading overlay on the canvas?
   > ✅ **RESOLVED (2026-03-12):** Show a **spinner** on the drop zone while parsing. Drop zone stays visible until the graph is ready.

**Q22. Simulation running while loading new file:** If the user drops a new file while FA2 is running, does the simulation stop automatically before the reset, or is the reset gated behind a confirmation (given the existing confirmation dialog for new file load)?
   > ✅ **RESOLVED (2026-03-12):** Simulation **stops automatically** when a new file is dropped. No additional gate.

**Q23. String filter selected values in the dropdown:** When the string filter dropdown is open and some values are already selected as tags, are those values marked (e.g., checkmarked) in the dropdown to prevent confusion about what's already selected?
   > ✅ **RESOLVED (2026-03-12):** Yes — already-selected values are **checkmarked** inside the dropdown.

**Q24. Stats scope label in Data tab:** Should the stats section explicitly state what node set it is computed over (e.g., "Computed over 38 filtered nodes") directly adjacent to the stat values, or is the "Nodes (filtered): 38" count at the top of the tab sufficient context?
   > ✅ **RESOLVED (2026-03-12):** The count at the top of the Data tab is sufficient. No adjacent label needed.

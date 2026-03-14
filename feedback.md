# Graph Visualizer — Consolidated Spec Review Feedback

**Review date:** 2026-03-13
**Sources:** Alex (Staff UX Designer), Sam (Staff Senior Engineer), Jordan (Staff PM)
**Process:** Independent pre-review by Alex and Sam, followed by joint discussion session with PM

Severity legend: 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Post-MVP

---

## Theme 1: Node State Visual Design

### 1.1 Highlighted node contrast ratio is below minimum threshold
- **Severity:** 🔴 Critical
- **Raised by:** UX (Alex), confirmed by ENG (Sam)
- **Description:** The highlighted node color (#93c5fd) on the canvas background (#f8fafc) produces approximately 1.5:1 contrast — well below the WCAG 3:1 minimum for graphical objects. Nodes matching the active filter are nearly indistinguishable from default nodes (#94a3b8). This breaks the primary filter feedback loop: the visual distinction that communicates "these nodes match your criteria" does not reliably register.
- **Resolution:** Replace #93c5fd with a higher-contrast blue, e.g. #60a5fa (~3.2:1 on #f8fafc). Update the spec color table and all references. Verify the replacement value with a contrast checker before committing it to the spec.

### 1.2 Default and grayed-out node colors are perceptually indistinct
- **Severity:** 🔴 Critical
- **Raised by:** UX (Alex), ENG (Sam)
- **Description:** Default (#94a3b8) and grayed-out (#e2e8f0) are both low-saturation blue-grays. The spec defines four distinct node states. When two of those states are perceptually indistinguishable — especially on first filter application when most nodes become grayed-out — the state machine is functionally broken from the user's perspective even if the implementation is correct.
- **Resolution:** Choose a grayed-out color with a higher lightness differential from default, e.g. #f1f5f9 or a more desaturated value. Document the final hex values with their measured contrast ratios against each other and the canvas background in the spec.

### 1.3 Grayed-out nodes have no cursor affordance to signal non-interactivity
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** Grayed-out nodes do not respond to click (tooltip should not open), but the cursor does not change to indicate this. Users will click grayed-out nodes expecting a tooltip and get no response or feedback.
- **Resolution:** Spec should explicitly state: cursor changes to `default` on hover over grayed-out nodes. Sigma supports per-node cursor customization via event handlers.

### 1.4 Color tab gradient state has no indicator when on Filters/Stats tab
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** When a color gradient is active and the user navigates to the Filters or Stats tab, there is no indication that a color mapping is currently applied. Users may interpret the gradient colors as filter-driven highlighting, creating confusion about which system controls node appearance.
- **Resolution:** Add a persistent indicator when a color gradient is active — e.g., a colored dot badge on the Color tab label, or a pinned banner at the top of the Filters/Stats tab reading "Color gradient active: [property name]." This must be visible regardless of which tab is selected.

---

## Theme 2: Tooltip Behavior

### 2.1 Node ID omitted from tooltip when label is present
- **Severity:** 🟠 High
- **Raised by:** UX (Alex)
- **Description:** The tooltip shows `label` as the primary title when present, and does not show the node `id`. For technical data engineers who cross-reference graphs with external systems by node ID, the absence of the ID requires inspecting the source file. This is a core workflow for the target audience.
- **Resolution:** Always show node `id` in the tooltip. When a label is present, display it as the primary title with the node ID shown as a secondary line in smaller, muted text. When no label is present, show ID as the primary title as currently specified.

### 2.2 Tooltip closes silently when node is grayed out — behavior unspecified
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** The spec states the tooltip closes when its target node becomes grayed out, but does not specify how. A data engineer inspecting node properties while applying filters may lose the tooltip without any explanation. The spec is silent on animation, messaging, and whether this is distinguishable from a user-initiated close.
- **Resolution:** Specify: when a tooltip's target node is grayed out by a filter change, dismiss with a 150ms fade-out and optionally display a one-line inline note "Node no longer matches active filters" immediately before closing. Distinguish this case in the spec from the user-initiated close cases (Escape, outside click, close button).

### 2.3 Dual-line tooltip (formatted + raw) over-engineered for non-date property types
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** The spec requires both a formatted line and a raw value line for every property in the tooltip. For numbers and strings these are identical or near-identical, adding visual noise with no benefit. Only date properties yield meaningful value from this treatment (e.g. "1,423 days ago" vs "2022-04-15T00:00:00Z").
- **Resolution:** Show dual-line (formatted + raw) only for date-typed properties. For number, string, and boolean properties, show a single formatted value. Update the tooltip layout spec and the `NodeTooltip.tsx` description accordingly.

---

## Theme 3: String Filter Behavioral Inconsistency

### 3.1 Empty tag selection behavior is logically inconsistent between cardinality cases
- **Severity:** 🟠 High
- **Raised by:** UX (Alex), ENG (Sam)
- **Description:** The spec defines opposite behaviors for empty tag selection depending on dataset cardinality: for ≤50 unique values, removing all tags produces unspecified behavior (implying 0 matches); for >50 unique values, empty tags = no restriction. A data engineer switching between properties of different cardinalities encounters contradictory filter semantics with the same gesture. This erodes trust in the filter system.
- **Resolution:** Standardize to "empty tag selection = no restriction" for both cardinality cases, with a visual indicator on the filter panel when the filter is effectively inactive (e.g. "All values included" hint text, or the filter header rendered in a muted/inactive style). The enable/disable checkbox is the correct mechanism for intentionally deactivating a filter. Update the spec to state this explicitly for both cardinality paths.

---

## Theme 4: Performance Targets and Large Graph Behavior

### 4.1 "60fps simulation" target conflates WebGL render fps with FA2 convergence rate
- **Severity:** 🟠 High
- **Raised by:** ENG (Sam), UX (Alex)
- **Description:** The spec groups 60fps as a simulation performance target. WebGL render framerate (60fps) is a Sigma.js concern and is achievable. FA2 convergence rate — how quickly the layout reaches a stable, legible state — is governed by graph density, node count, and FA2 parameters. At 50,000 nodes, FA2 may run for 60+ seconds before the layout is meaningful. The spec says nothing about this duration, provides no progress indicator, and sets no auto-stop threshold. Users will interpret a long-running simulation with no visible progress as a hang.
- **Resolution:** Split the performance spec into two distinct items: (1) WebGL render framerate >= 60fps during active simulation; (2) simulation duration policy — specify one of: auto-pause after N seconds/iterations with option to continue; a visible iteration counter or elapsed-time display; or explicit acknowledgment in the spec that convergence time is unbounded and the Run/Stop buttons are the user's control. Escalate to product owner for the policy decision (see PO Questions).

### 4.2 "<2s parse + render" target for 50k nodes is untestable without reference hardware
- **Severity:** 🟠 High
- **Raised by:** ENG (Sam)
- **Description:** JSON.parse on a dense 50,000-node file (estimated 10–15MB) may consume 500ms–1.5s on a mid-range laptop. Combined with Graphology graph construction and initial Sigma render, the 2s target is optimistic on commodity hardware. Without a reference hardware specification, this target cannot be verified at QA and will generate disagreement between team members about whether it is met.
- **Resolution:** Either (a) define the reference hardware against which the 2s target is measured (e.g. "MacBook Pro M2, 16GB RAM, Chrome latest"), or (b) add a loading state during the parse phase so that 3–4s actual load times are covered by user feedback, and treat 2s as aspirational. Also specify whether JSON.parse runs on the main thread or in a worker.

### 4.3 FA2 worker has no specified error handling or slider-change debouncing
- **Severity:** 🟠 High
- **Raised by:** ENG (Sam)
- **Description:** Two related gaps: (1) the spec does not specify what happens when the FA2 Web Worker crashes (silent stop, error UI, automatic restart?); (2) rapid slider changes trigger stop() → update settings → start() in sequence, but if the worker has not finished stopping before start() is called, a double-worker condition is possible, producing a memory leak or incorrect simulation state. Neither debouncing nor worker lifecycle management is specified.
- **Resolution:** Add to the FA2 simulation spec: (1) slider changes are debounced 150ms before triggering a stop/restart cycle; (2) start() must not be called until the worker has confirmed it is stopped; (3) worker crash triggers an error state in the UI with a "Simulation failed — reload file to continue" message and a console.error.

### 4.4 Performance targets have no automated test enforcement
- **Severity:** 🟡 Medium
- **Raised by:** ENG (Sam)
- **Description:** The spec lists four performance targets (<2s parse/render, <100ms filter→recolor, 60fps, <100ms stats recompute) but the Definition of Done and test sections include no performance tests. These targets will only be verified manually, if at all.
- **Resolution:** Add at minimum one automated performance check to the Definition of Done: a Playwright-based timing test that loads the fixture file and asserts time-to-first-render is under a configurable threshold. For stats recompute, a Vitest benchmark on `computeStats.ts` with a large mock dataset is feasible and should be specified.

---

## Theme 5: Export and Round-Trip Correctness

### 5.1 Export format is not guaranteed to produce a valid re-importable file
- **Severity:** 🔴 Critical
- **Raised by:** ENG (Sam), PM (Jordan)
- **Description:** The spec says the export "enriches with x/y" but does not explicitly state that the exported file is a valid input per the schema in `src/lib/graphSchema.json`. Specifically unaddressed: whether `version` is preserved, whether all original node and edge fields are preserved verbatim, and whether the file passes schema validation on re-import. If a data engineer exports and then re-imports, a validation failure would be a critical regression — the export feature actively damages data.
- **Resolution:** Add an explicit guarantee to the export section: "The exported JSON file is a valid input file per `graphSchema.json`. All original node and edge fields are preserved. Each node object gains numeric `x` and `y` fields representing current canvas position. No other fields are added or modified. The `version` field is preserved." Add a round-trip E2E test: export → re-import → verify graph loads without validation error.

### 5.2 Filename prompt on export is over-engineered for a prototype
- **Severity:** ⚪ Post-MVP
- **Raised by:** UX (Alex)
- **Description:** The export flow includes a modal with a filename input (pre-filled) and a confirmation step. For a prototype, this adds implementation cost (modal component, input validation, confirm flow) for minimal user value — the user can rename the file after download in two seconds.
- **Resolution:** For v1, trigger the download with a hardcoded filename of `graph-export.json` and show the success toast. Remove the filename prompt modal. Revisit for v2 if user research identifies it as a pain point.

---

## Theme 6: Edge Cases and Omissions

### 6.1 Partial position loading behavior is unspecified
- **Severity:** 🟠 High
- **Raised by:** UX (Alex), ENG (Sam), PM (Jordan)
- **Description:** The spec honors `x`/`y` on nodes if present but does not define behavior when only some nodes carry position data (a common scenario when files are merged from multiple tools). Randomizing unpositioned nodes next to a structured positioned subgraph may produce a visually confusing layout — a well-organized region with a cluster of random nodes superimposed on top.
- **Resolution:** Add an explicit rule: if any nodes have position data, all nodes with positions are honored; nodes missing positions are randomized. A non-blocking warning banner is displayed: "Some nodes had no saved position — their positions were randomized." Specify this in the position-loading section of the spec. If the product owner decides partial positions are out of scope for v1, specify the simpler rule: "if any node is missing position data, all positions are discarded and a full random layout is used."

### 6.2 React Error Boundary not specified — useEffect catch is insufficient
- **Severity:** 🟠 High
- **Raised by:** ENG (Sam)
- **Description:** The spec states Sigma mount failures are caught in `useEffect` with a fallback error render. However, `useEffect` only intercepts asynchronous errors. Synchronous throws during Sigma initialization (e.g. WebGL context unavailability, which is a real scenario on certain hardware or headless environments) propagate uncaught and produce a white screen with no message.
- **Resolution:** Add a React Error Boundary component wrapping `GraphView` to the spec. It catches synchronous render and mount errors and displays a fallback UI: "Graph failed to render. Check browser console for details." This is approximately 20 lines of implementation effort with significant reliability benefit.

### 6.3 buildGraph.ts responsibility scope is too broad
- **Severity:** 🟡 Medium
- **Raised by:** ENG (Sam)
- **Description:** The spec implies `buildGraph.ts` handles JSON parsing, schema validation, null-default application, position assignment, and potentially stats pre-computation. This violates single responsibility, complicates unit testing (each concern requires different mock setups), and makes error attribution harder ("which step failed?").
- **Resolution:** Clarify in the spec that `buildGraph.ts` has a single responsibility: converting a validated, normalized input object into a Graphology graph instance. JSON parsing belongs in the file-load handler. Schema validation belongs in `validateGraph.ts`. Null-default application is a pre-processing step that runs after validation and before `buildGraph`. Document the pipeline explicitly: `parseJSON → validateGraph → applyNullDefaults → buildGraph`.

### 6.4 Blocking modal timing is ambiguous
- **Severity:** 🟡 Medium
- **Raised by:** ENG (Sam)
- **Description:** The spec describes a blocking modal when null defaults are applied, with a Cancel option that "keeps the current graph." It is ambiguous whether the graph is constructed in memory before the modal appears (Cancel discards it) or whether construction is deferred until the user confirms (Cancel skips it). This affects implementation architecture and memory allocation for large files.
- **Resolution:** Specify explicitly: null-default application and graph construction both happen in memory before the modal is shown. If the user cancels, the new graph object is discarded and the previous graph remains rendered. This is simpler to implement than deferred construction and avoids a second loading phase after confirm.

### 6.5 Division by zero in color gradient when min === max
- **Severity:** 🟠 High
- **Raised by:** ENG (Sam)
- **Description:** Gradient normalization computes `(value - min) / (max - min)`. When all nodes share an identical value for the selected numeric property (min === max), this produces division by zero and NaN color values. All nodes render with an undefined color, with no error shown to the user.
- **Resolution:** Add a guard in `colorScales.ts`: when min === max, apply the midpoint gradient color (t = 0.5) to all nodes uniformly. Display an informational note in the Color tab: "All nodes have the same value — uniform color applied."

### 6.6 Canvas resize behavior is unspecified
- **Severity:** 🟡 Medium
- **Raised by:** ENG (Sam)
- **Description:** The spec does not address what happens when the browser window is resized. Sigma requires explicit resize calls to recompute the viewport; without them, the canvas will misalign or clip after a resize.
- **Resolution:** Add one sentence to the spec: Sigma's `resize()` method is called on `window` resize events, debounced 100ms. If sidebar layout changes affect the canvas container dimensions, `resize()` is also called after the layout transition completes.

### 6.7 Randomize Layout behavior conflicts with stopped-simulation user intent
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** The spec defines Randomize Layout as: stop → randomize positions → start → fit camera. This unconditionally restarts the simulation. A user who deliberately stopped the simulation to inspect a stable layout and then clicks Randomize to explore an alternative will find the simulation unexpectedly running again.
- **Resolution:** Change the behavior to preserve prior simulation state: stop → randomize positions → fit camera → restart only if simulation was running before the click. Spec should state: "Randomize Layout preserves the prior running/stopped state. If the simulation was running when Randomize was clicked, it restarts after randomization. If it was stopped, it remains stopped."

### 6.8 AND-logic note placement scrolls off-screen with many properties
- **Severity:** 🟡 Medium
- **Raised by:** UX (Alex)
- **Description:** The AND-logic explanation is placed at the bottom of the filter list. On any graph with more than 3–4 properties the note scrolls off-screen and is not visible when the user reads the "N nodes match" count at the top of the panel — the exact moment the AND semantics are most relevant.
- **Resolution:** Move the AND-logic note to be adjacent to the "N nodes match" count display, either immediately below it or as a pinned element above the scrollable filter list. It must remain visible whenever the match count is visible.

---

## Theme 7: Scope and MVP Cut

### 7.1 Custom color picker is over-engineered for v1
- **Severity:** ⚪ Post-MVP
- **Raised by:** UX (Alex), ENG (Sam)
- **Description:** The spec includes a custom palette color picker in the Color tab. Implementation requires a color picker UI component, session-persistent custom palette state (whose location in the architecture is unspecified — see 6.4 below), integration with the gradient computation, and non-trivial changes to `colorScales.ts`. The six named palettes (Viridis, Plasma, Blues, Reds, Rainbow, RdBu) are sufficient for a prototype. The custom picker appears in one sentence of the spec but carries disproportionate implementation cost.
- **Resolution:** Remove custom color picker from v1 scope. The Color tab ships with the six named palettes only. If session state for custom palettes is also removed, the `colorScales.ts` statefulness question (which the spec currently leaves undefined) is also resolved. Add custom palette to the post-MVP backlog.

### 7.2 colorScales.ts session state location is undefined
- **Severity:** ⚪ Post-MVP
- **Raised by:** ENG (Sam)
- **Description:** The spec describes custom palette colors as "per-session" but `colorScales.ts` is structured as a pure-function module. Session state cannot live in a pure module. The spec does not specify where custom palette state lives (React context, module-level singleton, or elsewhere). This is a design gap that will produce inconsistent implementations.
- **Resolution:** This item is moot if custom color picker is removed from v1 scope per item 7.1. If it is retained, specify explicitly where the custom palette state lives and how it is cleared (e.g. on file reload, on browser refresh, or persistent via localStorage).

---

## Product Owner Questions

The following questions require product owner decisions before implementation begins, listed in priority order.

1. **MVP scope:** Are the custom color picker, filename prompt on export, and dual-line tooltip for non-date properties confirmed in scope for v1? Each carries meaningful implementation cost with limited prototype value and is a candidate for deferral.

2. **FA2 simulation duration policy:** What is the acceptable maximum duration for FA2 to run on a large graph (50k nodes) before the UI should indicate progress or auto-pause? Should there be an iteration counter, elapsed time display, or an auto-stop threshold?

3. **Performance target reference hardware:** Against what hardware is the "<2s parse + render for 50k nodes" target measured? Without this definition the target cannot be enforced at QA.

4. **Export round-trip requirement:** Is it a hard requirement that exported files re-import without modification or validation errors? If yes, the spec requires a schema-compliance guarantee in the export section and a round-trip E2E test.

5. **Maximum supported graph size:** Is 50,000 nodes the expected upper bound, or should the app support larger graphs (100k+)? This affects parse strategy, FA2 worker configuration, and performance target credibility.

6. **Tooltip closure on filter change:** When a user has a tooltip open on a node that a filter then grays out, is silent dismissal acceptable, or is a notification ("Node no longer matches filters") required?

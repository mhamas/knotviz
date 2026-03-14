# Product Feedback — Graph Visualizer Spec Review
**Reviewer:** Senior PM
**Date:** 2026-03-13
**Spec version reviewed:** product_specification.md

---

## Overall Assessment

The spec is thorough and well-structured for a prototype. Edge cases are handled (null defaults, position-aware loading, large-graph warnings), the Definition of Done is concrete, and the "What NOT to Build" section is excellent for scope control. That said, several gaps and ambiguities could cause implementation churn or misaligned expectations.

---

## Critical Issues (must clarify before building)

### 1. Success metric is undefined
The spec says "correctness and clarity take priority over polish" but never defines what success looks like beyond the DoD checklist. There is no stated target user, session, or task — e.g. "a data engineer can load a 10k-node graph, identify a cluster of high-score active users, and export the filtered view in under 5 minutes."

**Why it matters:** Without a task-completion lens, it is hard to prioritise trade-offs (e.g. is the histogram more important than keyboard nav?).

**Question for stakeholder:** What is the primary job-to-be-done in one sentence? What does "done" look like for a user session?

---

### 2. "Filtered" vs "highlighted" terminology is inconsistent
The spec uses "filtered", "highlighted", "active", and "grayed-out" to describe node states, but they map differently in different sections:
- Filtering & Highlighting: "nodes matching all enabled filters are highlighted; all others are grayed out"
- Stats tab: stats computed over "filtered nodes"
- Color tab: gradient applies to "active (non-grayed-out) nodes"

There is no canonical state machine defined. This will cause confusion between engineers and testers.

**Suggestion:** Define a single state table at the top of the spec:

| Term | Meaning |
|---|---|
| Active / Highlighted | Passes all enabled filters |
| Grayed-out / Inactive | Fails ≥1 enabled filter |
| Selected | Tooltip is open on this node |
| Default | No filters are enabled (all nodes) |

---

### 3. "Clear all filters" resets to what exactly?
DoD item 18 says "resets all filter controls to their defaults". But "defaults" are ambiguous:
- For number: reset to [min, max]? Or remove the slider bounds?
- For string (≤50 values): re-select all values?
- For boolean: reset to "either"?
- For date: clear both bounds?
- Do checkboxes get unchecked or re-checked?

**Question for stakeholder:** Should "Clear all filters" uncheck all filter panels (disabling them) or keep them enabled but reset their values?

---

### 4. File drop behaviour during simulation is underspecified
The spec says dropping a file while a graph is loaded shows a confirmation dialog. But what if:
- The simulation is running AND the user drops a new file?
- DoD item 6 says "Dropping a file while the simulation is running stops the simulation before resetting state" — but this seems to skip the confirmation dialog. Is the intended flow: drop → confirm → stop simulation → reset? Or: drop → stop simulation → confirm → reset?

**Question for stakeholder:** Does the confirmation dialog appear before or after the simulation is stopped?

---

### 5. String filter default state has a logical gap
For string properties with ≤50 unique values, all values are pre-selected ("no filtering"). For >50 values, no restriction ("functionally equivalent to filter being disabled"). This means the filter's enable checkbox state and its actual behaviour are decoupled in a confusing way: a filter can be "enabled" but behave identically to "disabled".

**Question for stakeholder:** When a string filter with >50 values has no tags selected, should it count as "enabled" (participating in AND logic) or "disabled"? What happens to the "N nodes match" count?

---

## Significant Gaps (will cause ambiguity during implementation)

### 6. Histogram bucket algorithm is underspecified
The spec says "smart variable bucket algorithm (Sturges' rule or Freedman-Diaconis estimator — not a fixed count)" but leaves the choice open. These two estimators can produce very different bucket counts on the same data. Which one should be used, and when?

**Suggestion:** Pick one (Freedman-Diaconis is preferred for skewed data; Sturges' for normal-ish). Add a min/max bucket count (e.g. 5–20) to prevent degenerate cases.

---

### 7. Color gradient for string type: palette capacity
The spec says "if the number of distinct values exceeds the palette's capacity (typically 8–12 colors), colors are reused with a console warning." This is a silent degradation — the user has no idea their colour mapping is broken.

**Question for stakeholder:** Should this show a visible warning in the UI instead of a console-only warning? What is the intended UX when a string property has 200 distinct values?

---

### 8. Stats tab: filtered vs all nodes when no filter is active
The spec says stats are "computed over the filtered nodes (nodes passing current filters)." When no filter is active, are stats computed over all nodes or over no nodes? The distinction matters for the histogram and stats display.

**Assumption to confirm:** When no filters are active, "filtered nodes" = all nodes (same as default state). Is this correct?

---

### 9. Export filename collision
The spec says the exported filename is `my-graph-positioned.json`. If the user exports twice, the second export will overwrite the first (browser default). If the user imports `my-graph-positioned.json` and exports again, the filename becomes `my-graph-positioned-positioned.json`.

**Question for stakeholder:** Is the double-suffix acceptable? Should the app strip any existing `-positioned` suffix before appending?

---

### 10. Tooltip position clamping strategy
The spec says the tooltip is "clamped to stay within canvas bounds." But the tooltip is anchored to a clicked node — if the node is near the canvas edge, where does the tooltip appear? Does it flip direction (right-side → left-side), or does it shift along the same side?

**Suggestion:** Specify the default anchor direction (e.g. "tooltip appears to the upper-right of the node; if this would overflow the canvas, flip horizontally and/or vertically").

---

### 11. Accessibility: keyboard access to the canvas is missing
The keyboard navigation section covers sidebar controls but the canvas itself has no keyboard affordance. A user cannot tab to or select a node without a mouse. For a "technical analyst" user this may be acceptable, but it's worth a conscious decision.

**Question for stakeholder:** Is keyboard-based node selection out of scope for v1, or just not specified?

---

### 12. No loading state for large file parsing
The drop zone shows a spinner "while parsing after drop." But parsing + validating + building a graphology instance for 50k nodes + rendering could take up to 2 seconds (per the performance target). Is the spinner shown for the entire duration (parse + build + render), or only during the JSON parse step?

**Suggestion:** Define the spinner lifecycle: shown from file drop until first render frame is complete.

---

## Minor Issues

### 13. "Load new file" button placement vs. drag-and-drop overlay
Two mechanisms trigger the same flow (load new file button in sidebar + drag-and-drop overlay on canvas). The spec defines them separately but doesn't state whether they share the same confirmation dialog logic. They should.

### 14. Gravity and Speed slider defaults are both 1.0 but mapped to log scale
If the range is 0.1–10.0 on a log scale, the midpoint of the slider handle is not at 1.0. The handle will appear at the logarithmic midpoint (~1.0 happens to be near the middle of log(0.1)–log(10) which is 0, so this is fine). But users may expect "drag to centre = 1.0". Worth confirming.

### 15. "N nodes match" count is shown in Filters tab but not Stats tab header
The Stats tab shows "Nodes (filtered)" count, which is the same number. These are two representations of the same datum. Are they intentionally duplicated for discoverability, or should they stay in sync as a single source of truth?

### 16. Date filter range: "after" and "before" are inclusive
The spec says both bounds are inclusive. If both are set to the same date, only nodes with exactly that date pass. This is correct but should be explicitly stated in the UI placeholder or tooltip to avoid confusion (most date range UIs treat one bound as exclusive).

### 17. No definition of "1 step" for range slider arrow keys
The accessibility section says "arrow keys move slider by one step." The step size for the range slider is not defined. For a continuous number range across arbitrary data, what is one step? 1% of range? 1 data unit?

---

## Clarifying Questions Summary — ANSWERED

1. **Primary job-to-be-done?**
   → Users can visualise the graph in an easy-to-read manner and interactively analyse it.

2. **"Clear all filters" — uncheck or reset values?**
   → Unchecks all filters and fully resets to the original state (same as first page load). Equivalent to "never opened the Filters tab."

3. **Confirmation dialog order when file dropped during simulation?**
   → Stop simulation first, then show the confirmation dialog.

4. **String filter >50 values, no tags selected — "enabled" or "disabled" for AND logic?**
   → Enabled filter with nothing selected = passes all nodes ("no restriction"). An empty selection never means zero matches.

5. **Histogram bucket algorithm — which one, and bucket count guards?**
   → Sturges' rule. Min 3 buckets, max 20 buckets.

6. **String color overflow — visible UI warning or console only?**
   → No warning. Assign colors round-robin (cycle through palette). Additionally, users should be able to configure/extend palettes with custom colors so they can avoid overflow if needed.

7. **Stats/histogram when no filters active — all nodes or no nodes?**
   → All nodes. "No filter active" is treated as "all nodes pass."

8. **Export filename — strip existing `-positioned` suffix?**
   → Instead of auto-generating a filename, prompt the user to enter the filename at export time.

9. **Tooltip anchor direction and flip behaviour near canvas edge?**
   → Always position the tooltip to maximise its visibility on screen. Flip horizontally and/or vertically based on available space around the node.

10. **Keyboard-based node selection — out of scope for v1?**
    → Yes, explicitly out of scope.

11. **Loading spinner — parse only, or full parse + build + render cycle?**
    → Full cycle: spinner is shown from file drop until the first render frame is complete.

12. **Arrow key step size for range slider?**
    → 1 unit.

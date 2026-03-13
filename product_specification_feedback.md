# Product Specification Feedback
**Reviewer:** Senior Product Manager
**Date:** 2026-03-12
**Document reviewed:** `product_specification.md`

---

## Overall Assessment

The spec is clear and well-structured for a prototype. The interaction flow is logical, and the filtering model is well-thought-out. However, it has several gaps that will cause friction in development and limit the tool's usefulness at scale. Feedback is organized by priority.

---

## 🔴 Critical Issues

### 1. "Large-Scale Graph" Performance is Underspecified
DoD item #21 says "App does not crash or freeze on 50,000 nodes" — but this is not defined anywhere in the spec body. For large graphs, you need explicit answers to:
- What is the *maximum* supported node/edge count? 50k nodes? 500k?
- What is the *expected* performance budget? (e.g., initial render < 2s, filter response < 100ms)
- Does ForceAtlas2 run at full scale, or does it get disabled/sampled above a threshold?
- Are node labels rendered at all sizes or only when zoomed in past a threshold?

Without these guardrails, the engineer has no target to build to and no way to know when they've succeeded.

**Recommendation:** Add a dedicated "Performance Requirements" section with concrete thresholds.

---

### 2. The Graph is Static — No Indication of Directionality
The spec defines edges with `source` and `target` but never clarifies whether edges are **directed** or **undirected** from a visual standpoint. Does the canvas show arrow heads? Is there a toggle? This is a fundamental graph concept that will change how users interpret the visualization.

**Recommendation:** Explicitly state whether edges are rendered as directed (with arrowheads) or undirected, and whether this is configurable per file or globally.

---

### 3. No "What Does This Tool Actually Help Me Do?" Statement
The spec describes *what* the tool does (load, simulate, filter) but never articulates *why*. What questions is a user trying to answer? "Find highly connected nodes"? "Identify clusters by property"? "Audit graph structure"?

Without a north star user goal, it's easy for features to drift in scope and for the team to make the wrong trade-offs.

**Recommendation:** Add a 2–3 sentence problem statement or user goal at the top of the spec. Example: *"A data analyst has a graph dataset exported from a database. They want to explore its structure, identify clusters, and filter nodes by properties to surface patterns."*

---

## 🟡 Significant Gaps

### 4. Simulation Defaults and Behavior are Underspecified
The spec mentions Gravity and Speed sliders but never defines:
- What are the default values for Gravity and Speed?
- What are the min/max ranges?
- Does the simulation auto-run on file load, or does the user always have to hit Run manually?
- What happens if the user has a 50,000-node graph and hits Run — is there a warning?

ForceAtlas2 on large graphs can lock up the browser tab. The UX for this edge case needs a decision.

**Recommendation:** Define slider defaults and ranges. Specify whether simulation auto-starts. Add an explicit behavior rule for graphs above a performance threshold (e.g., show a warning dialog above 10k nodes).

> ✅ **RESOLVED (2026-03-12):** Simulation is **always manual**. The user must explicitly press Run. It never auto-starts on file load. Slider defaults and ranges still need to be defined.

---

### 5. Filtering Logic for Null Values is Inconsistent
The spec handles null differently per type:
- String: `null` treated as `""` (empty string, included in all-values-selected default)
- Number: `null` → node is grayed out
- Date: not explicitly stated for null
- Boolean: not explicitly stated for null

This inconsistency will confuse users. If a node has a null age, is it grayed out when the age filter is enabled? What if the user *wants* to see null nodes?

**Recommendation:** Define a single, consistent null policy across all types. Consider adding an explicit "Include null values" checkbox per filter panel so the user has control.

> ✅ **RESOLVED (2026-03-12):** Null values are **replaced with type defaults on file load**:
> - String null → `""`
> - Boolean null → `false`
> - Number null → `0`
> - Date null → `"1970-01-01"` (epoch)
>
> On load, if any nulls were defaulted, a **blocking modal** is shown listing each affected property and how many values were replaced (e.g., "age: 12 values defaulted to 0"). The modal stays open until the user explicitly dismisses it with an acknowledgement button. File loads normally using the defaults.

---

### 6. No Node Size / Visual Encoding Beyond Color
Currently, nodes are either light blue (highlighted) or gray (filtered out). For a graph analysis tool, this is very limited. Users naturally expect to encode a second dimension — node degree, a numeric property — via node size.

This may be intentional scope reduction, but if so it should be explicitly called out as a known limitation.

**Recommendation:** Either add "Node size by property" as a feature (even a basic one), or explicitly add it to the "What NOT to Build" section with a rationale.

---

### 7. No Multi-Select or Bulk Actions on Nodes
The spec only describes single-node click → tooltip. For analysis use cases, users often want to:
- Select multiple nodes and compare their properties
- Isolate a neighborhood (show only a clicked node and its direct neighbors)

Again, may be intentional — but the spec is silent on this.

**Recommendation:** Add these to "What NOT to Build" if out of scope, or add a basic "highlight neighbors" interaction for the clicked node.

---

### 8. "Load New File" Resets Everything — Is This Always Right?
The spec says loading a new file "resets the entire app state." For a user who spent 10 minutes tuning their simulation and building filters, this is destructive. No confirmation dialog is specified.

**Recommendation:** Specify whether a confirmation dialog appears before reset ("Loading a new file will clear your current filters and layout. Continue?"). At minimum, document this as a deliberate decision.

---

### 9. The Data Tab Only Analyzes Number Properties
The property analysis dropdown is limited to number-type properties. This misses:
- **String**: value frequency distribution (bar chart of top N values) is extremely useful
- **Date**: timeline distribution histogram would be valuable

For a prototype this is reasonable, but it artificially limits the value of the Data tab for non-numeric datasets.

**Recommendation:** Either scope-limit this explicitly ("v1 stats are numeric only; string/date distributions are post-MVP") or add frequency charts for string/date types.

---

## 🟢 What's Working Well

- **Filter model is solid.** Logical AND across enabled filters, per-filter toggles, and the grayed-out vs. highlighted distinction are all clean and well-defined.
- **Boolean filter as a 3-way toggle** (true / false / either) is the right UX decision — better than a checkbox.
- **Null handling in tooltips** (showing "days ago" for dates) is a nice usability touch.
- **Raw value on hover in tooltip** is smart — shows formatted by default but exposes precision when needed.
- **Error handling table** is comprehensive and covers all realistic failure modes.
- **DoD list is concrete and testable** — good engineering contract.
- **Schema versioning** from day one is the right call.

---

## Clarifying Questions

1. **Who is the primary user?** A data engineer? An analyst? A non-technical stakeholder? This changes nearly every UX decision — especially around complexity of the filter panel.
   > ✅ **RESOLVED (2026-03-12):** Primary user is a technical data engineer or analyst — someone who understands graphs and can interpret visualizations. No hand-holding needed in the UI.

2. **What is the largest real graph this needs to handle well?** Is 50k nodes actually a user requirement, or a stretch goal?
   > ✅ **RESOLVED (2026-03-12):** 50k nodes is a hard user requirement. Datasets will soon reach this size.

3. **Is there a specific domain?** (Social networks, dependency graphs, knowledge graphs, infrastructure maps?) Domain context would sharpen the feature priorities significantly.

4. **Does "prototype" mean internal tool or something that will be demoed to external stakeholders?** This affects how much polish the error states and empty states need.
   > ✅ **RESOLVED (2026-03-12):** This is external-facing. Error states, empty states, and loading states must be polished and visually pleasing.

5. **Is edge directionality intentionally omitted, or just not yet defined?**
   > ✅ **RESOLVED (2026-03-12):** All edges are **undirected**. No arrowheads. `source`/`target` in the schema is a convention, not a semantic direction.

6. **Are there plans for node grouping / clustering visualization** (e.g., community detection output)? If yes, the current color model (blue/gray binary) will need to be redesigned before v2.

---

## Prioritized Improvement Recommendations

| Priority | Item |
|---|---|
| P0 | Add Performance Requirements section with concrete thresholds |
| P0 | Clarify edge directionality rendering |
| P1 | Define simulation defaults, ranges, and large-graph behavior |
| P1 | Normalize null handling across all filter types |
| P1 | Add confirmation dialog for "Load new file" reset |
| P2 | Add problem statement / user goal to top of spec |
| P2 | Explicitly scope out (or in) node size encoding |
| P2 | Explicitly scope out multi-node selection and neighbor highlighting |
| P3 | Consider string/date distributions in Data tab for v1.1 |

---

## Round 2 — Additional PM Review (2026-03-12)

### Scope and Framing

The spec has tightened up in several areas from Round 1 feedback. What follows are new issues not covered by the existing review. These are real problems — not nitpicks.

---

### 1. The Null-Default Modal Will Be Ignored and Then Blamed

The resolved decision in issue #5 says: on load, if any nulls were defaulted, a **blocking modal** lists all affected properties and counts, and the user must dismiss it before proceeding.

This will cause two concrete problems.

**First, it trains users to dismiss immediately without reading.** A data engineer loading a 50k-node graph that touched 18 properties is going to see a modal with potentially 18 rows and click "OK" without reading a single line. The modal will feel like a EULA. The acknowledged-but-ignored silently defaults will then distort their filter results and they will blame the tool, not the data.

**Second, the modal content is disconnected from the actual impact.** "age: 12 values defaulted to 0" tells the user nothing about whether this matters. Were those 12 nodes the most important ones? Were they 12 out of 50,000 (noise) or 12 out of 15 (catastrophic)? The spec does not say whether the modal includes a percentage, a severity indication, or any way to decide whether to proceed or abort.

**Minimum decision needed:** Define whether the modal shows the count as an absolute number, a percentage of total nodes, or both. Define whether there is any "this is a lot of nulls" warning threshold that changes the modal's tone. Define whether there is a way to cancel the load from the modal (if not, why show it at all — a banner would suffice).

---

### 2. String Filter Default State Contradicts the Null-Default Decision

The spec says, for string filters: *"Default state: all values selected (no filtering)."*

Post-null-default resolution, null strings become `""`. This means `""` is a valid value that will appear in the string filter's value list. In the dropdown, a user will see a blank tag alongside real values like `"active"` and `"pending"`. That is confusing and ugly.

The spec is silent on how `""` (defaulted-from-null) is displayed in the string filter UI — as a blank chip? As `"(empty)"`? As `"(null)"`? This needs an explicit decision. If it shows as a blank chip it will look like a bug.

---

### 3. "Majority of Non-Null Values" for Date Detection Is Unspecified

The spec says dates are auto-detected *"when the majority of non-null values are valid ISO 8601 date strings."* This is too vague to implement correctly and will produce inconsistent behavior.

- What is the majority threshold? 51%? 80%? 100%?
- What happens if a column is 60% ISO dates and 40% arbitrary strings? Does it become a string filter or a date filter?
- If it becomes a date filter, what happens to the non-date values?
- What happens if a property has 2 non-null values and 1 is a date?

A developer writing `detectPropertyType.ts` right now has to make all of these calls themselves, and two developers will make different calls. This needs a concrete rule: e.g., "100% of non-null values must be valid ISO 8601 date strings for the property to be detected as date type; otherwise it falls back to string."

---

### 4. The DoD Does Not Test the Null-Default Modal

DoD item #21 covers performance. DoD items #22-24 cover tests and lint. But there is no DoD item that covers the blocking null-default modal introduced in the Round 1 resolution.

The following are untested by any DoD criterion:
- Modal appears when nulls are present
- Modal lists correct property names and counts
- Modal blocks interaction until dismissed
- After dismissal, graph loads with defaults applied
- If no nulls are present, modal does not appear

The DoD was not updated when the null-default decision was made. This is a live gap — the feature will be implemented but the acceptance criteria don't exist.

---

### 5. The "Expanded Histogram" Is Labeled Non-MVP but Lives in the MVP Spec

Under the Data View section, the spec says: *"Expanded histogram (non-MVP): Clicking the histogram opens a modal with a larger, more readable version of the same histogram."*

This is in the main product specification, not in a backlog or appendix. The inline histogram DoD item (#15) only specifies the inline version, but the click handler for expansion would still need to be wired (even if it does nothing) or explicitly disabled. The CLAUDE.md file structure includes no component for a histogram modal.

This is a half-in-scope feature. Developers will either (a) implement it anyway since it's in the spec, (b) wire a no-op click handler, or (c) skip it and later be told it was required. None of these outcomes is clean.

**Decision needed:** Either move it to a "What NOT to Build" entry with a label like "post-MVP," or commit it to the DoD with a specific DoD item. Leaving it in the spec body without a DoD item is a scope leak.

---

### 6. Tooltip "Raw Value on Hover" Is a Tooltip-on-Tooltip — No Implementation Path Given

The spec says: *"Raw values are revealed on hover over each row (e.g. via a tooltip-on-tooltip or a subtle secondary label)."*

The phrase "tooltip-on-tooltip" is listed as an example option but the UX choice is left to the developer. This matters because:

- A tooltip-on-tooltip is technically complex to implement correctly (positioning, z-index, pointer event handling).
- A "subtle secondary label" (e.g., a second line of smaller text per row) is trivial.
- The two options produce completely different visual outputs.

The spec uses "e.g." to dodge the decision. For a DoD-level feature (item #17: "hovering a row reveals the raw value"), the implementation approach needs to be specified. Otherwise the E2E test for this behavior cannot be written deterministically.

---

### 7. The Filter Panel Has No Empty State When No Properties Exist

The spec defines filters for `number`, `string`, `date`, and `boolean` property types. It handles the Data tab's empty state (hide dropdown if no number properties). But it never specifies what the Filters tab shows when the loaded graph has **no properties at all** on any node — which is a valid input per the schema (`properties` is optional).

A user loads a graph where nodes have only `id` and `label`. The Filters tab renders... what? An empty panel? A message saying "No filterable properties"? The spec is silent. This is not an edge case — it's a common input for pure topology graphs.

---

### 8. The "Load New File" Button Location and Behavior After Error Is Unspecified

The spec says a "Load new file" button remains accessible once a graph is loaded. But it says nothing about what happens when the file load **fails** — i.e., validation error on drop.

In that state:
- Is the old graph still displayed (if there was one)?
- Is the drop zone re-enabled immediately?
- Does the "Load new file" button appear or disappear?
- Is the error shown inline on the drop zone, or does it replace the graph canvas?

The spec defines error messages (what text to show) but not error state transitions (what UI state the app is in after the error). The transition back to a usable state is completely undefined.

---

### 9. The Histogram Bucket Count Is Not Specified

DoD item #15 requires a histogram in the Data tab. The spec shows a small ASCII histogram but never states how many buckets it uses. This is a concrete implementation decision that affects:

- Whether the histogram is meaningful for small vs. large value ranges
- Whether unit tests for `computeHistogram.ts` can verify correctness (what is the expected output for a given input if bucket count is undefined?)
- Whether the expanded histogram modal (non-MVP) would use a different bucket count

Without a spec'd bucket count (or a formula, e.g., "Sturges' rule," "fixed at 10"), the implementation is underspecified and the unit test cannot assert a specific output.

---

### 10. Color Values Are Hardcoded in the Spec but Not Centralized

The spec defines three specific color values:
- Highlighted node: `#93c5fd` (light blue)
- Grayed-out node: `#e2e8f0` (slate-200)
- Grayed-out edge: `#cbd5e1`

These are scattered across the Filtering & Highlighting Behavior section. The file structure shows `src/lib/colorScales.ts`, which implies centralization — good. But the spec never states that these constants must live there, and never defines the default (non-filtered) node color or the default edge color. When no filters are active, what color are nodes and edges? "All nodes are highlighted" implies `#93c5fd` always, but that means there is no visual distinction between "highlighted because it passed the filter" and "highlighted because no filter is active" — which may confuse users who expect a neutral default state.

---

## Round 2 — Open Questions for the Owner

These are net-new questions not addressed in the existing feedback file.

1. **Null-default modal severity threshold:** Should the modal change tone (e.g., a warning vs. informational) if more than X% of nodes were affected by null defaulting? Or is it always the same neutral acknowledgment?

2. **Null-default modal: can the user cancel?** If the user sees that 80% of nodes had their `score` defaulted to `0`, can they choose not to load the file? Or is loading with defaults mandatory?
   > ✅ **RESOLVED (2026-03-12):** Yes — the user can cancel the load from the null modal. Cancelling keeps the previously loaded graph (if any) visible and intact.

3. **Empty string in string filter:** How should a blank value (defaulted from null string) be displayed in the filter tag UI? As `""`, `(empty)`, `(null)`, or hidden entirely?
   > ✅ **RESOLVED (2026-03-12):** Display as `""` (double-quote notation, standard programming convention for empty string).

4. **Date type detection threshold:** What exact percentage of non-null string values must be valid ISO 8601 dates for the property to be classified as `date` rather than `string`? Is it 100%, or some lower threshold?
   > ✅ **RESOLVED (2026-03-12):** **100%** — all non-null values must be valid ISO 8601 strings for the property to be classified as date. Any non-date value causes the whole property to fall back to string type.

5. **Nodes with no properties:** What does the Filters tab show when all nodes in the graph have `properties: {}` or omit `properties` entirely?
   > ✅ **RESOLVED (2026-03-12):** Show an empty state message: "No properties."

6. **Error state transitions:** After a failed file drop (validation error), what is the UI state? Is the drop zone re-enabled immediately? If a valid graph was already showing, does it remain visible?
   > ✅ **RESOLVED (2026-03-12):** The previously loaded graph **stays visible**. The error is shown inline; the drop zone re-enables immediately so the user can drop a corrected file.

7. **Default node and edge colors (no filters active):** Is the node color when no filters are active the same `#93c5fd` light blue as the "highlighted" state? If so, what is the visual signal to the user that no filtering is currently applied?
   > ✅ **RESOLVED (2026-03-12):** Default state (no filters active): nodes are **light blue**, edges are **gray**. This is the baseline — the same visual as "all nodes highlighted."

8. **Histogram bucket count:** Is it a fixed number (e.g., 10)? Dynamic based on data range? Specify explicitly so `computeHistogram.ts` can be unit-tested deterministically.
   > ✅ **RESOLVED (2026-03-12):** Use a **smart variable bucket algorithm** (e.g., Sturges' rule or Freedman-Diaconis estimator) — not a fixed count. The goal is a histogram that looks good and provides meaningful information. Unit tests should verify the algorithm's output, not a hardcoded bucket count.

9. **Tooltip raw value reveal mechanism:** Is it a tooltip-on-tooltip, or a secondary line of text per row? This is a DoD-level item and the implementation path needs to be chosen.
   > ✅ **RESOLVED (2026-03-12):** **Second line of text per row.** Each row in the tooltip shows the formatted value on the first line and the raw value as a smaller secondary line beneath it. No tooltip-on-tooltip.

10. **Expanded histogram scope:** Is it genuinely post-MVP (move to "What NOT to Build") or is it in scope for v1? This needs a binary decision, not a parenthetical label in the spec body.
    > ✅ **RESOLVED (2026-03-12):** **Post-MVP.** Move to "What NOT to Build." Remove the "(click to expand)" affordance from the UI entirely.

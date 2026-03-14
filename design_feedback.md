# Design Feedback — Graph Visualizer Spec Review

**Reviewer:** Senior Designer
**Date:** 2026-03-13
**Spec version reviewed:** Current (as provided)

---

## Summary

The spec is well-structured and covers a solid breadth of states for a prototype. The interaction model is coherent and the filtering logic is clear. However, several areas require design decisions before a developer can implement correctly: tooltip positioning edge cases, the visual treatment of simultaneous color-gradient + filter states, unclear focus ring behavior on the canvas, transition/animation expectations, drag-over overlay z-index conflicts, and a number of component-level states that are described in prose but not visualized. The sections below detail every gap I found.

---

## 1. UX Flow and User Journey Gaps

### 1.1 No feedback during file parsing after confirmation

The spec covers the drop zone spinner ("Spinner shown while parsing after drop"), but does not describe what happens during the **re-load flow** — when the user confirms the "Load new file" dialog and the new file is large and takes time to parse. The previous graph is still on screen, the simulation was stopped, but the user has no indication that parsing is in progress. Should the canvas display a loading overlay? Should the sidebar become non-interactive during this period?

### 1.2 "Load new file" button and drag-drop are two entry points with unequal affordance

The spec says: "a 'Load new file' button remains accessible in the top of the left sidebar; clicking it or dropping a new file onto the canvas triggers a confirmation dialog." The button presumably opens a file picker, but the spec does not define what happens if the user clicks "Load new file," the file picker opens, and then they *cancel* the picker — is there any state change? Does the sidebar update to show it was attempted?

### 1.3 No defined "first-run" guidance or empty canvas messaging

After a file is loaded successfully but before the user presses Run, the nodes are placed in random positions and the simulation has not run. For a large graph this may look like a meaningless cluster. There is no onboarding hint or contextual nudge (e.g., "Press Run to position the graph"). The spec explicitly says no hand-holding is needed for the target user — that is fine — but this needs to be a conscious, documented choice rather than an omission.

### 1.4 Tooltip behavior when the selected node is filtered out (grayed)

A user can click a node, open its tooltip, and then enable a filter that grays out that node. The spec does not say what happens to the tooltip when the selected node transitions to the grayed-out state. Three reasonable behaviors exist: (a) tooltip closes automatically, (b) tooltip stays open and shows grayed-out node data, (c) selected ring persists and overrides gray. The color table says "Selected" is blue-500 with 2px ring, but does not address the intersection with the grayed-out state.

### 1.5 No defined behavior for "Randomize Layout" during an active tooltip

If the user has a tooltip open and presses "Randomize Layout," the node moves. The tooltip is anchored to the node's canvas position. The spec says tooltips are "positioned absolutely over the canvas, clamped to canvas bounds" but does not say whether the tooltip tracks the node during a position change or snaps to its new position after randomization completes.

### 1.6 Download Graph — no success/failure feedback

The spec defines the export filename convention but says nothing about what feedback the user receives after clicking "Download Graph." There is no mention of a success toast, a disabled state while generating, or an error state if the export fails. For a large graph this may take a moment.

---

## 2. Component Design and Interaction Patterns

### 2.1 String filter: unclear what "All values as tags" looks like at scale

The spec says: "Default state — few unique values (≤ 50): All values pre-selected (no filtering). Shows all values as tags with a 'Clear all' link." At 50 tags this component will overflow the sidebar (300px wide) substantially. The spec does not define whether tags wrap, truncate, scroll, or collapse. If they wrap, the filter panel could grow very tall in a sidebar that also needs to accommodate other property panels. This needs a defined maximum height with internal scroll.

### 2.2 String filter: selected tags rendered above the search input create ambiguous ordering

The layout shows selected tags above the input. If a user first searches, sees 10 results in the dropdown, selects 3, then closes the dropdown — those 3 tags now appear above the input. But the spec does not define whether the order of tags is (a) alphabetical, (b) order of selection, or (c) order of the distinct value list. Consistency here matters for muscle memory.

### 2.3 String filter dropdown — up to 10 values, but no mention of total count

The dropdown "shows up to 10 matching distinct values." If there are 47 matching values and only 10 are shown, the user has no way to know whether they have seen all matches. A "10 of 47 results — type to narrow" indicator is needed.

### 2.4 The enable/disable checkbox and the collapse chevron are on the same header row — hit area conflict

The spec places a checkbox, property name, type badge, and collapse chevron all in the header row of each filter panel. The spec says "Clicking the chevron (not the checkbox or label) toggles collapse." This implies the label area is *not* a click target for collapse — unusual for an accordion. It also means the header row has at least three distinct interaction zones with no defined minimum widths or separations. The chevron must have a clearly defined hit area so that a click near the checkbox does not accidentally toggle collapse (or vice versa).

### 2.5 Boolean toggle "either" default and visual treatment

The spec shows three states (true / false / either) as radio-style buttons. This is clear in concept. However, no visual specification is given for the selected state vs. unselected state of each button (border color, background, active text color). This needs to be defined so a developer can implement it without making up a design.

### 2.6 Range slider visual specification is incomplete

The spec references dual-handle range sliders for number filters but gives no specification for: track color, handle shape/size, the fill between handles (indicating selected range), or the behavior when min handle and max handle are dragged to the same point (zero-width range). The simulation sliders also use range sliders (single-handle) and are not visually differentiated from filter sliders in the spec.

### 2.7 Date filter — no validation or error state for invalid date input

The spec says date pickers use "after" and "before" bounds, placeholder "Any date." It does not define: what happens if the user types an invalid date, what happens if "after" > "before" (an impossible range), or whether free text entry is allowed or only a calendar picker. If free text is allowed, there needs to be an inline validation error state.

### 2.8 Filter panel collapse does not address the "Clear all filters" button interaction

"Clear all filters" resets all filter controls to their defaults and unchecks all filter enable checkboxes. Does it also expand all collapsed panels? A user who has collapsed a panel, then clears all filters, may not realize their filter was cleared because the panel is collapsed and they cannot see it.

### 2.9 Histogram bars — hover tooltip positioning

The spec says "each histogram bar shows a tooltip on hover with the bucket range and node count." No position is defined — above the bar? Below? Following the cursor? Given the Stats tab is 300px wide and the histogram is described as inline, a tooltip that appears above the bar is most predictable. This needs to be specified.

### 2.10 Color tab — "None" option in property selector not described for the default state

The spec says the default is "Select a property to visualise node colors." But the property selector dropdown default is "None." This creates two representations of the same empty state. It is unclear whether the placeholder message appears in the selector itself or below it. The layout wireframe shows the gradient bar immediately below the palette selector, but what is shown in that space when no property is selected?

---

## 3. Visual Hierarchy and Information Density

### 3.1 Left sidebar is under-utilized relative to right sidebar

The left sidebar (240px) contains: Load button, simulation buttons, two sliders, Randomize, graph node/edge counts, and Download. This leaves significant whitespace. The right sidebar (300px) contains a tabbed panel with potentially 50 filter panels plus Stats and Color. The information density is severely asymmetric. Consider whether graph info (node/edge counts) would be better co-located with the Stats tab (where a user looking at data would naturally look), leaving the left sidebar strictly for simulation controls.

### 3.2 "N nodes match" count at the top of the Filters tab duplicates Stats tab information

The Filters tab shows "N nodes match" and the Stats tab shows "Nodes (filtered): N." These are the same number displayed in two places. The user switching between tabs will see the same value twice in different formats. This duplication should be intentional and documented — or one should be removed.

### 3.3 Section headers in the left sidebar use uppercase at 11px

The spec specifies section headers as "11px, Semibold, Uppercase, muted." At 11px uppercase, inter-letter spacing will be very tight and readability will suffer on non-Retina displays. This is a common pattern but at 11px it can become illegible. 12px would be safer; or use mixed-case with a visual separator instead.

### 3.4 The histogram uses no labeled axes

The inline histogram described in the Stats tab has bars, a hover tooltip, and the spec mentions that bar tooltips show "bucket range and count." But there are no labeled x-axis or y-axis indicators in the static view. A user looking at the histogram for the first time has no scale reference. At minimum, the first and last bucket boundary values should be shown as axis labels.

### 3.5 The color gradient legend needs more specification for discrete (string/boolean) types

The spec says: "For boolean and string types, a discrete legend (colored chips with value labels) is shown instead." For a string property with 40 distinct values and colors reused beyond palette capacity, this discrete legend would be unreadable. A maximum number of legend items (with overflow handling) must be defined.

---

## 4. Unclear or Underdefined Visual/Interaction States

### 4.1 "Grayed-out Run button while simulating" — no specification for the grayed style

The spec says: "The inactive button is grayed out (Run is grayed while simulating; Stop is grayed while stopped)." No hex value, opacity level, or CSS treatment is defined for "grayed out." Is this `opacity: 0.4`? A lighter background fill? Does the button remain in the tab order while grayed? If it is `pointer-events: none` but not `disabled`, screen readers will still announce it as interactive.

### 4.2 "Pulsing indicator" near simulation buttons — undefined animation

The spec says: "a subtle 'Simulating…' label with a pulsing indicator." No animation spec is given — is this a CSS `opacity` pulse, a spinning icon, a blinking dot? Duration? The word "subtle" is subjective. A developer will make an arbitrary choice here.

### 4.3 The drop-over overlay on the canvas — z-index and contrast undefined

The spec says: "When a file is dragged over the window, a dim overlay appears with the text 'Drop to load new graph.'" No overlay color, opacity, or z-index stack is defined. The overlay must sit above the Sigma canvas (which uses a WebGL context) — this is a non-trivial implementation detail that requires the overlay to be a sibling of the canvas in the DOM with a defined z-index. The backdrop color and blur (if any) also need to be specified.

### 4.4 Confirmation dialogs — no visual specification given

Two confirmation dialogs are described (load new file, large graph warning). No visual treatment is defined: modal or popover? Full overlay? Width? Animation (fade in, slide in)? The "Cancel" and "Confirm" button placement follows the spec's prose but no primary/secondary button distinction is defined. Typically the destructive or confirming action is styled as a primary button.

### 4.5 The blocking "N values replaced with defaults" modal — Cancel behavior

The spec says: "Cancel — closes the modal; the previously loaded graph (if any) remains visible and intact. Nothing is reset." This is correct but implies the new file's data was already partially parsed and loaded into memory at the point the modal appeared. On cancel, this partial data must be discarded. This is an implementation detail but it has a visual implication: there should be no flash of the new graph before the modal appears. The spec should state that the graph is not rendered until the user confirms.

### 4.6 Node label rendering threshold — no definition of "rendered radius exceeds 8px"

The spec says: "Node labels appear when the node's rendered radius exceeds 8px on screen." This implies labels appear/disappear dynamically during zoom. No transition is defined — do labels fade in or pop in abruptly? A sudden appearance of hundreds of labels during a zoom gesture will be visually jarring.

### 4.7 1.15x radius for highlighted nodes — no transition defined

"Highlighted nodes are rendered at 1.15× the default radius." When a filter is applied and nodes switch between highlighted and grayed-out states, does the radius change animate or jump? Sigma.js supports attribute animation via its camera but node attribute transitions need to be explicitly coded. The spec should state whether transitions are animated or instant.

### 4.8 Edge width change (1px → 0.5px for grayed-out) — no transition defined

Same issue as 4.7. The edge width changes when an edge becomes grayed-out. Instant or animated?

### 4.9 Canvas filename display — position conflicts with on-screen zoom controls

The spec places the filename in the "top-left corner of the canvas" and the zoom controls in the "bottom-right corner." However, the canvas layout wireframe does not show any padding or safe zone between these overlays and the graph content. A dense graph with many nodes near the corners will be partially obscured by these UI elements. No z-index order or interaction (does the filename overlay block click-through to the canvas?) is defined.

---

## 5. Accessibility Concerns

### 5.1 Canvas is not keyboard-navigable for node selection

The spec defines keyboard navigation for sidebar controls (Tab, Escape, arrow keys) but does not address how a keyboard-only user can select a node to open its tooltip. The Sigma.js canvas is a `<canvas>` element — it is inherently inaccessible to keyboard navigation. This is a known limitation of WebGL/canvas-based tools, but the spec should explicitly acknowledge this scope limitation and define any partial mitigation (e.g., a node list in the sidebar that can be focused to open the tooltip).

### 5.2 "Grayed out" controls at 50% opacity may fail WCAG contrast

The spec says: "When unchecked, the filter is ignored entirely and its controls are dimmed (50% opacity, pointer-events disabled)." 50% opacity applied to text and controls on a white/light background will likely drop below the WCAG AA contrast ratio of 4.5:1 for text at 14px. For a prototype targeting technical users this may be an acceptable trade-off, but it should be an explicit decision, not an oversight.

### 5.3 `aria-live` is defined for filtered node count only

The spec specifies `aria-live="polite"` for the "Nodes (filtered)" count but no other live-updating element. The "N nodes match" count in the Filters tab, the histogram, and any error banners that appear dynamically are not given live region roles. At minimum, error banners and the zero-match banner should use `aria-live="assertive"`.

### 5.4 Color as the sole encoding for node state

The entire filtering and color-gradient system relies exclusively on color to communicate node state (highlighted vs. grayed-out, color gradient values). Users with color vision deficiency (particularly deuteranopia, which affects ~8% of males) may not perceive the difference between `#93c5fd` (highlighted) and `#94a3b8` (default). The spec should acknowledge this and consider a secondary encoding (e.g., node size is already used for highlighted at 1.15x — this is good, but it should be called out as the intentional accessible differentiator).

### 5.5 Focus trap in modal dialogs not specified

The spec describes blocking modals and confirmation dialogs but does not mention focus trapping. When a modal opens, focus must be trapped inside it. When it closes, focus must return to the triggering element. This needs to be specified.

### 5.6 Tooltip close button — minimum touch/click target size

The spec shows a `[×]` close button in the tooltip. No size is specified. At small sizes (e.g., 16×16px) this will be difficult to click accurately, especially when the tooltip is near the canvas edge and the user is trying not to accidentally click a node.

---

## 6. Responsive and Layout Edge Cases

### 6.1 No behavior defined for viewports narrower than the fixed sidebar widths

Left sidebar is 240px, right sidebar is 300px — that is 540px of sidebars alone. On a 1024px-wide display the canvas gets 484px, which is workable. But the spec says the target is 14–16 inch MacBooks. No behavior is defined for what happens if the browser window is resized below ~600px. Do sidebars become scrollable? Do they collapse? Does a minimum window width exist?

### 6.2 Right sidebar at 10+ properties — independent scroll is mentioned but not specified

The spec says: "At 10+ properties, the Filters tab scrolls independently." No scroll behavior details are given — does the tab content area have `overflow-y: auto` with a fixed height? What is the fixed height? Is there a visual shadow or fade at the scroll edge to indicate more content? Does the "N nodes match" count and "Clear all filters" button remain sticky at the top while the filter panels scroll below?

### 6.3 Long property names in filter panel headers

No truncation behavior is defined for property names in filter panel headers. A property named `last_updated_timestamp_utc` will overflow the 300px sidebar header row, especially when it must share space with the type badge, enable checkbox, and collapse chevron.

### 6.4 Node tooltip maximum width and overflow behavior

No maximum width is defined for the tooltip. A node with a long label or a property key/value with long strings could cause the tooltip to overflow the canvas bounds before the clamping logic kicks in. Min/max width constraints need to be defined.

### 6.5 Stats tab — what happens when the histogram is very wide or very narrow

The histogram is described as "inline" within the 300px sidebar. With very few unique values (e.g., 2–3 distinct values in the filtered set), the histogram may have very wide bars or a misleading visual. No minimum bucket count or display behavior for degenerate cases (all nodes have the same value, or only 1 node matches) is defined.

---

## 7. Missing Design States

### 7.1 Simulation: no defined behavior when FA2 converges

ForceAtlas2 does not stop automatically. The spec says the user manually presses Stop. But for a user unfamiliar with force-directed layout, there is no signal that the layout has stabilized. No "stable" indicator or convergence detection is mentioned. (This may be intentionally out of scope, but should be documented.)

### 7.2 Stats tab: empty state when no number properties exist

The Stats tab always shows "Nodes (total)" and "Nodes (filtered)" but the property analysis dropdown "lists all number-type properties." What is shown in the dropdown when no number properties exist in the graph? Is the dropdown hidden, disabled, or does it show an empty state message? The spec covers this for the Filters tab ("No properties.") but not for the Stats tab.

### 7.3 Color tab: state when the selected property disappears from active nodes due to filtering

If a user selects a property in the Color tab and then applies filters such that zero nodes match (all are grayed), the spec says: "If the selected property has no values among active nodes: 'No data for selected property.'" But where exactly does this message appear? Inside the gradient bar area? Below the palette selector? The wireframe for the Color tab does not show this state.

### 7.4 No loading state for stats and histogram computation

The spec says stats + histogram must recompute in < 100ms on filter change. For graphs with 50,000 nodes this may not always be achievable on low-end hardware. No loading or computing indicator is defined for the Stats tab during recomputation.

### 7.5 Graph with a single node

A graph with exactly one node and zero edges is valid (it satisfies "at least one node"). The filter system, stats, histogram, and color gradient should all behave predictably. No edge cases for this degenerate input are described. For example, a range slider initialized to [min, max] where min === max is undefined.

### 7.6 Graph with no edges

Valid per the schema. The edge highlight state logic ("Edges connected to at least one grayed-out node are also grayed out") is not a problem here, but the visual state of a graph with no edges should be mentioned.

### 7.7 Export file: what if the original filename had no extension?

The spec says: "The exported filename is the original loaded filename with `-positioned` appended before the extension (e.g. `my-graph.json` → `my-graph-positioned.json`)." What if the filename is `my-graph` (no extension)? What if it is `my.graph.json` (multiple dots)? The filename manipulation logic needs to handle these cases and the spec should define the expected output.

---

## 8. Typography and Spacing Inconsistencies

### 8.1 The tooltip raw value line is underspecified

The spec says: "Line 2: Raw value (smaller, muted secondary text)." "Smaller" than what? The primary value is at 13px (tooltip row labels). The raw value is listed as 11px. However, the table shows 11px only for the raw value — this is actually defined, but the visual relationship (how much muted? what color?) is left to the developer. Define the muted color explicitly (e.g., `#94a3b8` or `#64748b`).

### 8.2 Tooltip heading size conflicts with section header size

The tooltip heading is 16px Semibold. Section headers in the sidebar are 11px Semibold Uppercase. These serve different hierarchical purposes but the word "Semibold" links them visually. The tooltip heading should be confirmed as the only 16px element in the UI — no other spec element uses 16px — which is fine but worth confirming.

### 8.3 Stat values use "tabular numerals" but no font stack specifies it

The typography table says stat values use "tabular numerals." The font stack is listed as `System-ui`. Not all system fonts include tabular numeral variants on all platforms. On Windows with Segoe UI or on Linux with default system fonts, tabular numeral rendering may differ. The spec should either specify a web font that guarantees tabular numerals or acknowledge this platform variance.

### 8.4 No defined spacing unit system

The spec does not define a base spacing unit (e.g., 4px or 8px grid). Without this, a developer will make arbitrary spacing choices between: filter panel headers and their controls, spacing between filter panels, padding inside the tooltip, sidebar internal padding, button heights, etc. Even a simple statement ("use Tailwind's default 4px base unit") would constrain the implementation.

### 8.5 Inconsistent naming: "Section headers" vs. left sidebar's "SIMULATION" and "GRAPH INFO" labels

The typography table refers to "Section headers" at 11px Semibold Uppercase. The wireframe shows `SIMULATION` and `GRAPH INFO` as section labels in the left sidebar. Are these the same component? If so, the same treatment should apply to any section labels in the right sidebar — but no right sidebar section headers are shown in the wireframe (the right sidebar uses tabs instead of headers).

---

## 9. Decisions Required Before Implementation

The following items are explicitly unresolved in the spec and will require a decision before a developer can implement correctly:

1. **Tooltip + grayed node interaction:** Does the tooltip remain open when the currently selected node is filtered out? (Section: Filtering & Highlighting Behavior)
2. **Tooltip tracking during Randomize Layout:** Does the tooltip follow the node to its new position or close? (Section: Simulation Controls)
3. **Filter panel clear behavior:** Does "Clear all filters" expand all collapsed panels? (Section: Filter panel collapse)
4. **Histogram tooltip position:** Above bar, below bar, or cursor-following? (Section: Stats View)
5. **"Grayed out" button styling:** Hex/opacity values for inactive Run/Stop buttons. (Section: Simulation Controls)
6. **Node label transition on zoom:** Fade or instant pop-in when the 8px threshold is crossed? (Section: Node rendering)
7. **Node size and edge width transitions:** Animated or instant when filter state changes? (Section: Node highlight states)
8. **String filter tag order:** Alphabetical, insertion order, or value-list order? (Section: String filter)
9. **Color tab empty state layout:** Where exactly does "No data for selected property" appear? (Section: Node Color Gradient)
10. **Disabled controls accessibility:** Is `pointer-events: none` + `opacity: 0.5` considered sufficient, or should controls also use the `disabled` attribute? (Section: Filtering & Highlighting Behavior)

---

## 10. Clarifying Questions — ANSWERED

1. **Re: Tooltip on grayed node** — If a node's tooltip is open and the user applies a filter that grays it out, the tooltip **closes automatically**. Grayed-out nodes cannot be clicked to open a tooltip.

2. **Re: Download Graph — success feedback** — Show a **brief toast** notification when the download completes.

3. **Re: "Pulsing indicator" animation** — A small **CSS `animate-pulse` filled dot** (not a spinner, not a blink). Subtle, communicates ongoing background process.

4. **Re: Confirmation dialog visual treatment** — **Centred modal with backdrop**. Not a popover.

5. **Re: Button hierarchy in dialogs** — **Cancel on the left (secondary), Confirm on the right (primary)**. Standard web convention.

6. **Re: Node label transition at 8px threshold** — **Fade in smoothly**. No hard-cut pop-in.

7. **Re: Long property names** — **Truncate with ellipsis** at a fixed width. Applies to filter panel headers and tooltip.

8. **Re: String filter tag overflow at ≤50 values** — **Show a max number of tags with a "+N more" chip**. Clicking expands the tag area. Keeps layout compact.

9. **Re: Date filter — "after" > "before" invalid state** — Show an **inline validation error** below the date fields. Zero nodes pass until resolved.

10. **Re: Base spacing unit** — **4px base unit** (Tailwind's default scale). All component spacing should be a multiple of 4px.

11. **Re: Disabled controls at 50% opacity and WCAG** — **50% opacity is intentional** and acceptable. WCAG exempts disabled controls from contrast requirements. Keep as specced.

12. **Re: Sidebar background color** — **White (`#ffffff`)**. Provides clear visual separation from the canvas (`#f8fafc`).

13. **Re: Histogram Y-axis labels** — **Hover tooltips only**. No static Y-axis labels. Keeps histogram compact in the 300px sidebar.

14. **Re: Z-index layering** — From top to bottom: **Modal > Drag-drop overlay > Node tooltip > Canvas controls (+/−/fit)**.

15. **Re: "No nodes match" banner placement** — **Inside the right sidebar**, below the "N nodes match" count in the Filters tab. Canvas stays clean.

---
title: Explore
description: Pan, zoom, rotate, hover for labels, click for properties. Keyboard shortcuts. No tool modes.
---

*Direct canvas manipulation. Pan with drag, zoom with scroll, rotate with Shift+scroll. Every action is always available — no tool modes to switch between.*

The canvas is always live. You're never in a "tool" that you need to exit; every input is interpreted in context. That's the single most-important thing to internalise — the rest of this page is details.

## Mouse & keyboard

| Action | How |
|---|---|
| Pan | Click + drag anywhere on the canvas |
| Zoom | Scroll wheel (or trackpad pinch) |
| Rotate canvas | Shift + scroll, or the ↺ / ↻ buttons (15° per click) |
| Fit to view | Fit button (the frame icon), or hit Run then Stop on the simulation |
| Start/stop simulation | `Space` |
| See a node's label | Hover |
| See a node's full properties | Click the node |
| Close the tooltip | `Escape`, or click outside the node |
| Keyboard shortcuts overlay | `?` |

Mouse interactions disable themselves while the force simulation is running (rotation, click-to-inspect) — press **Space** to pause, interact, then **Space** to resume. Pan and zoom stay live during the sim so you can follow the layout as it settles.

## Labels

Labels render as HTML overlays on top of the GPU canvas, not as part of the WebGL scene. That matters because:

- **They cap at 300 visible at once.** Above that, positions are stride-sampled from what's currently on screen — you get a representative scatter rather than a solid wall of text. Zoom in to see more.
- **They auto-disable during simulation on graphs above 50k nodes.** Updating 50,000 DOM nodes every frame would tank the browser; and labels would be illegible while nodes are in motion anyway. The toggle is in the left sidebar (**Show node labels**).
- **The text follows node positions one-to-one** once the sim stops. Zoom, pan, rotate all keep labels pinned.

If you have a small graph (<300 nodes) and want labels always on: leave **Show node labels** ticked; everything stays visible throughout.

## Neighbour highlight

Hover a node with **Highlight neighbours on hover** enabled (left sidebar, Display section). The hovered node's direct neighbours stay at full opacity; everything else — non-neighbour nodes *and* edges that don't touch a neighbour — dims to alpha 0.1. Clearest way to see a node's local structure without zooming in.

Two nuances worth knowing:

- **Neighbours here means *direct* neighbours only** — one hop. We don't compute n-hop reachability on hover; that would stutter on dense graphs.
- **Dimming respects the filter set.** If you've filtered out a node it stays filtered, not dimmed — highlight only operates on the visible subset.

## Inspecting a node

Click a node (not during simulation) and a tooltip opens showing **every property** the node carries, in the order they were parsed from the source file. For nodes loaded with `nodePropertiesMetadata` (JSON format only — see [Input formats](/docs/input-formats)), each property shows its description as a popover when you hover the `?`.

The tooltip is mouse-aware: it closes when you click outside, press Escape, or click another node.

## Rotation

Rotation applies a 2D rotation matrix to the actual node positions around their centre of mass — it isn't a CSS transform on the canvas. Three implications:

- Edges and labels stay correct relative to the rotated positions.
- Exported JSON preserves the rotation (the `x`/`y` values you download are the rotated ones).
- Rotating with the mouse or buttons is disabled during simulation, because the force sim overwrites positions every tick; rotating would race.

## Gotchas

- Scroll-zoom can conflict with OS-level trackpad gestures (macOS Mission Control swipe, Windows touch zoom). Use the `+` / `−` buttons as a fallback.
- The **Show node labels** toggle respects the 50k auto-disable — turning it on for a 1M-node graph during simulation still hides them until the sim stops.
- The right-click menu is the browser's native menu. We don't override it; that means dragging doesn't trigger a selection rectangle or custom context.
- Touch devices (iPad Safari) support pan and pinch-zoom but not rotation — Shift doesn't exist on touch.

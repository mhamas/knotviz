---
title: Explore
description: Pan, zoom, rotate, hover for labels, click for properties. No tool modes.
---

*Direct canvas manipulation. Pan with drag, zoom with scroll, rotate with Shift + scroll. Every action is always available — no tool modes to switch between.*

The canvas is always live. You're never in a mode you need to exit; every input is interpreted in context. Internalise that and the rest of this page is details.

## Mouse & keyboard

| Action | How |
|---|---|
| Pan | Click + drag anywhere on the canvas |
| Zoom | Scroll wheel (or trackpad pinch) |
| Rotate canvas | Shift + scroll, or the ↺ / ↻ buttons (15° per click) |
| Fit to view | Fit button (the frame icon), or hit Run then Stop on the simulation |
| Start / stop simulation | `Space` |
| See a node's label | Hover |
| See a node's full properties | Click the node |
| Close the tooltip | `Escape`, or click outside the node |
| Shortcuts cheatsheet | Click the `?` button in the bottom-right of the canvas |

While the simulation is running, rotation and click-to-inspect are disabled — press **Space** to pause, interact, then **Space** to resume. Pan and zoom stay live during the sim so you can follow the layout as it settles.

## Labels

- **Up to 300 labels are shown at once.** Above that, Knotviz samples a representative spread from what's on screen; zoom in to see more.
- **Labels auto-hide during simulation on graphs above 50k nodes.** They'd be illegible while nodes are moving, and drawing thousands of them every frame would jank the browser. Toggle them under **Show node labels** in the left sidebar.
- **Labels follow node positions** once the sim stops — zoom, pan, and rotate keep them pinned.

If you have a small graph (under 300 nodes) and want labels always on: leave **Show node labels** ticked.

## Neighbour highlight

Enable **Highlight neighbours on hover** in the left sidebar (Display section), then hover a node. Its direct neighbours stay at full opacity; everything else dims. Clearest way to see a node's local structure without zooming.

- Only *direct* neighbours — one hop away — are highlighted.
- Filtered-out nodes stay hidden; highlight only operates on what's currently visible.

## Inspecting a node

Click a node (while the simulation is paused) and a tooltip opens showing every property on that node, in the order they appeared in the source file. If the file had `nodePropertiesMetadata` descriptions (JSON-only), each property gets a `?` popover with the description.

Close the tooltip with `Escape`, by clicking outside the node, or by clicking another node.

## Rotation

Rotating moves the actual node positions — not just the view. A few practical implications:

- Edges and labels stay correctly placed relative to the rotated positions.
- Exported JSON preserves the rotation: the `x` / `y` values you download are post-rotation.
- Rotation is disabled while the simulation is running (the sim would immediately overwrite the rotated positions).

## Gotchas

- Scroll-zoom can conflict with OS trackpad gestures (macOS Mission Control swipe, Windows touch zoom). Use the `+` / `−` buttons as a fallback.
- **Show node labels** respects the 50k auto-disable — turning it on for a 1M-node graph during simulation still hides them until the sim stops.
- Right-click opens the browser's native menu. Knotviz doesn't intercept it, so there's no lasso-select or custom context menu on drag.
- Touch devices (iPad Safari) support pan and pinch-zoom but not rotation — Shift doesn't exist on touch.

# Task 08b: Canvas Rotation

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** S
**Prerequisites:** Task 08

## Goal

The user can rotate the graph canvas. A rotation button is added to the canvas controls, and keyboard/gesture rotation is supported.

## Deliverables

### Files to modify
- `src/components/CanvasControls.tsx` — add rotate left / rotate right buttons
- `src/components/GraphView.tsx` — add rotation handlers

## Implementation Notes

### Sigma camera rotation
Sigma.js camera supports an `angle` property (radians). Use:
```ts
const camera = sigma.getCamera()
// Rotate 15° clockwise
camera.animatedReset({ angle: camera.getState().angle + Math.PI / 12, duration: 200 })
// Reset rotation
camera.animatedReset({ angle: 0, duration: 200 })
```

### CanvasControls additions
Add two buttons below the existing +/−/⊡ stack:
- `↻` (rotate clockwise 15°)
- `↺` (rotate counter-clockwise 15°)

Or alternatively: a single "reset rotation" button that resets angle to 0, combined with Shift+scroll for free rotation.

### Approach options (choose at implementation time)
1. **Button-based**: Add rotate CW/CCW buttons to CanvasControls
2. **Shift+scroll**: Hold Shift + scroll wheel to rotate — more natural, no extra buttons
3. **Both**: Buttons + Shift+scroll

### Props extension
```ts
interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onRotateCW: () => void
  onRotateCCW: () => void
}
```

## Tests

### Manual verification
- Load a graph, rotate using controls or Shift+scroll — graph rotates smoothly
- Fit button should also reset rotation angle to 0
- Rotation persists across zoom changes

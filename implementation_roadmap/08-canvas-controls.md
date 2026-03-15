# Task 08: Canvas Controls and Navigation

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** S
**Prerequisites:** Task 07

## Goal

The user can zoom in/out, fit the camera, and see the loaded filename on the canvas. The canvas resizes correctly when the browser window is resized. All on-screen controls are positioned absolutely over the Sigma canvas.

## Deliverables

### Files to create
- `src/components/CanvasControls.tsx`
- `src/components/FilenameLabel.tsx`

### Files to modify
- `src/components/GraphView.tsx` — mount `CanvasControls` and `FilenameLabel`; add resize handler

## Implementation Notes

### `CanvasControls`
```ts
interface Props { onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }
```
- `position: absolute`, bottom: 12px, right: 12px, z-index: 10
- Three `Button` (shadcn, variant `outline`, size `icon` — 32×32px) stacked vertically: `+` / `−` / `⊡`
- Hover: `hover:bg-slate-50`. Active: `active:bg-slate-100`.

Handlers in `GraphView`:
```ts
onZoomIn:  () => sigma.getCamera().animatedZoom({ duration: 200 })
onZoomOut: () => sigma.getCamera().animatedUnzoom({ duration: 200 })
onFit:     () => sigma.fit()
```

### `FilenameLabel`
```ts
interface Props { filename: string }
```
- `position: absolute`, top: 8px, left: 12px, z-index: 10
- Color: `#94a3b8`, font-size: 12px

### Canvas resize handler (in `GraphView` Sigma init effect)
```ts
const handleResize = useDebounce(() => sigma.resize(), 100)
window.addEventListener('resize', handleResize)
return () => {
  window.removeEventListener('resize', handleResize)
  sigma.kill()
}
```

### Z-index reference
| Layer | z-index |
|---|---|
| Canvas controls + filename label | 10 |
| Drag overlay | 20 |
| Node tooltip | 30 |
| Modals | 50 |

## Tests

### Manual verification
- Load `sample-graph.json`
- Click `+` → canvas zooms in smoothly
- Click `−` → canvas zooms out smoothly
- Click `⊡` → camera fits all nodes in view
- Scroll-zoom with mouse wheel works
- Pan by click-and-drag works
- Filename `"sample-graph.json"` shown top-left of canvas in muted grey
- Resize browser window → canvas redraws without layout breakage

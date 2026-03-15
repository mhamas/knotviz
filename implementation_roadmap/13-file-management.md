# Task 13: File Management (Load New File)

**Release:** R1 | **Chunk:** 3 — File Management
**Size:** S
**Prerequisites:** Task 11

## Goal

The user can safely replace a loaded graph. A confirmation dialog prevents accidental state loss. If simulation is running when a new file is dropped, it is stopped first before the dialog is shown. A full-canvas overlay gives visual feedback when dragging a file over the loaded graph.

## Deliverables

### Files to create
- `src/components/DragOverlay.tsx`

### Files to modify
- `src/components/GraphView.tsx` — window drag events, confirmation dialog, new-file sequence
- `src/components/LeftSidebar.tsx` — wire "Load new file" button

## Implementation Notes

### `DragOverlay`
```ts
interface Props { isVisible: boolean }
```
- `position: absolute`, covers entire Sigma canvas container, z-index: 20
- Background: `rgba(0, 0, 0, 0.4)`
- Centered text: `"Drop to load new graph."` (white, 16px, semibold)
- Smooth fade via:
  ```tsx
  className={`transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  ```

### New-file confirmation dialog (`AlertDialog`)
Text: `"Loading a new file will clear the current graph. Continue?"`
Buttons: `[Cancel]` (ghost) | `[Load new file]` (primary)

### Drop-while-loaded sequence (⚠ order matters — DoD item 6)
1. `dragover` on `window` → show `<DragOverlay>`
2. `drop` on `window` → if simulation is running: call `stop()`, await `'stop'` worker event
3. After stop confirmed: show `AlertDialog`
4. Cancel → call `start()` if simulation was running; hide overlay
5. Confirm → call `onLoadNewFile()` → App resets to DropZone

### "Load new file" button
Clicking the button in LeftSidebar also triggers the confirmation dialog (same flow, skip stop-simulation check since drop is not in progress).

## Tests

### E2E — `e2e/simulation.spec.ts` (extend)
- With graph loaded and simulation running: drag file over canvas → overlay appears
- Drop file while simulating → simulation stops, then confirmation dialog appears
- Cancel → current graph intact, simulation resumes
- Confirm → app resets to DropZone

### Manual verification
- Load `sample-graph.json`
- Click "Load new file" → confirmation dialog appears
  - Cancel → graph stays
  - Confirm → DropZone reappears
- Start simulation, then drag a new file over canvas
  - Overlay `"Drop to load new graph."` appears while dragging
  - Drop file → simulation stops, confirmation dialog appears
  - Cancel → graph intact, simulation restarts
  - Confirm → app resets

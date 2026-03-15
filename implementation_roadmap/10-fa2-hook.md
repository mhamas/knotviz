# Task 10: useFA2Simulation and useDebounce Hooks

**Release:** R1 | **Chunk:** 2 — Simulation
**Size:** M
**Prerequisites:** Task 07

## Goal

`useFA2Simulation` manages a ForceAtlas2 Web Worker that runs off the UI thread. `useDebounce` provides a single reusable debounce primitive used by every continuous control in the app. After this task, the simulation can be started, stopped, and randomized programmatically — the UI controls are wired in Task 11.

## Deliverables

### Files to create
- `src/hooks/useDebounce.ts`
- `src/hooks/useFA2Simulation.ts`

## Implementation Notes

### `useDebounce`
```ts
export function useDebounce<T extends (...args: unknown[]) => unknown>(fn: T, delay = 150): T
```
Returns a stable debounced function (stable across re-renders — use `useRef` internally).
Used by: gravity/speed sliders, number filter range, date pickers, string search, canvas resize.

### `useFA2Simulation` types
```ts
interface SimulationSettings { gravity: number; speed: number }
interface FA2SimulationHandle {
  isRunning: boolean
  errorMessage: string | null
  start: () => void
  stop: () => void
  randomizeLayout: () => void
}
export function useFA2Simulation(graph: Graph | null, settings: SimulationSettings): FA2SimulationHandle
```

### FA2 worker import
```ts
import FA2Layout from 'graphology-layout-forceatlas2/worker'
```

### Settings mapping
- `gravity` slider value → FA2 `gravity` option
- `speed` slider value → FA2 `scalingRatio` option

### ⚠ Stop is asynchronous — never call `start()` immediately after `stop()` in the same tick
```ts
// Correct pattern for settings change:
layout.once('stop', () => {
  layout.updateSettings(newSettings)
  layout.start()
})
layout.stop()
```

### Slider change debounce cycle
`useDebounce(150ms)` expires → `stop()` → await `'stop'` event → `updateSettings` → `start()`

### `randomizeLayout` sequence
1. Record current `isRunning` state
2. If running: `stop()` and await `'stop'` event
3. `random.assign(graph, { scale: 1, center: 0 })` (from `graphology-layout-random`)
4. `sigma.fit()` — requires sigma reference; pass sigma as second arg or call via callback
5. Restart only if was running in step 1

### Worker error handling (both paths must set `errorMessage`)
- `layout.on('killed', ...)` — FA2 library-level termination (out of memory)
- `layout.supervisor.worker.onerror = ...` — unhandled JS exception in worker
- Both: set `errorMessage = "Simulation failed — reload file to continue."`, set `isRunning = false`
- `errorMessage` persists until the user loads a new file

### Cleanup
```ts
return () => layout.kill()
```

## Tests

### Manual verification (UI wired in Task 11; test logic here)
- After Task 11: click Run → `isRunning` becomes true, FA2 runs in worker
- Click Stop → simulation halts, `isRunning` becomes false
- Changing gravity slider → simulation stops, updates setting, restarts without UI freeze
- Click Randomize → nodes redistributed, camera resets to fit
- Verify UI thread is not blocked during simulation (scroll/zoom works while running)

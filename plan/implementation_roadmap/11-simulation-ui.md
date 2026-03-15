# Task 11: Simulation UI Controls

**Release:** R1 | **Chunk:** 2 — Simulation
**Size:** M
**Prerequisites:** Task 10

## Goal

The left sidebar is fully wired for simulation: Run/Stop buttons, Simulating indicator, gravity/speed sliders with log scale, Randomize Layout button, and worker error display. The large-graph confirmation dialog blocks simulation start when node count exceeds 10,000.

## Deliverables

### Files to modify
- `src/components/LeftSidebar.tsx` — implement all simulation UI (was stubbed in Task 09)
- `src/components/GraphView.tsx` — connect `useFA2Simulation`, pass props to `LeftSidebar`

## Implementation Notes

### Slider log scale
Gravity and speed sliders both use log scale with range `[0.1, 10.0]`.
Display: show current value below the slider track.
`onChange` is debounced at 150ms inside `LeftSidebar` using `useDebounce`.

### Run / Stop button states
- Inactive button: `opacity-50 pointer-events-none`
- While running: Stop button active, Run button inactive
- While stopped: Run button active, Stop button inactive

### "Simulating…" indicator
Visible only while `isRunning === true`:
```tsx
<span className="animate-pulse inline-block w-2 h-2 rounded-full bg-blue-500" />
<span>Simulating…</span>
```

### Simulation error display
Rendered below Run/Stop row, only when `simulationError !== null`:
```
"Simulation failed — reload file to continue."
```
Style: 12px, `text-red-500`. Run button remains enabled (user can attempt to restart).

### Large-graph warning dialog
Trigger: user clicks Run when `graph.order > 10_000`.
```
AlertDialog:
  Title: "Large graph"
  Body: "This graph has N nodes. The simulation may be slow."
  Buttons: [Cancel] (ghost) | [Run anyway] (primary)
```
On "Run anyway": call `start()`.
On "Cancel": do nothing (simulation remains stopped).

### `GraphView` wiring
```ts
const simulationHandle = useFA2Simulation(graph, simulationSettings)
// Pass to LeftSidebar:
isRunning={simulationHandle.isRunning}
simulationError={simulationHandle.errorMessage}
onRun={handleRun}          // checks node count first, shows dialog if > 10k
onStop={simulationHandle.stop}
onGravityChange={(v) => setSimulationSettings(s => ({ ...s, gravity: v }))}
onSpeedChange={(v) => setSimulationSettings(s => ({ ...s, speed: v }))}
onRandomizeLayout={simulationHandle.randomizeLayout}
```

## Tests

### E2E — `e2e/simulation.spec.ts`
- Click Run → "Simulating…" indicator appears
- Click Stop → indicator disappears
- Gravity slider change → simulation stops and restarts (indicator blinks off then on)
- Click "↺ Randomize Layout" → nodes visibly re-randomise, camera fits
- Load a graph with >10k nodes → clicking Run shows large-graph dialog
  - Click "Cancel" → dialog closes, simulation not started
  - Click "Run anyway" → simulation starts

### Manual verification
- Gravity slider moves smoothly; value updates beneath it
- Speed slider similarly functional
- Simulation runs visibly (node positions change over time)
- Changing slider mid-simulation → brief pause then resumes — no crash
- Closing and reopening browser with graph loaded → simulation in stopped state

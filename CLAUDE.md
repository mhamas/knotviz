# Graph Visualizer — Project Context

Single-page React + TypeScript app that lets a user drag-and-drop a JSON graph file, visualizes it using **Sigma.js + Graphology**, and lets them run and tune a **ForceAtlas2 spring simulation** via basic sliders.

The goal is a clean, working prototype — not a production app. Prioritize correctness and clarity over polish.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Graph rendering | `sigma` (v3) |
| Graph data model | `graphology` |
| Spring layout | `graphology-layout-forceatlas2` |
| Styling | Tailwind CSS v3 |
| Build tool | Vite |
| Unit testing | Vitest |
| E2E testing | Playwright |
| Linting | ESLint + Prettier |

---

## Input Format

The app accepts a single `.json` file dropped onto the drop zone. The file must conform to a versioned JSON schema (schema stored in `src/lib/graphSchema.json`). On load, the file is validated against the schema before rendering.

**Top-level fields:** `version` (required, string — e.g. `"1"`), `nodes` (array), `edges` (array). **Node fields:** `id` (required), `label` (optional), `properties` (optional — key/value pairs where values are numbers or ISO 8601 date strings). **Edge fields:** `source`, `target` (both required), `label` (optional).

Date property values are converted to milliseconds elapsed since that date (older = larger). Missing property values on a node are **replaced with type defaults on load**: number → `0`, string → `""`, boolean → `false`, date → `"1970-01-01"`. If any values were defaulted, a blocking modal is shown on load displaying the total replacement count; the user may cancel the load or confirm and proceed.

---

## File Structure

```
graph-viz/
├── e2e/
│   ├── fixtures/sample-graph.json
│   ├── drop-zone.spec.ts
│   ├── simulation.spec.ts
│   └── property-analysis.spec.ts
├── src/
│   ├── components/
│   │   ├── DropZone.tsx, GraphView.tsx, LeftSidebar.tsx, RightSidebar.tsx
│   │   ├── NodeTooltip.tsx, PropertyFilterPanel.tsx, FilterSlider.tsx
│   ├── hooks/
│   │   ├── useFA2Simulation.ts
│   │   └── usePropertyAnalysis.ts
│   ├── lib/
│   │   ├── buildGraph.ts, validateGraph.ts, colorScales.ts
│   │   ├── computeStats.ts, computeHistogram.ts, detectPropertyType.ts
│   ├── test/         # Vitest unit tests for lib/ functions only
│   ├── types.ts, App.tsx, main.tsx, index.css
├── playwright.config.ts, vite.config.ts, tailwind.config.js
├── tsconfig.json, .eslintrc.cjs, .prettierrc
```

---

## Key Patterns

- **FA2 simulation** runs in a Web Worker (`graphology-layout-forceatlas2/worker`) to keep the UI thread free. Slider changes: `stop()` → update settings → `start()`. Reset: `stop()` → randomize positions → `start()`.
- **Node color updates** apply without remounting Sigma: `graph.updateEachNodeAttributes(...)` + `sigma.refresh()`.
- **Unit tests** cover only pure functions in `lib/`. No React Testing Library component tests — E2E covers UI.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid JSON | "Invalid JSON file" |
| Missing `nodes` or `edges` | "File must contain `nodes` and `edges` arrays" |
| Node missing `id` | Skip node, `console.warn` |
| Edge to unknown node id | Skip edge, `console.warn` |
| Empty graph (0 nodes) | "Graph has no nodes to display" |
| Property value not number or string | Treat as null, `console.warn` |
| Date string fails `new Date()` parse | Treat as null, `console.warn` |
| Sigma mount fails | Catch in `useEffect`, render fallback error |
| Tooltip off-canvas | Clamp position within canvas bounds |

---

## JSDoc Rules

Every exported function, hook, and component must have a one-sentence description, `@param`, `@returns`, `@throws` (if applicable), and `@example` (pure functions). Document props interfaces and hook return shapes. Do NOT document internal helpers or obvious one-liners.

---

## What NOT to Build

- No routing, no backend/API calls, no multi-property comparison
- No edge weight visualization, no export, no undo/redo
- No React Testing Library component tests (E2E covers this)

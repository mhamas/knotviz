# Graph Visualizer — Project Context

Single-page React + TypeScript app that lets a user drag-and-drop a JSON graph file, visualizes it using **Sigma.js + Graphology**, and lets them run and tune a **ForceAtlas2 spring simulation** via basic sliders.

The goal is a clean, working prototype — not a production app. Prioritize correctness and clarity over polish.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Graph rendering | `sigma` (v3) |
| Graph data model | `graphology` |
| Spring layout | `graphology-layout-forceatlas2` |
| UI components | shadcn/ui v4 (Base UI primitives) |
| Styling | Tailwind CSS v4 (PostCSS plugin) |
| Build tool | Vite 8 |
| Unit testing | Vitest |
| E2E testing | Playwright |
| Linting | ESLint 9 (flat config) + Prettier |

---

## Input Format

The app accepts a single `.json` file dropped onto the drop zone. The file must conform to a versioned JSON schema (schema stored in `src/lib/graphSchema.json`). On load, the file is validated against the schema before rendering.

**Top-level fields:** `version` (required, string — e.g. `"1"`), `nodes` (array), `edges` (array). **Node fields:** `id` (required), `label` (optional), `properties` (optional — key/value pairs where values are `number`, `string`, `boolean`, or ISO 8601 date strings). **Edge fields:** `source`, `target` (both required), `label` (optional).

Date property values are stored and filtered as **ISO 8601 strings** — no conversion to milliseconds. Elapsed time (e.g. "1,423 days ago") is computed at display time in the tooltip only. Missing property values on a node are **replaced with type defaults on load**: number → `0`, string → `""`, boolean → `false`, date → `"1970-01-01"`. If any values were defaulted, a blocking modal is shown on load displaying the total replacement count; the user may cancel the load or confirm and proceed.

---

## File Structure

```
grapphy/
├── plan/                # Product spec, implementation plan, roadmap tasks
├── e2e/
│   ├── fixtures/sample-graph.json
│   ├── drop-zone.spec.ts
│   ├── simulation.spec.ts
│   └── property-analysis.spec.ts
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui generated components (lint-excluded)
│   │   ├── DropZone.tsx, GraphView.tsx, LeftSidebar.tsx, RightSidebar.tsx
│   │   ├── NodeTooltip.tsx, PropertyFilterPanel.tsx, FilterSlider.tsx
│   ├── hooks/
│   │   ├── useFA2Simulation.ts
│   │   └── usePropertyAnalysis.ts
│   ├── lib/
│   │   ├── buildGraph.ts, validateGraph.ts, colorScales.ts
│   │   ├── computeStats.ts, computeHistogram.ts, detectPropertyType.ts
│   ├── test/            # Vitest unit tests for lib/ functions only
│   ├── types.ts, App.tsx, main.tsx, index.css
├── playwright.config.ts, vite.config.ts, postcss.config.js
├── tsconfig.json, eslint.config.js, .prettierrc
```

---

## Verification (MANDATORY)

After every implementation change, you MUST run `npm run verify` before considering the work done. This runs typecheck + lint + unit tests in sequence. All three must pass with zero errors.

```bash
npm run verify    # tsc --noEmit && eslint src && vitest run
```

Individual commands if needed:
- `npm run typecheck` — TypeScript type checking (strict mode)
- `npm run lint` — ESLint (warnings from `src/components/ui/` are excluded)
- `npm run test` — Vitest unit tests
- `npm run build` — Full production build (typecheck + Vite bundle)

### Visual verification with Playwright MCP

When implementing UI components or making visual changes, use the Playwright MCP tools to verify the rendered output in a real browser. This closes the feedback loop without manual checking.

Workflow:
1. Start the dev server (`npm run dev`) if not already running
2. Use `browser_navigate` to open `http://localhost:5173`
3. Use `browser_snapshot` to inspect the DOM and verify component rendering
4. After code changes, navigate again to refresh and re-check

Use this for: layout issues, component visibility, drag-and-drop flows, tooltip positioning, filter UI state, canvas rendering. Do NOT rely solely on unit tests for UI correctness.

---

## Task Workflow

Progress is tracked in `plan/implementation_roadmap/progress_tracking.md`. Before starting work, read that file to find the next task. After completing a task:

1. Run `npm run verify` — must pass with zero errors.
2. If the task adds UI, use Playwright MCP to visually verify the rendered output.
3. If the task warrants user testing (UI changes, new interactions), tell the user what to test and how (e.g. "run `npm run dev` and try dragging a JSON file onto the drop zone").
4. Mark the task `[x]` in `progress_tracking.md` and update the "Next task" line.
5. Commit and push.

Status markers: `[x]` done, `[ ]` not started, `[>]` in progress.

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

# Knotviz — Project Context

Vite Multi-Page App (MPA) with two independent entry points:

- **Homepage** (`/`) — static HTML + Tailwind marketing page, SEO-friendly, no React. Content lives directly in `index.html`.
- **Graph app** (`/graph`) — React + TypeScript SPA that lets a user drag-and-drop a JSON graph file, visualizes it using **@cosmos.gl/graph** (GPU-accelerated WebGL), and lets them run and tune a **GPU force-directed simulation** targeting 1M+ nodes.

Path alias: `@/` → `src/graph/` (all graph app imports use `@/`).

Production-grade graph visualization tool. Prioritize performance, correctness, and maintainability.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Graph rendering + layout | `@cosmos.gl/graph` (GPU-accelerated WebGL force graph) |
| UI components | shadcn/ui v4 (Base UI primitives) |
| Styling | Tailwind CSS v4 (PostCSS plugin) |
| Build tool | Vite 8 |
| Unit testing | Vitest (jsdom) |
| Component testing | Vitest Browser Mode (Playwright provider) |
| E2E testing | Playwright |
| Linting | ESLint 9 (flat config) + Prettier |

---

## Input Format

The app accepts a single `.json` file dropped onto the drop zone. The file must conform to a versioned JSON schema (schema stored in `src/graph/lib/graphSchema.json`). On load, the file is validated against the schema before rendering.

**Top-level fields:** `version` (required, string — e.g. `"1"`), `nodes` (array), `edges` (array). **Node fields:** `id` (required), `label` (optional), `properties` (optional — key/value pairs where values are `number`, `string`, `boolean`, `string[]` (array of strings), or ISO 8601 date strings). **Edge fields:** `source`, `target` (both required), `label` (optional).

Date property values are stored and filtered as **ISO 8601 strings** — no conversion to milliseconds. Elapsed time (e.g. "1,423 days ago") is computed at display time in the tooltip only. Missing property values on a node are **replaced with type defaults on load**: number → `0`, string → `""`, string[] → `[]`, boolean → `false`, date → `"1970-01-01"`. If any values were defaulted, a blocking modal is shown on load displaying the total replacement count; the user may cancel the load or confirm and proceed.

---

## File Structure

```
knotviz/
├── index.html                  # Homepage (static HTML + Tailwind) → serves at /
├── graph/
│   └── index.html              # Graph SPA HTML entry → serves at /graph
├── e2e/                        # Playwright E2E tests
│   ├── fixtures/               # Test graph files (sample, screenshot, invalid, empty, etc.)
│   ├── homepage.spec.ts        # Homepage E2E tests
│   ├── drop-zone.spec.ts
│   ├── graph-view.spec.ts
│   ├── simulation.spec.ts
│   ├── filters.spec.ts
│   └── ...                     # Other graph app E2E specs
├── src/
│   ├── styles/
│   │   └── globals.css         # Shared Tailwind theme, tokens, fonts
│   ├── homepage/
│   │   └── main.ts             # CSS-only entry (imports globals.css for Tailwind)
│   ├── graph/                  # Graph mini-app (all graph code lives here)
│   │   ├── main.tsx            # createRoot entry
│   │   ├── App.tsx             # Graph root component
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui generated components (lint-excluded)
│   │   │   ├── sidebar/        # Reusable sidebar design system (see below)
│   │   │   ├── filters/        # Filter UI components
│   │   │   ├── __tests__/      # Vitest Browser Mode component tests
│   │   │   ├── DropZone.tsx, GraphView.tsx, LeftSidebar.tsx, RightSidebar.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useCosmos.ts    # Core: Cosmos.gl lifecycle, worker comms, camera, simulation
│   │   │   ├── useFilterState.ts, useFileDrop.ts, useSpacebarToggle.ts, useDebounce.ts
│   │   ├── workers/
│   │   │   └── appearanceWorker.ts  # Web Worker: filter matching + gradient + link visibility
│   │   ├── lib/
│   │   │   ├── buildGraph.ts, validateGraph.ts, parseJSON.ts
│   │   │   ├── applyNullDefaults.ts, detectPropertyTypes.ts
│   │   │   ├── graphSchema.json, utils.ts
│   │   ├── stores/             # Zustand stores
│   │   └── test/               # Vitest unit tests for lib/ functions
│   └── shared/                 # Code shared between apps (future use)
├── public/                     # Static assets
│   ├── favicon.ico, logo.png, logo-hero.png
│   └── screenshots/            # Homepage screenshots
├── scripts/                    # Utility scripts
├── playwright.config.ts, vite.config.ts, postcss.config.js
├── tsconfig.json, eslint.config.js, .prettierrc
```

---

## Verification (MANDATORY)

After every implementation change, you MUST run `npm run test:all` before considering the work done. All checks must pass with zero errors. **Do not commit if any test fails.**

```bash
npm run test:all  # typecheck + lint + unit tests + E2E tests (single command)
```

Individual commands if needed:
- `npm run verify` — typecheck + lint + unit tests (no E2E)
- `npm run typecheck` — TypeScript type checking (strict mode)
- `npm run lint` — ESLint (warnings from `src/graph/components/ui/` are excluded)
- `npm run test` — Vitest unit + component tests (all projects)
- `npm run test:unit` — Vitest unit tests only (`src/graph/test/`)
- `npm run test:component` — Vitest Browser Mode component tests only (`src/graph/components/__tests__/`)
- `npm run test:e2e` — Playwright E2E tests (`e2e/`, Chromium + Firefox)
- `npm run test:e2e:ui` — Playwright interactive UI runner
- `npm run build` — Full production build (typecheck + Vite bundle)

### Visual verification with Playwright MCP

When implementing UI components or making visual changes, use the Playwright MCP tools to verify the rendered output in a real browser. This closes the feedback loop without manual checking.

Workflow:
1. Start the dev server (`npm run dev`) if not already running
2. Use `browser_navigate` to open `http://localhost:5173/graph` (graph app) or `http://localhost:5173/` (homepage)
3. Use `browser_snapshot` to inspect the DOM and verify component rendering
4. After code changes, navigate again to refresh and re-check

Use this for: layout issues, component visibility, drag-and-drop flows, tooltip positioning, filter UI state, canvas rendering. Do NOT rely solely on unit tests for UI correctness.

---

## Task Workflow

After completing a task:

1. **Write tests** — every task/feature must include appropriate tests:
   - **Unit tests** (`src/graph/test/`) for new or changed pure functions in `lib/`.
   - **Component tests** (`src/graph/components/__tests__/`) for new or changed React components in isolation.
   - **E2E tests** (`e2e/`) for multi-step user journeys that span the full app (load → interact → verify).
   - Choose the test type that best covers the change. Many tasks warrant multiple types.
2. Run `npm run test:all` — must pass with zero errors.
3. **Do not commit if any test fails.** Fix the issue first.
4. If the task adds UI, use Playwright MCP to visually verify the rendered output.
5. If the task warrants user testing (UI changes, new interactions), tell the user what to test and how (e.g. "run `npm run dev` and try dragging a JSON file onto the drop zone").
6. Commit and push.

---

## UI Component Library (`src/graph/components/sidebar/`)

All sidebar and panel UI **must** use the shared design system components from `@/components/sidebar`. Do NOT write ad-hoc styled elements with inline Tailwind classes for any of the patterns below — always use the corresponding component. This ensures visual consistency and lets us change the design from a single place.

| Component | Purpose | Key props |
|---|---|---|
| `SectionHeading` | Bold uppercase section title, optional `?` help popover | `children`, `help?` |
| `HelpPopover` | Clickable `?` icon that opens a popover | `children`, `side?` |
| `LabeledSlider` | Label row (name + value + optional help) above a Slider | `label`, `value`, `help?`, `formatValue?`, slider props |
| `CollapsibleSection` | `<details>` toggle with styled arrow | `label`, `children` |
| `SidebarButton` | Outline action button with color variants | `children`, `onClick`, `color?: 'neutral' \| 'green' \| 'red'`, `disabled?`, `className?` |
| `SidebarCheckbox` | Checkbox with styled label | `label`, `checked`, `onCheckedChange` |
| `StatRow` | Key-value row for metadata (e.g. node/edge counts) | `label`, `value` |

Import via `import { SectionHeading, LabeledSlider, ... } from '@/components/sidebar'` (where `@/` → `src/graph/`).

### Rules

1. **Always use these components** when building sidebar or panel UI. If a pattern isn't covered, create a new component in `sidebar/` and export it from `sidebar/index.ts` — don't inline it.
2. **No complex ad-hoc components** outside of the design system. If a UI element will appear more than once or represents a distinct pattern (heading, control, display row), it belongs in `sidebar/`.
3. **Style changes go in the component**, not at the call site. Use `className` prop only for layout concerns (e.g. `flex-1`, `w-1/2`, `mt-4`), never for colors, fonts, or spacing that are part of the design system.
4. **shadcn/ui** (`src/graph/components/ui/`) provides low-level primitives (Button, Slider, Checkbox, Popover, AlertDialog). The `sidebar/` layer composes these into app-specific components with consistent styling. Use `ui/` directly only when `sidebar/` doesn't have a suitable wrapper.
5. **Icons** — Always use icons from `lucide-react` (`import { Copy, Check, X, ... } from 'lucide-react'`). NEVER use inline SVGs, raw Unicode symbols, or hand-crafted icon markup. Lucide provides a consistent, professionally designed icon set that matches our UI. Browse available icons at https://lucide.dev/icons.

---

## Key Patterns

- **Cosmos.gl simulation** runs entirely on the GPU. Simulation controls: `start()` / `pause()` / `unpause()`. Camera auto-follows via `fitView(0)` on every tick. User must click "Run" to start; simulation does not auto-start on load.
- **Appearance pipeline** (filter matching + gradient colors + link visibility) runs in a **Web Worker** (`src/graph/workers/appearanceWorker.ts`) to keep the UI thread free. The worker receives property columns + filter state, computes Float32Arrays for point colors/sizes/link colors, and transfers them back zero-copy.
- **Property columns** are the shared data format for node properties — flat arrays indexed by node index (`Record<string, (number|string|boolean|undefined)[]>`). Built once on graph load in `GraphView`, shared by `useFilterState` (for initializing filter domains) and the appearance worker (for filter matching + gradient computation).
- **Node labels** are rendered as HTML overlays (not part of the WebGL canvas). Positions read from `cosmos.getPointPositions()` + `spaceToScreenPosition()`, capped at 300 labels, updated on tick/zoom/drag.
- **Cosmos data pipeline**: `setPointColors` / `setPointSizes` / `setLinkColors` set data, but it only reaches the GPU when `render()` is called (which triggers `graph.update()` → `create()` → GPU upload). Always call `render(0)` after setting data for static display.
- **Unit tests** (`src/graph/test/`) cover pure functions in `lib/` and hooks/stores.
- **Component tests** (`src/graph/components/__tests__/`) render isolated React components in a real Chromium browser via Vitest Browser Mode. These test props, interactions, and rendered output without needing the full app.
- **E2E tests** (`e2e/`) cover multi-step user journeys (load file → interact → verify) using Playwright. Graph app tests navigate to `/graph`. Homepage tests navigate to `/`. Chromium uses SwiftShader (`--use-gl=angle --use-angle=swiftshader`) for headless WebGL support. 4 GPU-dependent tests are skipped (simulation, tooltip click, position readback).

---

## Testing Requirements

Every task or feature **must** include tests. This is non-negotiable.

| Test type | Location | Covers | Command |
|---|---|---|---|
| Unit (Vitest) | `src/graph/test/*.test.ts` | Pure functions in `lib/`, hooks, stores | `npm run test:unit` |
| Component (Vitest Browser) | `src/graph/components/__tests__/*.test.tsx` | Isolated React components with real DOM | `npm run test:component` |
| E2E (Playwright) | `e2e/*.spec.ts` | Multi-step user journeys, full app flows | `npm run test:e2e` |

**Test fixtures** live in `e2e/fixtures/` — graph JSON files for different scenarios (valid, invalid, empty, partial positions, weighted edges, etc.).

### Rules
1. New `lib/` functions must have unit tests.
2. New or changed components must have component tests (Vitest Browser Mode).
3. New multi-step user flows must have E2E tests.
4. All tests (unit + component + E2E) must pass before committing. No exceptions.
5. When fixing a bug, add a regression test that would have caught it.

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
| Cosmos init fails | Catch in `useEffect`, log error, render empty canvas |
| Tooltip off-canvas | Clamp position within canvas bounds |

---

## JSDoc Rules

Every exported function, hook, and component must have a one-sentence description, `@param`, `@returns`, `@throws` (if applicable), and `@example` (pure functions). Document props interfaces and hook return shapes. Do NOT document internal helpers or obvious one-liners.

---

## Scope Boundaries

The app is client-side only. These categories are out of scope:

- **No server-side**: no routing, no backend/API calls, no auth, no database
- **No complex analysis**: no multi-property comparison, no edge weight visualization
- **No state history**: no undo/redo
- **No React Testing Library**: component tests use Vitest Browser Mode (real browser), not RTL/jsdom

For the current feature set, see `README.md`.

---

## Performance Rules (1M+ nodes)

The app must handle graphs with 1M+ nodes and 2.7M+ edges. Follow these rules to avoid freezing the UI:

1. **Never use `Math.min(...array)` or `Math.max(...array)`** — spreads blow the call stack at ~100K elements. Use a `for` loop.
2. **Never iterate all nodes on the main thread** during user interactions (filter/color changes). All O(N) work must happen in the Web Worker.
3. **Use `render(0)` to flush cosmos data** — `setPointColors` / `setPointSizes` / `setLinkColors` only set flags; data reaches the GPU only when `render()` calls `graph.update()` → `create()`.
4. **Cosmos constructor needs a sized container** — if `clientWidth === 0`, Cosmos defers `create()` via ResizeObserver, and subsequent `set*` calls silently no-op because `this.points` is null. Always verify the container has dimensions before constructing.
5. **`setPointColors` uses normalized 0–1 RGBA** (not 0–255) — the Float32Array goes directly to GPU shaders with no normalization.
6. **Cache `hexToRgba` results** — only ~20 unique colors exist in practice, but the function may be called millions of times.
7. **Send large data to workers once** (init message), then send only lightweight deltas (filter state, gradient config) on updates. Avoid structured-cloning megabytes per interaction.
8. **Use typed arrays** (`Float32Array`, `Uint8Array`) over JS objects/Maps for per-node data. A `Map<string, number>` with 1M entries costs ~100MB; a `Float64Array(1M)` costs 8MB.
9. **Pre-allocate and reuse** Float32Arrays where possible. For 1M nodes, each `new Float32Array(4M)` is a 16MB allocation.
10. **Cosmos `spaceSize`** is bounded (max 8192) by GPU texture size. Nodes cannot move beyond the simulation space boundary.

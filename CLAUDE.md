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
├── e2e/                 # Playwright E2E tests
│   ├── fixtures/        # Test graph files (sample, all-positions, partial, invalid, empty, weighted)
│   ├── drop-zone.spec.ts
│   ├── graph-view.spec.ts
│   ├── simulation.spec.ts
│   ├── display-controls.spec.ts
│   ├── filters.spec.ts
│   ├── position-loading.spec.ts
│   └── reset-and-export.spec.ts
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui generated components (lint-excluded)
│   │   ├── sidebar/     # Reusable sidebar design system (see below)
│   │   ├── filters/     # Filter UI components (NumberFilter, BooleanFilter, PropertyFilterPanel)
│   │   ├── DropZone.tsx, GraphView.tsx, LeftSidebar.tsx, RightSidebar.tsx
│   │   ├── FiltersTab.tsx
│   │   ├── CanvasControls.tsx, FilenameLabel.tsx, KeyboardShortcutsHelp.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useFA2Simulation.ts, useSigma.ts, useFileDrop.ts, useSpacebarToggle.ts
│   │   ├── useFilterState.ts, useNodeColors.ts
│   │   └── useDebounce.ts
│   ├── lib/
│   │   ├── buildGraph.ts, validateGraph.ts, parseJSON.ts
│   │   ├── applyNullDefaults.ts, detectPropertyTypes.ts
│   │   ├── graphSchema.json, utils.ts
│   ├── test/            # Vitest unit tests for lib/ functions only
│   │   ├── buildGraph.test.ts, validateGraph.test.ts
│   │   ├── applyNullDefaults.test.ts, detectPropertyTypes.test.ts
│   ├── types.ts, App.tsx, main.tsx, index.css
├── scripts/             # Utility scripts (e.g. csv-to-graph converter)
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
- `npm run lint` — ESLint (warnings from `src/components/ui/` are excluded)
- `npm run test` — Vitest unit tests (`src/test/`)
- `npm run test:e2e` — Playwright E2E tests (`e2e/`, Chromium + Firefox)
- `npm run test:e2e:ui` — Playwright interactive UI runner
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

1. **Write tests** — every task/feature must include appropriate tests:
   - **Unit tests** (`src/test/`) for new or changed pure functions in `lib/`.
   - **E2E tests** (`e2e/`) for any user-facing feature, UI change, or interaction flow.
   - Choose the test type that best covers the change. Many tasks warrant both.
2. Run `npm run test:all` — must pass with zero errors.
3. **Do not commit if any test fails.** Fix the issue first.
5. If the task adds UI, use Playwright MCP to visually verify the rendered output.
6. If the task warrants user testing (UI changes, new interactions), tell the user what to test and how (e.g. "run `npm run dev` and try dragging a JSON file onto the drop zone").
7. Mark the task `[x]` in `progress_tracking.md` and update the "Next task" line.
8. Commit and push.

Status markers: `[x]` done, `[ ]` not started, `[>]` in progress.

---

## UI Component Library (`src/components/sidebar/`)

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

Import via `import { SectionHeading, LabeledSlider, ... } from '@/components/sidebar'`.

### Rules

1. **Always use these components** when building sidebar or panel UI. If a pattern isn't covered, create a new component in `sidebar/` and export it from `sidebar/index.ts` — don't inline it.
2. **No complex ad-hoc components** outside of the design system. If a UI element will appear more than once or represents a distinct pattern (heading, control, display row), it belongs in `sidebar/`.
3. **Style changes go in the component**, not at the call site. Use `className` prop only for layout concerns (e.g. `flex-1`, `w-1/2`, `mt-4`), never for colors, fonts, or spacing that are part of the design system.
4. **shadcn/ui** (`src/components/ui/`) provides low-level primitives (Button, Slider, Checkbox, Popover, AlertDialog). The `sidebar/` layer composes these into app-specific components with consistent styling. Use `ui/` directly only when `sidebar/` doesn't have a suitable wrapper.

---

## Key Patterns

- **FA2 simulation** runs in a Web Worker (`graphology-layout-forceatlas2/worker`) to keep the UI thread free. Slider changes: `stop()` → update settings → `start()`. Reset: `stop()` → randomize positions → `start()`.
- **Node color updates** apply without remounting Sigma: `graph.updateEachNodeAttributes(...)` + `sigma.refresh()`.
- **Unit tests** (`src/test/`) cover pure functions in `lib/`. No React Testing Library component tests — E2E covers UI.
- **E2E tests** (`e2e/`) cover all user-facing features using Playwright across Chromium and Firefox. Chromium uses SwiftShader (`--use-gl=angle --use-angle=swiftshader`) for headless WebGL support.

---

## Testing Requirements

Every task or feature **must** include tests. This is non-negotiable.

| Test type | Location | Covers | Command |
|---|---|---|---|
| Unit (Vitest) | `src/test/*.test.ts` | Pure functions in `lib/` | `npm run test` |
| E2E (Playwright) | `e2e/*.spec.ts` | UI features, interactions, user flows | `npm run test:e2e` |

**Test fixtures** live in `e2e/fixtures/` — graph JSON files for different scenarios (valid, invalid, empty, partial positions, weighted edges, etc.).

### Rules
1. New `lib/` functions must have unit tests.
2. New UI features or interaction changes must have E2E tests.
3. All tests (unit + E2E) must pass before committing. No exceptions.
4. When fixing a bug, add a regression test that would have caught it.

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

## Scope Boundaries

The app is a client-side-only prototype. These categories are out of scope:

- **No server-side**: no routing, no backend/API calls, no auth, no database
- **No complex analysis**: no multi-property comparison, no edge weight visualization
- **No state history**: no undo/redo
- **No component-level tests**: no React Testing Library — E2E covers UI

For the current feature set, see `README.md`.

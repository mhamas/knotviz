# Contributing to Knotviz

Knotviz is a personal side project, but contributions are welcome. Bug fixes, performance improvements, and small features are all fair game. For larger changes, open an issue first to discuss scope.

This file is the **authoritative engineering reference** for the repo. All contributors — humans and AI coding agents alike — should read it before making changes. For the product overview and feature list, see `README.md`.

> **Agents: edit only this file.** Several thin pointer files exist for tool-specific discovery; they must stay thin. If you find yourself about to add a rule, preference, or architectural note to any of the pointer files below, stop — add it here instead. Keeping everything in one place is how we avoid drift.
>
> | Tool | File |
> |---|---|
> | Claude Code | `CLAUDE.md` |
> | Codex, Aider, Zed AI, Cline, Jules, Windsurf | `AGENTS.md` (per [agents.md](https://agents.md/)) |
> | Cursor | `.cursor/rules/knotviz.mdc` |
> | GitHub Copilot | `.github/copilot-instructions.md` |
>
> When adding a pointer for a new tool, match the pattern: 3–5 lines, a link to `CONTRIBUTING.md`, and an explicit "do not add rules here" instruction.

---

## Tech stack

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

Vite Multi-Page App (MPA) with two independent entry points:

- **Homepage** (`/`) — static HTML + Tailwind, no React. Content in `index.html`.
- **Graph app** (`/graph`) — React + TypeScript SPA, all graph code under `src/graph/`.

**Path alias:** `@/` → `src/graph/`. Use this in every graph-app import.

---

## File structure

```
knotviz/
├── index.html                  # Homepage (static HTML + Tailwind) → serves at /
├── graph/
│   └── index.html              # Graph SPA HTML entry → serves at /graph
├── e2e/                        # Playwright E2E tests
│   ├── fixtures/               # Test graph files (sample, invalid, empty, etc.)
│   └── *.spec.ts               # E2E specs
├── src/
│   ├── styles/globals.css      # Shared Tailwind theme, tokens, fonts
│   ├── homepage/main.ts        # Homepage CSS-only entry
│   ├── graph/                  # Graph mini-app (all graph code lives here)
│   │   ├── main.tsx            # createRoot entry
│   │   ├── App.tsx             # Graph root component
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui generated components (lint-excluded)
│   │   │   ├── sidebar/        # Reusable sidebar design system
│   │   │   ├── filters/        # Filter UI components
│   │   │   └── __tests__/      # Vitest Browser Mode component tests
│   │   ├── hooks/              # useCosmos, useFilterState, useFileDrop, ...
│   │   ├── workers/            # appearanceWorker.ts (filter + gradient + links)
│   │   ├── lib/                # Pure functions: parseJSON, parseNodeEdgeCSV, graphBuilder, ...
│   │   ├── stores/             # Zustand stores
│   │   └── test/               # Vitest unit tests for lib/
│   └── shared/                 # Code shared between apps (future use)
├── public/                     # Static assets
├── scripts/                    # Utility scripts (graph generation, CSV conversion)
└── [config files at repo root]
```

---

## Local development

```bash
npm install
npm run dev              # Dev server at http://localhost:5173
```

Graph app at `/graph`, homepage at `/`.

---

## Verification (mandatory)

Before committing any change, run:

```bash
npm run test:all         # typecheck + lint + unit + component + E2E (single command)
```

All checks must pass with zero errors. **Do not commit if any test fails.**

Individual commands:

- `npm run verify` — typecheck + lint + unit (no E2E)
- `npm run typecheck` — TypeScript strict mode
- `npm run lint` — ESLint (warnings from `src/graph/components/ui/` excluded)
- `npm run test` — Vitest unit + component tests (all projects)
- `npm run test:unit` — Vitest unit tests only (`src/graph/test/`)
- `npm run test:component` — Vitest Browser Mode component tests (`src/graph/components/__tests__/`)
- `npm run test:e2e` — Playwright E2E tests (`e2e/`, Chromium + Firefox)
- `npm run test:e2e:ui` — Playwright interactive UI runner
- `npm run build` — Full production build

For UI changes, also open the dev server in a real browser and exercise the feature. Type-checking and test suites verify code correctness, not feature correctness — exercise things in a real browser before calling a UI change done.

### Visual verification (for AI agents with browser tools)

If your tools include browser automation (Playwright MCP, Cursor's browser-use, Puppeteer, etc.), use them to verify UI changes in a real browser instead of waiting for the user to check manually. Typical loop:

1. Start the dev server (`npm run dev`) if it isn't running.
2. Navigate to `http://localhost:5173/graph` (graph app) or `http://localhost:5173/` (homepage).
3. Take a DOM snapshot or screenshot to inspect the rendered output.
4. After code changes, navigate again to refresh and re-check.

Use this for: layout issues, component visibility, drag-and-drop flows, tooltip positioning, filter UI state, canvas rendering. Do NOT rely solely on unit tests for UI correctness.

---

## Testing requirements

Every task or feature must include tests. Non-negotiable.

### Red/Green TDD (required for AI coding agents)

**If you are an AI coding agent (Claude, Cursor, Copilot, Codex, Aider, etc.), you MUST follow Red/Green TDD on this project.** Human contributors are welcome to use TDD but aren't required to — test coverage at the end is what matters for humans.

For agents, the workflow is:

1. **RED** — write the failing test first. Run it and see it fail for the right reason. Skipping this step is the single biggest cause of tests that pass but don't actually verify the behavior they claim to.
2. **GREEN** — write the minimum implementation that makes the test pass.
3. **REFACTOR** — clean up, keeping tests green.

When fixing a bug: **write a regression test that reproduces the bug first**, watch it fail, then write the fix and watch it go green. Do not write the fix first.

Choose the test level that best covers the change — unit for pure logic, component for module interactions in the DOM, E2E for full user journeys. Many changes warrant more than one.

### Test types

| Test type | Location | Covers |
|---|---|---|
| Unit (Vitest) | `src/graph/test/*.test.ts` | Pure functions in `lib/`, hooks, stores |
| Component (Vitest Browser) | `src/graph/components/__tests__/*.test.tsx` | Isolated React components with real DOM |
| E2E (Playwright) | `e2e/*.spec.ts` | Multi-step user journeys, full app flows |

Test fixtures live in `e2e/fixtures/`.

**Rules:**

1. New `lib/` functions must have unit tests.
2. New or changed components must have component tests (Vitest Browser Mode, real Chromium — not React Testing Library / jsdom).
3. New multi-step user flows must have E2E tests.
4. When fixing a bug, add a regression test that would have caught it (see Red/Green TDD above).
5. All tests must pass before committing. No exceptions.

E2E notes: Chromium uses SwiftShader (`--use-gl=angle --use-angle=swiftshader`) for headless WebGL support. A handful of GPU-dependent tests (simulation, tooltip click, position readback) are skipped in CI.

---

## UI component library

All sidebar and panel UI **must** use the shared design system in `src/graph/components/sidebar/`. Do NOT write ad-hoc styled elements with inline Tailwind classes for patterns the design system covers.

| Component | Purpose | Key props |
|---|---|---|
| `SectionHeading` | Bold uppercase section title, optional `?` help popover | `children`, `help?` |
| `HelpPopover` | Clickable `?` icon that opens a popover | `children`, `side?` |
| `LabeledSlider` | Label row above a Slider | `label`, `value`, `help?`, `formatValue?`, slider props |
| `CollapsibleSection` | `<details>` toggle with styled arrow | `label`, `children` |
| `SidebarButton` | Outline action button with color variants | `children`, `onClick`, `color?`, `disabled?`, `className?` |
| `SidebarCheckbox` | Checkbox with styled label | `label`, `checked`, `onCheckedChange` |
| `StatRow` | Key-value row for metadata | `label`, `value` |

Import via `import { SectionHeading, LabeledSlider, ... } from '@/components/sidebar'`.

**Rules:**

1. **Always use these components** when building sidebar/panel UI. If a pattern isn't covered, add it to `sidebar/` and export from `sidebar/index.ts` — don't inline it.
2. **No complex ad-hoc components** outside the design system. If a UI element appears more than once or represents a distinct pattern, it belongs in `sidebar/`.
3. **Style changes go in the component**, not at the call site. Use `className` prop only for layout concerns (`flex-1`, `w-1/2`, `mt-4`), never for colors, fonts, or spacing that are part of the design system.
4. **shadcn/ui** (`src/graph/components/ui/`) provides primitives (Button, Slider, Checkbox, Popover, AlertDialog). `sidebar/` composes these into app-specific components. Use `ui/` directly only when `sidebar/` has no suitable wrapper.
5. **Icons** — always use `lucide-react` (`import { Copy, Check, X, ... } from 'lucide-react'`). NEVER use inline SVGs, raw Unicode symbols, or hand-crafted icon markup. Browse available icons at https://lucide.dev/icons.
6. **Numbers on screen** — every numeric value rendered to the UI (counts, stats, slider labels, tooltip values, progress strings, legend endpoints, error messages) MUST go through `formatNumber` from `src/graph/lib/formatNumber.ts`. Never call `.toLocaleString()`, `.toFixed()`, or `.toPrecision()` directly for display. `formatNumber(v)` preserves decimals as-is with comma grouping; pass `{ decimals: N }` where a fixed precision reads better (slider labels, stats means, percentages). The one exception is values bound to **editable inputs** (e.g. `NumberFilter`'s min/max textboxes): those stay in raw `parseFloat`-friendly form because the same string is echoed back into the input on focus.

---

## JSDoc rules

Every exported function, hook, and component must have:

- One-sentence description
- `@param` for each parameter
- `@returns`
- `@throws` if applicable
- `@example` for pure functions

Document props interfaces and hook return shapes. Do NOT document internal helpers or obvious one-liners.

---

## Performance rules (1M+ nodes)

The app must handle graphs with 1M+ nodes and 2.7M+ edges. Follow these rules to avoid freezing the UI:

1. **Never use `Math.min(...array)` or `Math.max(...array)`** — spreads blow the call stack at ~100K elements. Use a `for` loop.
2. **Never iterate all nodes on the main thread** during user interactions (filter/color changes). All O(N) work must happen in the Web Worker.
3. **Use `render(0)` to flush cosmos data** — `setPointColors` / `setPointSizes` / `setLinkColors` only set flags; data reaches the GPU only when `render()` calls `graph.update()` → `create()` → GPU upload. Always call `render(0)` after setting data for static display.
4. **Cosmos constructor needs a sized container** — if `clientWidth === 0`, Cosmos defers `create()` via ResizeObserver, and subsequent `set*` calls silently no-op because `this.points` is null. Always verify dimensions before constructing.
5. **`setPointColors` uses normalized 0–1 RGBA** (not 0–255) — the Float32Array goes directly to GPU shaders with no normalization.
6. **Cache `hexToRgba` results** — only ~20 unique colors exist in practice, but the function may be called millions of times.
7. **Send large data to workers once** (init message), then only lightweight deltas (filter state, gradient config) on updates. Avoid structured-cloning megabytes per interaction.
8. **Use typed arrays** (`Float32Array`, `Uint8Array`) over JS objects/Maps for per-node data. A `Map<string, number>` with 1M entries costs ~100MB; a `Float64Array(1M)` costs 8MB.
9. **Pre-allocate and reuse** Float32Arrays where possible. For 1M nodes, each `new Float32Array(4M)` is a 16MB allocation.
10. **Cosmos `spaceSize`** is bounded (max 8192) by GPU texture size. Nodes cannot move beyond the simulation space boundary.

---

## Key architectural patterns

- **Cosmos.gl simulation** runs entirely on the GPU. Controls: `start()` / `pause()` / `unpause()`. Camera auto-follows via `fitView(0)` on every tick. Simulation does not auto-start on load — user clicks "Run".
- **Appearance pipeline** (filter matching + gradient colors + link visibility + search highlight) runs in a **Web Worker** (`src/graph/workers/appearanceWorker.ts`). Worker receives property columns + filter state, computes Float32Arrays for point colors/sizes/link colors, transfers them back zero-copy.
- **Property columns** are the shared data format for node properties — flat arrays indexed by node index (`Record<string, (number|string|boolean|undefined)[]>`). Built once on graph load, shared by filter state (for initializing filter domains) and the appearance worker (for filter matching + gradient computation).
- **Node labels** are HTML overlays, not WebGL canvas. Positions read from `cosmos.getPointPositions()` + `spaceToScreenPosition()`, capped at 300 labels, updated on tick/zoom/drag.

---

## Input format

The app accepts a single `.json` file conforming to the versioned schema in `src/graph/lib/graphSchema.json`. See `README.md` for the schema documentation.

Key behaviors:

- Dates stored and filtered as **ISO 8601 strings** (no conversion to ms). "Days ago" is computed at display time in the tooltip only.
- Missing property values are **replaced with type defaults on load**: number → `0`, string → `""`, string[] → `[]`, boolean → `false`, date → `"1970-01-01"`. If any values were defaulted, a blocking modal shows the replacement count; the user can cancel or confirm.

---

## Error handling

| Scenario | Behaviour |
|---|---|
| Invalid JSON | "Invalid JSON file" |
| Missing `nodes` or `edges` | "File must contain `nodes` and `edges` arrays" |
| Node missing `id` | Skip node, `console.warn` |
| Edge to unknown node id | Skip edge, `console.warn` |
| Empty graph (0 nodes) | "Graph has no nodes to display" |
| Property value not number/string | Treat as null, `console.warn` |
| Date string fails `new Date()` parse | Treat as null, `console.warn` |
| Cosmos init fails | Catch in `useEffect`, log error, render empty canvas |
| Tooltip off-canvas | Clamp position within canvas bounds |

---

## Scope

Knotviz is intentionally narrow. The following are **out of scope**:

- **No server-side**: no routing, no backend/API calls, no auth, no database
- **No state history**: no undo/redo
- **No React Testing Library**: component tests use Vitest Browser Mode (real browser), not RTL/jsdom

Features outside scope will be declined regardless of quality.

---

## PR expectations

- **Tests required.** New `lib/` functions need unit tests; new/changed components need component tests; new user flows need E2E tests.
- **Regression tests for bugs.** When fixing a bug, add a test that would have caught it.
- **`npm run test:all` passes.** Before pushing, clean run, no warnings ignored.
- **Commits are focused.** One logical change per commit; descriptive message explaining the *why*.
- **No new dependencies** without a clear reason — performance and bundle size matter.
- **Performance rules apply** (see above). Main-thread iteration over all nodes, `Math.min(...array)`-style spreads, and similar patterns will be rejected regardless of test coverage.
- **UI uses the design system** (`src/graph/components/sidebar/`). Icons from `lucide-react`.
- **JSDoc on exports** (see above).
- **No dead code.** Before committing, check that every file, script, export, type field, and fixture you're leaving behind is actually referenced somewhere. If an earlier step of your change replaced a module or fixture, delete the original in the same commit — do not leave "reference implementations" that the production pipeline no longer uses. Orphans rot fast and mislead the next reader into thinking they matter. `grep -rn <name>` across `src/`, `e2e/`, `docs/src/`, and `package.json` is usually enough to confirm.

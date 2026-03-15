# Implementation Roadmap

28 tasks across 4 releases and 9 chunks. Each task has a clear deliverable, implementation notes drawn from the implementation plan, and explicit test criteria.

**Build order:** R1 (tasks 01–14) → R2 (15–21) → R3 (22–25) → R4 (26–28)

---

## R1: Core Viewer

| Task | Chunk | Title | Size | Key deliverable |
|---|---|---|---|---|
| [01](./01-scaffold.md) | 1 | Project Scaffold | S | Vite + TS + Tailwind + shadcn + Vitest + Playwright all wired |
| [02](./02-type-definitions.md) | 1 | Type Definitions | S | `src/types.ts` — all shared types |
| [03](./03-parse-validate.md) | 1 | Parse + Validate | M | `parseJSON`, `validateGraph` with full unit tests |
| [04](./04-null-defaults.md) | 1 | Null Defaults | M | `detectPropertyTypes`, `applyNullDefaults` with unit tests |
| [05](./05-build-graph.md) | 1 | Build Graph | M | `buildGraph`, fixture files, unit tests |
| [06](./06-drop-zone.md) | 1 | Drop Zone | M | `DropZone` + `NullDefaultModal` (AlertDialog) + E2E |
| [07](./07-sigma-canvas.md) | 1 | Sigma Canvas | L | `GraphView` + `ErrorBoundary` — graph renders on screen |
| [08](./08-canvas-controls.md) | 1 | Canvas Controls | S | `CanvasControls` + `FilenameLabel` + resize handler |
| [09](./09-left-sidebar-shell.md) | 1 | Left Sidebar Shell | S | `LeftSidebar` + three-column layout + graph info |
| [10](./10-fa2-hook.md) | 2 | FA2 + Debounce Hooks | M | `useFA2Simulation` + `useDebounce` |
| [11](./11-simulation-ui.md) | 2 | Simulation UI | M | Run/Stop/sliders/Randomize + large-graph dialog |
| [12](./12-position-aware-loading.md) | 2 | Position-Aware Loading | S | Partial-position warning + camera fit on load |
| [13](./13-file-management.md) | 3 | File Management | S | `DragOverlay` + confirmation dialogs + new-file flow |
| [14](./14-node-tooltip.md) | 4 | Node Tooltip | M | `NodeTooltip` — all property types, flip logic, focus, aria |

**R1 is done when:** load, render, simulate, navigate, inspect all work on `sample-graph.json`.

---

## R2: Filter System

| Task | Chunk | Title | Size | Key deliverable |
|---|---|---|---|---|
| [15](./15-filter-state-hook.md) | 5 | Filter State Hook | M | `useFilterState` + value index + `matchingNodeIds` |
| [16](./16-number-filter.md) | 5 | NumberFilter | S | Dual-handle range slider with debounce |
| [17](./17-boolean-filter.md) | 5 | BooleanFilter | S | Three-way radio group |
| [18](./18-filter-panel.md) | 5 | PropertyFilterPanel | S | Collapsible panel, checkbox, type badge |
| [19](./19-filters-tab.md) | 5 | FiltersTab + useNodeColors | M | Full filter tab + live canvas color sync |
| [20](./20-string-filter.md) | 6 | StringFilter | M | Tags, search, keyboard nav, overflow |
| [21](./21-date-filter.md) | 6 | DateFilter | S | Date pickers + invalid range validation |

**R2 is done when:** all four filter types work; nodes highlight/gray live; AND logic enforced.

---

## R3: Stats + Export

| Task | Chunk | Title | Size | Key deliverable |
|---|---|---|---|---|
| [22](./22-stats-lib.md) | 7 | Stats Library | M | `computeStats` + `computeHistogram` with unit tests |
| [23](./23-histogram-component.md) | 7 | Histogram | S | `Histogram` component with hover tooltips |
| [24](./24-stats-tab.md) | 7 | StatsTab | M | Full stats tab with live filter integration |
| [25](./25-export.md) | 8 | Graph Export | S | Download + filename dialog + toast + round-trip E2E |

**R3 is done when:** stats update live with filters; exported file round-trips without error.

---

## R4: Color

| Task | Chunk | Title | Size | Key deliverable |
|---|---|---|---|---|
| [26](./26-color-scales-lib.md) | 9 | Color Scales Lib | S | `interpolatePalette` + `getPaletteColors` + unit tests |
| [27](./27-color-gradient-hook.md) | 9 | useColorGradient | M | Per-node gradient colors for all 4 property types |
| [28](./28-color-tab.md) | 9 | ColorTab | M | Full color tab + custom colors + legend + canvas integration |

**R4 is done when:** gradient applies to active nodes live; legend matches; grayed nodes stay grey.

---

## Deployment

| Task | Title | Size | Key deliverable |
|---|---|---|---|
| [29](./29-netlify-deployment.md) | Netlify Deployment | S | Auto-deploy on push to `main`; PR preview URLs |

Can be set up after Task 01 (scaffold) to get continuous staging from the start.

---

## Task dependency graph

```
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08
                               ↓
                          07 → 09 → 10 → 11 → 12
                               ↓         ↓
                          07 → 13   11 → 13
                               ↓
                          07 → 14

15 (needs 07) → 16 → 18 → 19 → 20
              → 17 → 18        21 (needs 19)

22 (needs 02) → 23 → 24 (needs 19)
25 (needs 09)

26 (needs 02) → 27 (needs 19, 26) → 28 (needs 27)
```

## Definition of Done gates (per task)

- [ ] All unit tests in `src/test/` pass: `npm run test`
- [ ] All E2E tests in `e2e/` pass: `npm run test:e2e`
- [ ] Zero lint errors: `npm run lint`
- [ ] All exported symbols (functions, hooks, components) have JSDoc
- [ ] Manual verification checklist in the task file completed

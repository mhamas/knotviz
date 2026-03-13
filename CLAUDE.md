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

## Project Scaffolding

### 1. Create the project

```bash
npm create vite@latest graph-viz -- --template react-ts
cd graph-viz
```

### 2. Install app dependencies

```bash
npm install sigma graphology graphology-layout-forceatlas2 graphology-types
```

### 3. Install Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. Install dev tooling

```bash
# ESLint + Prettier
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Vitest
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom

# Playwright
npm install -D @playwright/test
npx playwright install
```

### 5. Configure Vitest

Add to `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

### 6. Configure Playwright

Create `playwright.config.ts` at the project root:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 7. Configure ESLint

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
}
```

Create `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 8. npm scripts

```json
"scripts": {
  "dev":           "vite",
  "build":         "tsc && vite build",
  "preview":       "vite preview",
  "test":          "vitest run",
  "test:watch":    "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e":      "playwright test",
  "test:e2e:ui":   "playwright test --ui",
  "lint":          "eslint src --ext .ts,.tsx",
  "format":        "prettier --write src"
}
```

---

## Development Workflow

```bash
npm run dev          # → http://localhost:5173 (HMR hot-reload)
npm run test:watch   # Vitest re-runs on save (TDD on pure logic)
npm run test:e2e     # Headless Playwright
npm run test:e2e:ui  # Playwright UI mode
npm run lint         # Check for issues
npm run format       # Auto-fix formatting
```

Playwright auto-starts the Vite dev server before running. If already running, it reuses it.

---

## Input Format

The app accepts a single `.json` file dropped onto the drop zone:

```json
{
  "nodes": [
    {
      "id": "1",
      "label": "Alice",
      "properties": {
        "age": 34,
        "score": 91.5,
        "joined": "2021-03-15"
      }
    }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

**Node fields:**
- `id` (required, string) — unique identifier
- `label` (optional, string) — display name shown on canvas
- `color` (optional, hex string e.g. `"#e74c3c"`) — base color, overridden when a property is selected for analysis
- `properties` (optional, object) — key/value pairs of node attributes for analysis. Values must be either:
  - **number** — used directly as the numerical value
  - **ISO 8601 date string** (e.g. `"2023-11-02"` or `"2023-11-02T14:30:00Z"`) — automatically detected; the numerical value used for analysis is **milliseconds elapsed from that date until now** (i.e. older dates = larger values)

All nodes should have the same property keys. Missing values on a node for a selected property are treated as `null` — that node is rendered in light gray and excluded from stats.

**Edge fields:**
- `source` (required) — id of source node
- `target` (required) — id of target node
- `label` (optional, string)

---

## File Structure

```
graph-viz/
├── e2e/
│   ├── fixtures/
│   │   └── sample-graph.json
│   ├── drop-zone.spec.ts
│   ├── simulation.spec.ts
│   └── property-analysis.spec.ts
├── src/
│   ├── components/
│   │   ├── DropZone.tsx
│   │   ├── GraphView.tsx
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── NodeTooltip.tsx
│   │   ├── PropertyList.tsx
│   │   ├── ColorScaleSelect.tsx
│   │   ├── FilterSlider.tsx
│   │   ├── StatsPanel.tsx
│   │   └── Histogram.tsx
│   ├── hooks/
│   │   ├── useFA2Simulation.ts
│   │   └── usePropertyAnalysis.ts
│   ├── lib/
│   │   ├── buildGraph.ts
│   │   ├── validateGraph.ts
│   │   ├── colorScales.ts
│   │   ├── computeStats.ts
│   │   ├── computeHistogram.ts
│   │   └── detectPropertyType.ts
│   ├── test/
│   │   ├── setup.ts
│   │   ├── buildGraph.test.ts
│   │   ├── validateGraph.test.ts
│   │   ├── colorScales.test.ts
│   │   ├── computeStats.test.ts
│   │   ├── computeHistogram.test.ts
│   │   └── detectPropertyType.test.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── playwright.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## Simulation Logic

Use `graphology-layout-forceatlas2` in **Worker mode** to keep the UI thread free at 50k nodes:

```ts
import FA2Layout from 'graphology-layout-forceatlas2/worker'

const layout = new FA2Layout(graph, {
  settings: {
    gravity: 1,    // slider range: 0.01–5, default 1
    slowDown: 1,   // slider range: 0.1–10, default 1 (maps to "speed" slider)
  }
})

layout.start()  // begins simulation in Web Worker
layout.stop()   // pauses
layout.kill()   // cleanup — must call in hook/effect cleanup
```

When sliders change while running: `stop()` → update settings → `start()`.
When Reset is clicked: `stop()` → re-assign random positions to all nodes → `start()`.

---

## Sigma Configuration

```ts
const sigma = new Sigma(graph, containerRef.current, {
  renderEdgeLabels: false,
  defaultNodeColor: '#6366f1',
  defaultEdgeColor: '#cbd5e1',
  labelRenderedSizeThreshold: 6,  // only render labels when zoomed in — critical for 50k perf
  labelFont: 'Inter, sans-serif',
})
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid JSON | Drop zone error: "Invalid JSON file" |
| Missing `nodes` or `edges` | "File must contain `nodes` and `edges` arrays" |
| Node missing `id` | Skip node, `console.warn` |
| Edge to unknown node id | Skip edge, `console.warn` |
| Empty graph (0 nodes) | "Graph has no nodes to display" |
| Property value is not number or string | Treat as null, `console.warn` |
| Date string that fails `new Date()` parse | Treat as null, `console.warn` |
| Sigma mount fails | Catch in `useEffect`, render fallback error message |
| Tooltip positioned off-canvas edge | Clamp position to stay within canvas bounds |

---

## JSDoc Rules

Every exported function, hook, and component must have:

```ts
/**
 * One-sentence description.
 *
 * @param name - Description.
 * @returns Description.
 * @throws {Error} When and why (for throwing functions).
 *
 * @example
 * const result = myFn(input)
 */
```

- **Components**: document the props interface AND the component function
- **Hooks**: document params, full return shape, and any cleanup side effects
- **Pure functions**: always include `@example`
- Do NOT document internal helper variables or obvious one-liners

---

## What NOT to Build

- No routing
- No backend or API calls
- No multi-property comparison
- No edge weight visualization
- No export functionality
- No undo/redo
- No React Testing Library component tests (E2E covers this)

# Task 01: Project Scaffold

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** S
**Prerequisites:** None

## Goal

A working Vite + React + TypeScript project with Tailwind CSS, shadcn/ui, Vitest, and Playwright all configured and passing baseline checks. No application logic yet — just infrastructure.

## Deliverables

### Files to create
- project root (`grapphy/`) — full project scaffold
- `vite.config.ts` — with Vitest config (`globals: true`, `environment: jsdom`, `setupFiles`)
- `tailwind.config.js` — content paths: `./index.html`, `./src/**/*.{ts,tsx}`
- `playwright.config.ts` — baseURL `http://localhost:5173`, Chromium + Firefox, `webServer` block
- `tsconfig.json` — strict mode enabled
- `.eslintrc.cjs` — `@typescript-eslint/recommended` + `react-hooks/recommended` + `prettier`
- `.prettierrc` — `{ "semi": false, "singleQuote": true, "trailingComma": "es5", "printWidth": 100 }`
- `src/test/setup.ts` — imports `@testing-library/jest-dom`
- `src/index.css` — Tailwind directives (`@tailwind base/components/utilities`)
- `src/main.tsx` — standard React 18 root render
- `src/App.tsx` — placeholder `<div>Graph Visualizer</div>`
- `e2e/fixtures/` — empty directory (fixtures added in later tasks)

### npm install commands (exact)
```bash
npm create vite@latest . -- --template react-ts
npm install sigma graphology graphology-layout-forceatlas2 graphology-layout-random graphology-types
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button slider checkbox tabs select popover command radio-group alert-dialog
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install
```

### `package.json` scripts
```json
{
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

## Tests

### Manual verification
- `npm run dev` → opens `http://localhost:5173`, renders "Graph Visualizer" text
- `npm run test` → no test files yet, exits 0 (or with "no tests found" — acceptable)
- `npm run lint` → zero errors
- `npm run build` → builds without error
- `npm run test:e2e` → Playwright launches browser, no spec files yet, exits 0

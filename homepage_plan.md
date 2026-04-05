# Homepage Implementation Plan — Vite MPA Approach

## Why

Knotviz needs a public-facing homepage at `www.knotviz.com` for:

- **SEO**: Search engines need indexable HTML content to rank the site. The current SPA renders an empty `<div>` until JS executes — invisible to most crawlers.
- **User acquisition**: A landing page explains what the tool does, shows examples, and drives users to try it.
- **Credibility**: A professional homepage signals that the tool is production-ready and actively maintained.

The graph visualization tool moves to `/graph` and remains a full client-side SPA.

---

## Architecture

### Vite Multi-Page App (MPA)

Instead of migrating to a framework (React Router v7, Next.js), we use **Vite's native MPA support**. This adds the homepage as a second entry point alongside the existing graph SPA. No framework migration, no new dependencies, zero risk to existing functionality.

**How it works**: Vite's `build.rollupOptions.input` accepts multiple HTML entry points. The graph app gets its own React root and JS bundle. The homepage is **static HTML + Tailwind** — no React, no client-side rendering. Content is in the HTML source, visible to crawlers immediately.

### File structure (target state)

```
knotviz/
├── index.html                          # Homepage (static HTML + Tailwind) → serves at /
├── graph/
│   └── index.html                      # Graph SPA HTML entry → serves at /graph
├── src/
│   ├── styles/
│   │   └── globals.css                 # Shared Tailwind theme, tokens, fonts (moved from src/index.css)
│   ├── homepage/
│   │   └── main.ts                     # CSS-only entry point (imports globals.css for Tailwind processing)
│   ├── graph/                          # Graph mini-app (all existing code, relocated)
│   │   ├── main.tsx                    # createRoot entry (was src/main.tsx)
│   │   ├── App.tsx                     # Graph root component (was src/App.tsx)
│   │   ├── types.ts
│   │   ├── vite-env.d.ts
│   │   ├── components/                 # All existing components
│   │   │   ├── ui/                     # shadcn/ui primitives
│   │   │   ├── sidebar/               # Design system
│   │   │   ├── filters/               # Filter components
│   │   │   ├── __tests__/             # Component tests (Vitest Browser Mode)
│   │   │   ├── DropZone.tsx
│   │   │   ├── GraphView.tsx
│   │   │   └── ... (all other components)
│   │   ├── hooks/                      # All existing hooks
│   │   ├── lib/                        # All existing lib functions
│   │   ├── workers/                    # Web Workers
│   │   ├── stores/                     # Zustand stores
│   │   └── test/                       # Unit tests (Vitest)
│   └── shared/                         # Code shared between apps (future use)
├── e2e/                                # Playwright E2E tests
├── public/                             # Static assets
│   ├── favicon.ico
│   ├── logo.png
│   └── screenshots/                    # Homepage screenshots (created in Step 3)
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── eslint.config.js
└── package.json
```

### URL routing

| URL | HTML entry | Content | Rendering |
|-----|-----------|---------|-----------|
| `/` | `index.html` | Marketing homepage | Static HTML (true SEO — content in source) |
| `/graph` | `graph/index.html` | Graph visualization tool | Client-side React SPA |

### Build output

```
dist/
├── index.html                  # Homepage (full HTML content in source)
├── graph/
│   └── index.html              # Graph SPA shell
├── assets/
│   ├── homepage-[hash].js      # Homepage JS (tiny — just CSS import)
│   ├── homepage-[hash].css     # Homepage Tailwind styles
│   ├── graph-[hash].js         # Graph JS bundle (large — includes Cosmos.gl)
│   └── graph-[hash].css        # Graph styles
├── favicon.ico
├── logo.png
└── screenshots/
```

Vite automatically code-splits — the homepage never ships React, Cosmos.gl, or any graph-specific code.

### Future: React migration path

The homepage starts as static HTML + Tailwind for simplicity, SEO, and performance. If interactivity is needed later, the migration to React is straightforward and non-destructive:

1. Replace the static HTML content in `index.html` with `<div id="root"></div>`
2. Change `src/homepage/main.ts` to `main.tsx` with `createRoot` + React components
3. For build-time pre-rendering (keeping SEO benefits): use `ReactDOMServer.renderToString()` via `vite-ssg`, a custom Vite plugin, or a post-build script that renders the React tree into the built `index.html`

The MPA structure doesn't change at all — only the homepage entry point changes.

---

## Step-by-step implementation

Each step ends with a verification section. Do not proceed to the next step until verification passes. Commit after each step.

---

### Step 1: Restructure source code into `src/graph/`

**Goal**: Move all existing source code from `src/` into `src/graph/` without breaking anything.

**What to do:**

1. Create the target directories:
   ```bash
   mkdir -p src/graph
   mkdir -p src/styles
   mkdir -p src/shared
   ```

2. Move the shared CSS to its new location:
   ```bash
   mv src/index.css src/styles/globals.css
   ```

3. Move all graph-specific code into `src/graph/`:
   ```bash
   mv src/App.tsx src/graph/
   mv src/main.tsx src/graph/
   mv src/types.ts src/graph/
   mv src/vite-env.d.ts src/graph/
   mv src/components src/graph/
   mv src/hooks src/graph/
   mv src/lib src/graph/
   mv src/workers src/graph/
   mv src/stores src/graph/
   mv src/test src/graph/
   ```

4. Update the CSS import in `src/graph/main.tsx`:
   ```typescript
   // Before:
   import './index.css'
   // After:
   import '../styles/globals.css'
   ```

5. Update `index.html` to point to the new entry:
   ```html
   <!-- Before: -->
   <script type="module" src="/src/main.tsx"></script>
   <!-- After: -->
   <script type="module" src="/src/graph/main.tsx"></script>
   ```

6. Update the path alias in `vite.config.ts` — **keep `@` pointing at the new location**:
   ```typescript
   // Before:
   const alias = { '@': path.resolve(__dirname, './src') }

   // After:
   const alias = { '@': path.resolve(__dirname, './src/graph') }
   ```

   This means **all existing `@/` imports continue to work without changes**. No find-and-replace needed across 48 files. The homepage can use relative imports or a separate `@homepage` alias if needed later.

7. Update the path alias in `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/graph/*"]
       }
     }
   }
   ```

8. Update the Vitest config in `vite.config.ts` — the test `include` patterns and `setupFiles` paths:
   ```typescript
   // Unit test project:
   test: {
     name: 'unit',
     globals: true,
     environment: 'jsdom',
     setupFiles: './src/graph/test/setup.ts',          // was ./src/test/setup.ts
     include: ['src/graph/test/**/*.test.{ts,tsx}'],    // was src/test/**
   }

   // Component test project:
   test: {
     name: 'component',
     include: ['src/graph/components/__tests__/**/*.test.tsx'],  // was src/components/__tests__/**
     setupFiles: './src/graph/components/__tests__/setup.ts',    // was ./src/components/__tests__/setup.ts
   }
   ```

9. Update ESLint config — the ignore path for shadcn/ui components:
    ```javascript
    // eslint.config.js
    // Before:
    { ignores: ['dist', 'src/components/ui'] }
    // After:
    { ignores: ['dist', 'src/graph/components/ui'] }
    ```

10. Update `CLAUDE.md` file structure section and any `src/components/ui/` path references in config files to reflect the new `src/graph/` layout.

**Verification:**

```bash
# 1. TypeScript compiles with no errors
npm run typecheck

# 2. Lint passes
npm run lint

# 3. All unit tests pass
npm run test:unit

# 4. All component tests pass
npm run test:component

# 5. Dev server starts and the app loads at http://localhost:5173
npm run dev
# Open browser → http://localhost:5173 → app should work identically

# 6. Full test suite (without E2E, since URL hasn't changed yet)
npm run verify

# 7. E2E tests pass (app is still at /)
npm run test:e2e

# 8. Full combined check
npm run test:all
```

All **333 unit/component tests** and **all E2E tests** must pass. If any test fails, fix it before proceeding. The most likely failures are missed path updates in config files — check the error message for the file path and fix.

**Commit**: `Restructure: move graph app source to src/graph/`

---

### Step 2: Convert to Vite MPA

**Goal**: Set up the multi-page app structure so the graph app serves at `/graph` and there's a placeholder at `/`.

**What to do:**

1. Create `graph/index.html` — this becomes the graph SPA's HTML entry:
   ```bash
   mkdir -p graph
   ```

   File: `graph/index.html`
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <link rel="icon" href="/favicon.ico" />
       <title>Knotviz</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/graph/main.tsx"></script>
     </body>
   </html>
   ```

2. Replace the root `index.html` with a placeholder homepage (static HTML, no React):
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <link rel="icon" href="/favicon.ico" />
       <title>Knotviz — Explore Million-Node Graphs in Your Browser</title>
     </head>
     <body class="flex h-screen items-center justify-center bg-white text-gray-900">
       <div class="text-center">
         <h1 class="text-4xl font-bold">Knotviz</h1>
         <p class="mt-4 text-gray-500">Homepage coming soon</p>
         <a href="/graph" class="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
           Open Knotviz
         </a>
       </div>
       <script type="module" src="/src/homepage/main.ts"></script>
     </body>
   </html>
   ```

3. Create a minimal homepage CSS entry point:

   File: `src/homepage/main.ts`
   ```ts
   import '../styles/globals.css'
   ```

   This is all the homepage JS needs — it just triggers Tailwind CSS processing. All content is static HTML.

4. Update `vite.config.ts` — add MPA input config and the multi-SPA fallback plugin:

   ```typescript
   /// <reference types="vitest" />
   import path from 'path'
   import fs from 'fs'
   import { defineConfig, type PluginOption } from 'vite'
   import react from '@vitejs/plugin-react'
   import { playwright } from '@vitest/browser-playwright'

   const alias = { '@': path.resolve(__dirname, './src/graph') }

   /**
    * Vite plugin that serves the correct index.html for each mini-app in dev mode.
    * Required because `appType: 'custom'` disables Vite's default SPA fallback.
    * Without this, Vite would 404 on sub-paths like /graph/anything.
    */
   function multiSpaFallback(): PluginOption {
     return {
       name: 'multi-spa-fallback',
       configureServer(server) {
         return () => {
           server.middlewares.use(async (req, res, next) => {
             const url = (req.url ?? '').split('?')[0]

             // Skip static assets and Vite internal requests
             if (url.includes('.') || url.startsWith('/@') || url.startsWith('/src/')) {
               return next()
             }

             // Route /graph/* to graph/index.html
             if (url.startsWith('/graph')) {
               const htmlPath = path.resolve(__dirname, 'graph/index.html')
               let html = fs.readFileSync(htmlPath, 'utf-8')
               html = await server.transformIndexHtml(url, html)
               res.setHeader('Content-Type', 'text/html')
               return res.end(html)
             }

             // All other paths fall through to root index.html (homepage)
             const htmlPath = path.resolve(__dirname, 'index.html')
             let html = fs.readFileSync(htmlPath, 'utf-8')
             html = await server.transformIndexHtml(url, html)
             res.setHeader('Content-Type', 'text/html')
             return res.end(html)
           })
         }
       },
     }
   }

   export default defineConfig({
     appType: 'custom',
     plugins: [react(), multiSpaFallback()],
     resolve: { alias },
     build: {
       rollupOptions: {
         input: {
           main: path.resolve(__dirname, 'index.html'),
           graph: path.resolve(__dirname, 'graph/index.html'),
         },
       },
     },
     test: {
       projects: [
         {
           plugins: [react()],
           resolve: { alias },
           test: {
             name: 'unit',
             globals: true,
             environment: 'jsdom',
             setupFiles: './src/graph/test/setup.ts',
             include: ['src/graph/test/**/*.test.{ts,tsx}'],
             exclude: ['node_modules/**'],
             coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
           },
         },
         {
           plugins: [react()],
           resolve: { alias },
           test: {
             name: 'component',
             include: ['src/graph/components/__tests__/**/*.test.tsx'],
             browser: {
               enabled: true,
               provider: playwright(),
               headless: true,
               instances: [{ browser: 'chromium' }],
             },
             setupFiles: './src/graph/components/__tests__/setup.ts',
           },
         },
       ],
     },
   })
   ```

   Key changes:
   - `appType: 'custom'` — disables Vite's default SPA fallback so our plugin controls routing
   - `build.rollupOptions.input` — tells Vite to build both HTML entry points
   - `multiSpaFallback()` plugin — routes `/graph/*` to `graph/index.html` and everything else to `index.html` in dev mode

   **Note:** `appType: 'custom'` disables Vite's built-in HTML handling. The `multiSpaFallback` plugin compensates, but verify that HMR still works correctly for both entry points during testing.

5. Update Playwright config — the graph app now lives at `/graph`:
   ```typescript
   // playwright.config.ts
   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     retries: process.env.CI ? 2 : 0,
     use: {
       baseURL: 'http://localhost:5173/graph',  // was http://localhost:5173
       trace: 'on-first-retry',
     },
     projects: [
       {
         name: 'chromium',
         use: {
           ...devices['Desktop Chrome'],
           launchOptions: {
             args: ['--use-gl=angle', '--use-angle=swiftshader'],
           },
         },
       },
     ],
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:5173/graph',  // wait for graph app to be ready
       reuseExistingServer: !process.env.CI,
     },
   })
   ```

   **Important**: With `baseURL` set to `http://localhost:5173/graph`, all existing `page.goto('/')` calls in E2E tests now resolve to `http://localhost:5173/graph` — which is exactly where the graph app lives. **No changes needed in E2E test files themselves.**

**Verification:**

```bash
# 1. Dev server starts and serves both apps
npm run dev
# Open http://localhost:5173/ → should show the placeholder homepage
# Open http://localhost:5173/graph → should show the graph app (identical to before)
# Open http://localhost:5173/graph/ (with trailing slash) → should also work

# 2. TypeScript + lint + unit/component tests
npm run verify

# 3. E2E tests (now hitting /graph)
npm run test:e2e

# 4. Production build succeeds
npm run build
# Check output:
ls dist/index.html          # homepage exists
ls dist/graph/index.html    # graph SPA exists
ls dist/assets/             # JS/CSS bundles exist

# 5. Preview the production build
npm run preview
# Open http://localhost:4173/ → homepage
# Open http://localhost:4173/graph → graph app

# 6. Full combined check
npm run test:all
```

**Commit**: `Convert to Vite MPA: graph app at /graph, homepage placeholder at /`

---

### Step 3: Prepare homepage assets

**Goal**: Get the logo and screenshots needed for the homepage.

**What to do:**

1. **Optimize the logo for web**:

   The source logo is `logos/knitviz-logo-with-icon-light.png` (1.33 MB). Create a web-optimized version:
   ```bash
   # Resize to ~600px wide, compress
   npx sharp-cli -i logos/knitviz-logo-with-icon-light.png -o public/logo-hero.png resize 600
   # Or use any image optimization tool (ImageMagick, Squoosh, etc.)
   ```

   The output should be under 50KB. Save to `public/logo-hero.png`.

2. **Create a mid-sized graph fixture for screenshots**:

   The existing `sample-graph.json` has only 5 nodes — too sparse for an impressive hero shot. Create a purpose-built fixture:
   - ~200–500 nodes with realistic labels and varied properties
   - Diverse edge connectivity (not just a chain — include hubs, clusters, bridges)
   - Multiple property types (numbers, strings, dates, booleans) for demonstrating filters and color gradients
   - Save as `e2e/fixtures/screenshot-graph.json` and commit it (keep under 500KB)

3. **Capture app screenshots via Playwright MCP**:

   Start the dev server and use the Playwright MCP browser tools:

   a. Navigate to `http://localhost:5173/graph`
   b. Load the screenshot fixture graph
   c. Capture screenshots:
      - **Hero screenshot** (`public/screenshots/hero.png`): Full app view with graph loaded, sidebar visible
      - **Filtering screenshot** (`public/screenshots/filtering.png`): Filter panel open with active filters
      - **Coloring screenshot** (`public/screenshots/coloring.png`): Graph with color gradient applied
   d. Optimize each screenshot to ~800px wide, under 200KB

4. **Verify assets exist**:
   ```
   public/
   ├── favicon.ico          (existing)
   ├── logo.png             (existing)
   ├── logo-hero.png        (new — ~600px wide, <50KB)
   └── screenshots/
       ├── hero.png          (new — ~800px wide, <200KB)
       ├── filtering.png     (new — ~800px wide, <200KB)
       └── coloring.png      (new — ~800px wide, <200KB)
   ```

**Verification:**

```bash
# 1. All assets exist and are reasonably sized
ls -la public/logo-hero.png
ls -la public/screenshots/

# 2. Build includes them
npm run build
ls dist/logo-hero.png
ls dist/screenshots/
```

**Commit**: `Add optimized logo and app screenshots for homepage`

---

### Step 4: Build the homepage

**Goal**: A clean, modern, SEO-friendly homepage that drives users to `/graph`. Built as **static HTML + Tailwind** — no React, no client-side rendering. Content is in the HTML source, visible to crawlers immediately.

**What to do:**

1. **Update `index.html`** with the full homepage — SEO meta tags + all content sections as static HTML:

   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />

       <!-- SEO -->
       <title>Knotviz — Explore Million-Node Graphs in Your Browser</title>
       <meta name="description" content="GPU-accelerated graph visualization for 1M+ nodes. Drag-and-drop JSON, filter by properties, color by values. Free, client-side, no signup." />
       <link rel="canonical" href="https://www.knotviz.com" />

       <!-- Open Graph (social sharing) -->
       <meta property="og:type" content="website" />
       <meta property="og:title" content="Knotviz — Explore Million-Node Graphs in Your Browser" />
       <meta property="og:description" content="GPU-accelerated graph visualization tool. Filter, color, and analyze large graphs entirely in your browser." />
       <meta property="og:image" content="https://www.knotviz.com/screenshots/hero.png" />
       <meta property="og:url" content="https://www.knotviz.com" />
       <meta property="og:site_name" content="Knotviz" />

       <!-- Twitter Card -->
       <meta name="twitter:card" content="summary_large_image" />
       <meta name="twitter:title" content="Knotviz — Explore Million-Node Graphs in Your Browser" />
       <meta name="twitter:description" content="GPU-accelerated graph visualization for 1M+ nodes. Drag-and-drop JSON, filter by properties, color by values." />
       <meta name="twitter:image" content="https://www.knotviz.com/screenshots/hero.png" />

       <!-- Favicon -->
       <link rel="icon" href="/favicon.ico" />
     </head>
     <body class="bg-white text-gray-900 antialiased">

       <!-- Hero -->
       <section class="py-20 text-center">
         <div class="mx-auto max-w-4xl px-6">
           <img src="/logo-hero.png" alt="Knotviz logo" class="mx-auto h-16" />
           <h1 class="mt-8 text-5xl font-bold tracking-tight">
             Explore million-node graphs in your browser
           </h1>
           <p class="mt-4 text-xl text-gray-600">
             GPU-accelerated, client-side graph visualization.
             Drag and drop a JSON file — no server, no signup.
           </p>
           <a href="/graph" class="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700">
             Open Knotviz
           </a>
         </div>
       </section>

       <!-- Feature Cards -->
       <section class="bg-gray-50 py-16">
         <!-- 4 capability cards in a responsive grid -->
         <!-- GPU-accelerated, Property filtering, Color gradients, Edge analysis -->
         <!-- Each card: icon (inline SVG from Lucide), title, 1-2 sentence description -->
       </section>

       <!-- Use Cases -->
       <section class="py-16">
         <!-- 5 use case examples in a responsive grid -->
         <!-- Each: icon (inline SVG from Lucide), title, audience tag, 2-3 sentence description -->
       </section>

       <!-- How It Works -->
       <section class="bg-gray-50 py-16">
         <!-- 3-step flow: Drop → Explore → Analyze -->
         <!-- Include screenshots/hero.png -->
       </section>

       <!-- Input Format -->
       <section class="py-16">
         <!-- Brief description + minimal JSON code example -->
         <!-- Note: "Full schema documentation is available in the app's schema dialog." -->
       </section>

       <!-- Footer -->
       <footer class="border-t py-12">
         <!-- Knotviz logo (small), GitHub link (inline SVG), tagline -->
       </footer>

       <script type="module" src="/src/homepage/main.ts"></script>
     </body>
   </html>
   ```

   The `<script>` tag loads `src/homepage/main.ts` which only imports Tailwind CSS — no React, no app logic.

2. **Icons**: Since we're not importing `lucide-react`, use inline SVGs copied from [Lucide](https://lucide.dev/icons). Each icon is a small `<svg>` element. Example:
   ```html
   <svg class="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
     <path d="..."/>  <!-- path data from Lucide -->
   </svg>
   ```

3. **Design guidelines**:
   - White background, dark text
   - Tailwind utility classes exclusively
   - Responsive: mobile-first, looks good on all screen sizes
   - Blue accents (`bg-blue-600`, `text-blue-600`)
   - Max content width: `max-w-6xl mx-auto`
   - Generous spacing: `py-16` to `py-24` between sections
   - All links to `/graph` use regular `<a>` tags (full page navigation)
   - No external dependencies — only what's already in `package.json`

**Verification:**

```bash
# 1. Dev server shows the homepage
npm run dev
# Open http://localhost:5173/ → should show full homepage with all sections

# 2. Visual verification via Playwright MCP
# Use browser_navigate to http://localhost:5173/
# Use browser_snapshot to inspect DOM structure
# Verify: logo loads, all 6 sections render, CTA links to /graph, responsive layout

# 3. CTA button works
# Click "Open Knotviz" → should navigate to http://localhost:5173/graph
# Graph app loads and works normally

# 4. SEO: content is in the raw HTML (no JS needed to see it)
curl -s http://localhost:5173/ | grep "Explore million-node"
# Should find the text directly in the HTML source

# 5. TypeScript compiles
npm run typecheck

# 6. Lint passes
npm run lint

# 7. Build produces correct output
npm run build
# dist/index.html contains the full homepage content, not an empty shell

# 8. Graph app still works
npm run test:all
```

**Commit**: `Add homepage with hero, features, use cases, how-it-works, input format, footer`

---

### Step 5: Homepage E2E tests

**Goal**: Add E2E tests for the homepage and verify all existing tests still pass.

**What to do:**

1. Create `e2e/homepage.spec.ts`:

   ```typescript
   import { test, expect } from '@playwright/test'

   // Homepage tests use the root URL, not the graph baseURL.
   // Override baseURL for this file.
   test.use({ baseURL: 'http://localhost:5173' })

   test.describe('Homepage', () => {
     test.beforeEach(async ({ page }) => {
       await page.goto('/')
     })

     test('has correct title and meta description', async ({ page }) => {
       await expect(page).toHaveTitle(/Knotviz/)
       const description = page.locator('meta[name="description"]')
       await expect(description).toHaveAttribute('content', /GPU-accelerated/)
     })

     test('renders hero section with logo and CTA', async ({ page }) => {
       await expect(page.locator('img[alt*="Knotviz"]').first()).toBeVisible()
       const cta = page.locator('a[href="/graph"]').first()
       await expect(cta).toBeVisible()
       await expect(cta).toContainText(/Open Knotviz/i)
     })

     test('renders all major sections', async ({ page }) => {
       // Feature cards
       await expect(page.getByText(/GPU-accelerated/i).first()).toBeVisible()
       // Use cases
       await expect(page.getByText(/dependency graph/i).first()).toBeVisible()
       // How it works
       await expect(page.getByText(/Drop/i).first()).toBeVisible()
       // Input format
       await expect(page.getByText(/JSON/i).first()).toBeVisible()
     })

     test('CTA navigates to graph app', async ({ page }) => {
       const cta = page.locator('a[href="/graph"]').first()
       await cta.click()
       await expect(page).toHaveURL(/\/graph/)
       // Graph app loads (drop zone visible)
       await expect(
         page.locator('[data-testid="drop-zone"]').or(page.getByText(/drag/i).first())
       ).toBeVisible()
     })

     test('is responsive — renders on mobile viewport', async ({ page }) => {
       await page.setViewportSize({ width: 375, height: 812 })
       await expect(page.locator('img[alt*="Knotviz"]').first()).toBeVisible()
       const cta = page.locator('a[href="/graph"]').first()
       await expect(cta).toBeVisible()
     })

     test('SEO: content is in the HTML source without JS', async ({ page }) => {
       // Fetch raw HTML without executing JS
       const response = await page.request.get('/')
       const html = await response.text()
       expect(html).toContain('Explore million-node graphs')
       expect(html).toContain('GPU-accelerated')
       expect(html).toContain('og:title')
     })
   })
   ```

2. Verify the homepage tests don't interfere with existing graph E2E tests. Since `playwright.config.ts` sets `baseURL` to `/graph`, and the homepage tests override it with `test.use({ baseURL: '...' })`, they are independent.

**Verification:**

```bash
# 1. Homepage E2E tests pass
npx playwright test e2e/homepage.spec.ts

# 2. All graph E2E tests still pass
npm run test:e2e

# 3. Full suite
npm run test:all
```

**Commit**: `Add homepage E2E tests`

---

### Step 6: Build verification and production check

**Goal**: Confirm the production build works correctly end-to-end.

**What to do:**

1. Run the full production build:
   ```bash
   npm run build
   ```

2. Verify the build output structure:
   ```bash
   # Homepage HTML exists and contains real content (not an empty shell)
   cat dist/index.html | grep -c "Knotviz"   # should be > 0
   cat dist/index.html | grep "meta name=\"description\""   # SEO meta exists
   cat dist/index.html | grep "Explore million-node"   # content in source

   # Graph app HTML exists
   cat dist/graph/index.html | grep "root"   # has mounting div

   # Assets are present
   ls dist/assets/   # JS and CSS files

   # Static assets copied
   ls dist/favicon.ico
   ls dist/logo-hero.png
   ls dist/screenshots/
   ```

3. Serve the production build and test manually:
   ```bash
   npm run preview
   ```
   - Open `http://localhost:4173/` → homepage loads with all content visible immediately
   - Open `http://localhost:4173/graph` → graph app loads
   - Drop a JSON file → graph renders
   - All existing functionality works identically

4. Test with `curl` to verify SEO content is in the HTML (no JS required):
   ```bash
   curl -s http://localhost:4173/ | grep -o '<title>.*</title>'
   # Should output: <title>Knotviz — Explore Million-Node Graphs in Your Browser</title>

   curl -s http://localhost:4173/ | grep 'og:title'
   # Should contain the Open Graph title meta tag

   curl -s http://localhost:4173/ | grep 'Explore million-node'
   # Content is in the raw HTML
   ```

**Verification:**

All checks in the steps above pass. The homepage HTML contains full content visible to search engines without JavaScript execution.

**Commit**: No commit needed for this step (verification only).

---

### Step 7: Update project documentation

**Goal**: Update `CLAUDE.md` and `README.md` to reflect the new architecture.

**What to do:**

1. **Update `CLAUDE.md`** — reflect the new file structure:

   Update the "File Structure" section to match the new `src/graph/`, `src/homepage/`, `src/styles/`, `src/shared/` layout.

   Update the "Verification" section to note that E2E tests for the graph app use `baseURL: /graph` and homepage tests override to `/`.

   Add a note about the MPA architecture:
   ```
   ## Architecture

   The project is a Vite Multi-Page App (MPA) with two independent entry points:
   - **Homepage** (`/`) — static HTML + Tailwind, SEO-friendly, no React
   - **Graph app** (`/graph`) — full React SPA with GPU-accelerated visualization

   The homepage content lives directly in `index.html` as static HTML.
   Tailwind CSS is loaded via `src/homepage/main.ts`.

   Path alias: `@/` → `src/graph/` (all existing graph imports work unchanged).
   ```

2. **Update `README.md`** — add information about:
   - The homepage at `/`
   - The graph app at `/graph`
   - How to develop each
   - The static HTML approach for the homepage and the React migration path

**Verification:**

```bash
# 1. Docs are readable and complete
# (manual review)

# 2. Nothing is broken
npm run test:all
```

**Commit**: `Update project documentation for MPA architecture`

---

## Complete implementation order (summary)

| Step | Description | Commit message | Risk |
|------|-------------|---------------|------|
| 1 | Restructure `src/` → `src/graph/` | `Restructure: move graph app source to src/graph/` | Low — file moves only, no import changes needed |
| 2 | Convert to Vite MPA | `Convert to Vite MPA: graph app at /graph, homepage placeholder at /` | Medium — config changes, E2E base URL |
| 3 | Prepare homepage assets | `Add optimized logo and app screenshots for homepage` | Low |
| 4 | Build the homepage (static HTML) | `Add homepage with hero, features, use cases, how-it-works, input format, footer` | Low |
| 5 | Homepage E2E tests | `Add homepage E2E tests` | Low |
| 6 | Build verification | (no commit — verification only) | None |
| 7 | Update documentation | `Update project documentation for MPA architecture` | Low |

**Step 1** is now low-risk (file moves only, no import rewrites). **Step 2** carries the most risk (config changes). Steps 3–7 are additive and low-risk.

Deployment configuration (Netlify, Vercel, etc.) is deferred until deployment is actually happening — it's trivial to add at that point.

---

## Homepage content specification

### 1. Hero section
- Knotviz logo from `/logo-hero.png` (optimized, ~600px wide)
- Tagline: "Explore million-node graphs in your browser"
- Subtitle: "GPU-accelerated, client-side graph visualization. Drag and drop a JSON file — no server, no signup."
- CTA button: "Open Knotviz" → `/graph`

### 2. Key capabilities (4 feature cards)
- **GPU-accelerated**: Renders 1M+ nodes at 60fps using WebGL via Cosmos.gl
- **Property filtering**: Filter nodes by any property — numbers, strings, dates, booleans, tags
- **Color gradients**: Color nodes by property values with customizable palettes
- **Edge analysis**: Control edge visibility with percentage, max outgoing, and max incoming filters

### 3. Use cases (5 examples)

| Use case | Audience | Description |
|----------|----------|-------------|
| Software dependency graphs | Developers, DevOps | Visualize npm/pip/Maven dependency trees to find vulnerability chains, circular dependencies, and bloated transitive imports. Color by license type to spot GPL contamination. |
| Knowledge graphs & ontologies | Data scientists, researchers | Explore medical ontologies (SNOMED, ICD), legal knowledge graphs, or scientific taxonomies. Filter by entity type, navigate relationship chains, identify isolated clusters. |
| Infrastructure & API mapping | Platform engineers, SREs | Map microservice call graphs, Kubernetes pod dependencies, or data pipeline DAGs. Find single points of failure by filtering to high-degree nodes. |
| Citation & research networks | Academics, R&D teams | Load citation graphs from OpenAlex, Semantic Scholar, or PubMed. Discover key papers by degree, trace influence through citation chains, color by field or year. |
| Financial transaction analysis | Analysts, compliance teams | Visualize account-to-account money flows. Use edge weight filtering to surface high-value transfers, color by account type, identify hub accounts with unusual connectivity. |

### 4. How it works (3 steps)
- **Drop** — Drag a JSON file onto the canvas
- **Explore** — Pan, zoom, and run force-directed simulation
- **Analyze** — Filter, color, and export
- Include `screenshots/hero.png` showing the full app

### 5. Input format
- Brief description: "Knotviz accepts a JSON file with `nodes` and `edges` arrays."
- Minimal code example:
  ```json
  {
    "version": "1",
    "nodes": [
      { "id": "a", "label": "Node A", "properties": { "type": "server", "cpu": 85 } },
      { "id": "b", "label": "Node B", "properties": { "type": "database", "cpu": 42 } }
    ],
    "edges": [
      { "source": "a", "target": "b", "label": "connects to" }
    ]
  }
  ```
- Note: "Full schema documentation is available in the app's schema dialog."

### 6. Footer
- Knotviz logo (small version, `/logo.png`)
- GitHub link (inline SVG icon + text)
- "Built for graphs with 1M+ nodes"

### Design
- White background, dark text
- Blue accents (`bg-blue-600`, `text-blue-600`)
- Max content width: `max-w-6xl mx-auto`
- Responsive: single column on mobile, multi-column on desktop
- Inline SVG icons from Lucide for feature cards and use cases
- Generous vertical spacing: `py-16` to `py-24` between sections
- No custom CSS — Tailwind utilities only
- No external dependencies
- No React — all content is static HTML

### SEO meta tags
Set in `index.html` `<head>` (see Step 4):
- `<title>`: "Knotviz — Explore Million-Node Graphs in Your Browser"
- `<meta name="description">`: "GPU-accelerated graph visualization for 1M+ nodes..."
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URL: `https://www.knotviz.com`

---

## Assets

| Asset | Source | Optimized location | Size target |
|-------|--------|--------------------|-------------|
| Favicon | `logos/knotviz-icon-light.png` | `public/favicon.ico` (existing) | <10KB |
| Sidebar logo | `logos/knitviz-logo-with-icon-light.png` | `public/logo.png` (existing) | <100KB |
| Homepage hero logo | `logos/knitviz-logo-with-icon-light.png` | `public/logo-hero.png` (to create) | <50KB |
| Screenshot graph fixture | Created for this purpose | `e2e/fixtures/screenshot-graph.json` (to create) | <500KB |
| App screenshot 1 | Captured via Playwright MCP | `public/screenshots/hero.png` | <200KB |
| App screenshot 2 | Captured via Playwright MCP | `public/screenshots/filtering.png` | <200KB |
| App screenshot 3 | Captured via Playwright MCP | `public/screenshots/coloring.png` | <200KB |

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vitest config breaks after path changes (Step 1) | Medium | Medium — blocks test runs | Verify test setup paths match new locations. Run each test suite individually. |
| E2E tests break due to URL change (`/` → `/graph`) | Low | Medium | Playwright `baseURL` handles this. Verify with `npm run test:e2e`. |
| `appType: 'custom'` breaks HMR or dev server behavior | Low | Medium | The `multiSpaFallback` plugin only runs as post-middleware — static assets and HMR are handled by Vite's internal middleware first. Test carefully in Step 2. |
| Production build output differs from dev | Low | Medium | Step 6 explicitly verifies the production build. |
| Screenshots look different on CI vs local | Low | Low | Screenshots are captured once locally and committed. |
| Tailwind classes don't apply to static HTML | Low | Low | The `main.ts` import triggers Tailwind processing. Verify in dev and build. |

---

## Out of scope

- Blog / documentation pages (can be added later as new MPA entry points)
- Analytics / tracking scripts
- Authentication or user accounts
- Server-side rendering (output is static files only)
- Automated CI/CD pipeline (defer until deployment is happening)
- Dark mode for the homepage (the graph app already supports it, but the homepage is white-background only for now)
- Deployment configuration (Netlify, Vercel, etc.) — trivial to add when needed

# Homepage Implementation Plan

## Why

Knotviz needs a public-facing homepage at `www.knotviz.com` for:

- **SEO**: Search engines need indexable HTML content to rank the site. The current SPA renders an empty `<div>` until JS executes — invisible to most crawlers.
- **User acquisition**: A landing page explains what the tool does, shows examples, and drives users to try it.
- **Credibility**: A professional homepage signals that the tool is production-ready and actively maintained.

The graph visualization tool moves to `/graph` and remains a full client-side SPA (no pre-rendering needed — it's an interactive app, not content for crawlers).

---

## What

### Architecture: React Router v7 framework mode with selective pre-rendering

**React Router v7** (the successor to Remix) provides native support for:
- **Selective pre-rendering**: render `/` to static HTML at build time, leave `/graph` as a SPA
- **SPA fallback**: non-pre-rendered routes get a fallback HTML shell that hydrates client-side
- **No SSR server required**: output is pure static files, deployable to any static host

This is the standard, officially supported approach in the React ecosystem as of 2026.

### Config

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,              // no runtime SSR server
  prerender: ["/"],        // pre-render homepage only
} satisfies Config;
```

**Build output:**
```
build/client/
  index.html              ← pre-rendered homepage (full HTML, SEO-ready)
  __spa-fallback.html     ← SPA shell for /graph (hydrates via JS)
  assets/                 ← JS/CSS chunks
```

### Routes

| URL | Content | Rendering |
|-----|---------|-----------|
| `/` | Marketing homepage | Pre-rendered at build time (static HTML) |
| `/graph` | Graph visualization tool | SPA (client-side only) |

---

## How

### Phase 1: Migration to React Router v7 framework mode

**Goal**: Get the existing app working at `/graph` under React Router v7 with no functionality changes.

1. **Install dependencies**
   - `@react-router/dev` — framework mode Vite plugin
   - `@react-router/node` — Node adapter (for pre-rendering at build time)
   - `react-router` — runtime (replaces `react-router-dom` if present)

2. **Configure React Router**
   - Create `react-router.config.ts` with `ssr: false` and `prerender: ["/"]`
   - Update `vite.config.ts` to use React Router's Vite plugin alongside existing config
   - Ensure vitest config still works (test projects use separate Vite configs)

3. **Set up routes**
   - Create `src/routes/` directory following React Router v7 file convention
   - `src/routes/_index.tsx` — homepage (placeholder for now)
   - `src/routes/graph.tsx` — wraps existing `App` component
   - Move the existing `App.tsx` logic into the graph route

4. **Update entry points**
   - Adapt `src/main.tsx` to use React Router's entry point pattern
   - Ensure `index.html` works with the new setup

5. **Verify**
   - `npm run dev` serves both `/` and `/graph`
   - `npm run build` produces pre-rendered `index.html` and SPA fallback
   - All 333 unit tests + 50 E2E tests pass (E2E tests may need base URL adjustment to `/graph`)

### Phase 2: Capture screenshots

**Goal**: Get real product screenshots for the homepage.

1. **Start dev server** (`npm run dev`)
2. **Load test graph** (`graph-50o-50i-100p-properties.json`) via Playwright MCP
3. **Capture screenshots** showing:
   - Graph with colored nodes (category property gradient)
   - Filter panel with active filters
   - Full app view with sidebar controls
4. **Optimize** screenshots (resize to ~800px wide, compress PNG)
5. **Save** to `public/screenshots/`

### Phase 3: Build the homepage

**Goal**: A clean, modern homepage that drives users to `/graph`.

#### Content structure

**1. Hero section**
- Knotviz logo (from `logos/knitviz-logo-with-icon-light.png`, optimized)
- Tagline: something like "Explore million-node graphs in your browser"
- Subtitle: one sentence on GPU-accelerated, client-side, drag-and-drop
- CTA button: "Open Knotviz" → `/graph`

**2. Key capabilities (3-4 feature cards)**
- **GPU-accelerated**: Renders 1M+ nodes at 60fps using WebGL
- **Property filtering**: Filter nodes by any property — numbers, strings, dates, booleans, tags
- **Color gradients**: Color nodes by property values with customizable palettes
- **Edge analysis**: Control edge visibility with percentage, max outgoing, and max incoming filters

**3. Use cases (5 examples)**

Each with a short title, 2-3 sentence description, and an icon.

| Use case | Audience | Description |
|----------|----------|-------------|
| **Software dependency graphs** | Developers, DevOps | Visualize npm/pip/Maven dependency trees to find vulnerability chains, circular dependencies, and bloated transitive imports. Color by license type to spot GPL contamination. |
| **Knowledge graphs & ontologies** | Data scientists, researchers | Explore medical ontologies (SNOMED, ICD), legal knowledge graphs, or scientific taxonomies. Filter by entity type, navigate relationship chains, identify isolated clusters. |
| **Infrastructure & API mapping** | Platform engineers, SREs | Map microservice call graphs, Kubernetes pod dependencies, or data pipeline DAGs. Find single points of failure by filtering to high-degree nodes. |
| **Citation & research networks** | Academics, R&D teams | Load citation graphs from OpenAlex, Semantic Scholar, or PubMed. Discover key papers by degree, trace influence through citation chains, color by field or year. |
| **Financial transaction analysis** | Analysts, compliance teams | Visualize account-to-account money flows. Use edge weight filtering to surface high-value transfers, color by account type, identify hub accounts with unusual connectivity. |

**4. How it works (3 steps)**
- **Drop** — Drag a JSON file onto the canvas
- **Explore** — Pan, zoom, and run force-directed simulation
- **Analyze** — Filter, color, and export

With a screenshot showing the full app.

**5. Input format**
- Brief description of the JSON schema
- Minimal code example
- Link to full schema docs (the existing schema dialog)

**6. Footer**
- Knotviz logo (small)
- GitHub link
- "Built for graphs with 1M+ nodes"

#### Design

- Clean, minimal, white background
- Tailwind CSS (already in the project)
- Responsive (mobile-friendly)
- No external dependencies beyond what's already installed
- Dark text on white, blue accents matching the app's existing palette

#### Meta tags (for SEO and social sharing)

```html
<title>Knotviz — Explore Million-Node Graphs in Your Browser</title>
<meta name="description" content="GPU-accelerated graph visualization for 1M+ nodes. Drag-and-drop JSON, filter by properties, color by values. Free, client-side, no signup.">
<meta property="og:title" content="Knotviz — Explore Million-Node Graphs in Your Browser">
<meta property="og:description" content="GPU-accelerated graph visualization tool. Filter, color, and analyze large graphs entirely in your browser.">
<meta property="og:image" content="https://www.knotviz.com/screenshots/hero.png">
<meta property="og:url" content="https://www.knotviz.com">
<link rel="canonical" href="https://www.knotviz.com">
```

### Phase 4: E2E test updates

1. Update Playwright `baseURL` or test navigation to account for `/graph` route
2. Add basic E2E test for homepage (loads, has expected content, CTA links to `/graph`)
3. Run `npm run test:all` — all existing tests must pass

### Phase 5: Build verification

1. `npm run build` produces correct output
2. `npm run preview` serves both routes
3. Pre-rendered `index.html` contains full homepage HTML (verify with `curl` or view source)
4. `/graph` route loads the SPA and works identically to current behavior

---

## Assets

| Asset | Source | Optimized location |
|-------|--------|--------------------|
| Favicon | `logos/knotviz-icon-light.png` | `public/favicon.ico` (already exists) |
| Sidebar logo | `logos/knitviz-logo-with-icon-light.png` | `public/logo.png` (already exists) |
| Homepage hero logo | `logos/knitviz-logo-with-icon-light.png` | `public/logo-hero.png` (to create, ~600px wide) |
| App screenshot 1 | Captured via Playwright | `public/screenshots/hero.png` |
| App screenshot 2 | Captured via Playwright | `public/screenshots/filtering.png` |
| App screenshot 3 | Captured via Playwright | `public/screenshots/coloring.png` |

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| React Router v7 framework mode migration breaks existing app | Phase 1 is isolated — verify all tests pass before proceeding |
| Pre-rendering fails or produces empty HTML | Build step verification in Phase 5; fallback is a working SPA |
| E2E tests break due to URL change (`/` → `/graph`) | Update tests in Phase 4; run full suite before merge |
| Performance regression from router overhead | React Router adds ~15KB gzipped; negligible vs the app's GPU workload |

---

## Out of scope

- Blog / documentation pages (can be added later using the same route pattern)
- Analytics / tracking scripts
- Authentication or user accounts
- Server-side infrastructure (output is static files only)

# Pre-Launch Checklist

Tasks to complete before making the repo public.

## Must fix

- [x] **README: rename Grapphy to Knotviz** — title, performance table, project structure, all references
- [x] **README: update stale content** — E2E test counts wrong (says 44, actual 102+), project structure paths wrong (`src/components/` should be `src/graph/components/`), schema path wrong, missing recent features (analysis property on hover, size mode sqrt scaling, nodePropertiesMetadata, left sidebar panel toggles)
- [x] **README: add screenshot or GIF** — single visual showing drop file -> graph -> simulation -> filter. Hero video exists on homepage, could extract a frame or reference a screenshot

## Should fix

- [ ] **Remove or reframe `plan/` directory** — internal planning docs (product_specification.md, product_roadmap.md, implementation_plan.md, filter-system-plan.md). Either remove, gitignore, or move to `docs/` as architecture docs
- [ ] **`logos/` directory** — currently untracked. Either commit (if needed for README/homepage) or add to .gitignore
- [ ] **Add `__pycache__/` to .gitignore** — Python cache in `scripts/` directory
- [ ] **Add CONTRIBUTING.md** — short file: how to run tests, PR expectations, "side project" disclaimer if relevant

## Nice to have (post-launch)

- [ ] **CSV/TSV import** — JSON-only is a barrier. `scripts/csv-to-graph.mjs` exists but no in-app support. At minimum, document the script in README
- [ ] **Search/find node** — no way to find a specific node in a 1M-node graph without scrolling
- [ ] **Edge labels/tooltips** — clicking a node shows properties, but no way to inspect an edge
- [ ] **Dark mode**

# Homepage Plan — Expert Feedback

## What's good

- **Vite MPA is the right call.** No framework migration, no new paradigm. Just two HTML entry points. Simpler than React Router v7 framework mode, which would've required migrating to file-based routing and a different build pipeline.
- **Clean separation.** `src/homepage/` and `src/graph/` are independent mini-apps. The homepage never ships Cosmos.gl. Smart.
- **The `multiSpaFallback` plugin** is well-designed — solves the dev-mode routing correctly.
- **E2E test strategy** is solid — `baseURL` override for homepage tests, existing tests untouched.
- **Step-by-step with verification gates.** Each step commits independently, so you can bisect if something breaks.

---

## Concerns and suggestions

### 1. Step 1 (restructure) is the riskiest step and it's massive

Moving 48+ files and updating 78 imports in one commit is a big bang. If anything breaks, it's hard to debug.

**Suggestion:** Don't rename `@/` to `@graph/`. Instead, just keep `@` pointing at `src/graph/` after the move. All existing imports stay the same. The alias change is:
```typescript
const alias = { '@': path.resolve(__dirname, './src/graph') }
```
This eliminates the 78-file find-and-replace entirely. The homepage can use relative imports or a separate `@homepage` alias. Much less risk.

### 2. `appType: 'custom'` disables Vite's built-in HTML handling

This means you lose Vite's automatic HMR for HTML files and some dev niceties. The `multiSpaFallback` plugin compensates, but test carefully that HMR still works for both entry points.

### 3. Netlify config (Step 3) is premature

You don't know for sure you'll deploy to Netlify. Skip this step until deployment is actually happening. The `_redirects` file is Netlify-specific and does nothing elsewhere.

### 4. Screenshot capture (Step 4) depends on a good-looking graph

The `sample-graph.json` fixture has only 5 nodes — it'll look underwhelming. Use `graph-50o-50i-100p-properties.json` (24K nodes) for hero shots. But that file is gitignored and 110MB. You'll need a mid-sized graph (~100-500 nodes) committed as a fixture specifically for screenshots.

### 5. The homepage HTML won't be pre-rendered

The plan says "SEO-optimized" but the homepage is still a React SPA — crawlers see `<div id="root"></div>` until JS executes. The MPA approach gives you a *separate* bundle, but not static HTML. For true pre-rendering, you'd need a build step that runs the React app and captures the output to HTML.

This might be acceptable (Google bot renders JS), but it's worth being explicit about the tradeoff. If you want static HTML, consider rendering the homepage as plain HTML + Tailwind (no React) — the homepage has zero interactivity that needs React.

### 6. Missing: what about existing `@/` references in config files?

`CLAUDE.md`, `eslint.config.js`, and other config files reference `src/components/ui/` paths. These need updating after the move.

---

## Summary

The plan is solid. The main recommendation: **simplify Step 1 by keeping `@` → `src/graph/`** instead of renaming all imports. That single change removes 90% of the risk from the biggest step. Everything else is well thought out.

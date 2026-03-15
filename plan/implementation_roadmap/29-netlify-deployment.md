# Task 29: Netlify Deployment

**Release:** Post-R4
**Size:** S
**Prerequisites:** Task 01

## Goal

The app is publicly accessible via a Netlify URL and auto-deploys on every push to `main`. Pull request preview URLs are generated automatically, allowing reviewers to test any branch without pulling it locally.

## Deliverables

### Files to create
- `netlify.toml` — build + publish config
- `.github/` is not needed — Netlify's Git integration handles CI natively

### Files to modify
- `vite.config.ts` — add `base` only if deploying to a sub-path (not needed for a custom domain or Netlify's default `*.netlify.app` domain — leave `base` unset in that case)

## Implementation Notes

### `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA fallback — all routes serve index.html (required for client-side routing)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Setup steps (one-time, done in Netlify UI)
1. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project"
2. Connect GitHub → select `mhamas/grapphy`
3. Build settings are auto-detected from `netlify.toml` — no manual config needed
4. Click "Deploy site"

Netlify will:
- Deploy `main` branch to `https://<auto-name>.netlify.app` (rename in site settings)
- Generate a preview URL for every pull request automatically
- Show deploy status checks on GitHub PRs

### Optional: custom domain
In Netlify site settings → "Domain management" → add custom domain. Netlify provisions a free TLS cert via Let's Encrypt automatically.

### No `base` path needed
Since the app is served from the domain root on Netlify (not a sub-path like `/grapphy/`), `vite.config.ts` does not need a `base` setting. If the deploy URL is ever moved to a sub-path, add:
```ts
// vite.config.ts
export default defineConfig({
  base: '/sub-path/',
  ...
})
```

## Tests

### Manual verification
- Push a commit to `main` → Netlify dashboard shows a new deploy running
- Deploy completes → visit the Netlify URL → app loads, drop zone visible
- Load `sample-graph.json` → graph renders correctly in production build
- Open a PR → Netlify posts a "Deploy Preview" comment with a unique URL → visit it → app works
- `npm run build` locally produces no TypeScript or Vite errors before pushing

#!/usr/bin/env node
/**
 * Combined production build for deployment hosts (Cloudflare Pages, etc.)
 * that expect a single output directory.
 *
 * Layout produced:
 *   dist/
 *   ├── index.html        (homepage)
 *   ├── graph/            (Vite SPA: /graph route)
 *   ├── docs/             (Astro Starlight: /docs route)
 *   ├── samples/, _astro/, etc.
 *
 * Steps:
 *   1. `npm run build` at the root (Vite app → dist/)
 *   2. `npm ci` inside docs/ (separate package, may not have node_modules
 *      in fresh CI containers)
 *   3. `npm run build` inside docs/ (Astro → docs/dist/)
 *   4. Copy docs/dist/ → dist/docs/
 *
 * Run with: `npm run build:site`
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const docsDir = path.join(root, 'docs')
const rootDist = path.join(root, 'dist')
const docsDist = path.join(docsDir, 'dist')
const mergedDocsDir = path.join(rootDist, 'docs')

function run(label, cmd, args, cwd) {
  process.stdout.write(`\n▶ ${label}\n`)
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    process.stderr.write(`\n✗ ${label} failed (exit ${result.status})\n`)
    process.exit(result.status ?? 1)
  }
}

// 1. Vite build (root)
run('Building app (Vite)', 'npm', ['run', 'build'], root)

// 2. Docs deps (idempotent — npm ci is fast when node_modules already match)
if (!existsSync(path.join(docsDir, 'node_modules'))) {
  run('Installing docs deps', 'npm', ['ci'], docsDir)
}

// 3. Astro build
run('Building docs (Astro)', 'npm', ['run', 'build'], docsDir)

// 4. Merge docs/dist → dist/docs (replace if previous run left stale files)
if (existsSync(mergedDocsDir)) rmSync(mergedDocsDir, { recursive: true, force: true })
cpSync(docsDist, mergedDocsDir, { recursive: true })

process.stdout.write(`\n✓ Combined build ready in ${path.relative(root, rootDist)}/\n`)

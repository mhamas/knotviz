#!/usr/bin/env node
/**
 * Thin wrapper around `vitest run --project large-files` that accepts a CLI
 * `--sizes=` flag instead of a `SIZES=` env var. Caps heap at 4 GB to mirror
 * real browser-tab conditions — ceilings found here match what users hit.
 *
 * Usage:
 *   npm run test:large-graphs                                # all sizes
 *   npm run test:large-graphs -- --sizes=10000,100000         # small only
 *   npm run test:large-graphs -- --sizes=3000000              # one size
 *
 * Anything else after `--` (e.g. `--reporter=verbose`) is forwarded to vitest.
 */

import { spawn } from 'node:child_process'

const passThrough = []
let sizes

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--sizes=')) {
    sizes = arg.slice('--sizes='.length)
  } else {
    passThrough.push(arg)
  }
}

const env = {
  ...process.env,
  // Browser-tab realistic. The large-file tests verify that parsers stay under
  // this ceiling so regressions that would OOM a real user surface here first.
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim(),
}
if (sizes) env.SIZES = sizes

const child = spawn(
  'npx',
  ['vitest', 'run', '--project', 'large-files', ...passThrough],
  { env, stdio: 'inherit' },
)
child.on('close', (code) => process.exit(code ?? 1))

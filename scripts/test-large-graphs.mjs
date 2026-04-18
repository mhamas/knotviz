#!/usr/bin/env node
/**
 * Thin wrapper around `vitest run --project large-files` that accepts a CLI
 * `--sizes=` flag instead of a `SIZES=` env var. Also sets the heap size up
 * front so 3M-node XML parses don't OOM.
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
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=16384`.trim(),
}
if (sizes) env.SIZES = sizes

const child = spawn(
  'npx',
  ['vitest', 'run', '--project', 'large-files', ...passThrough],
  { env, stdio: 'inherit' },
)
child.on('close', (code) => process.exit(code ?? 1))

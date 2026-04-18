/**
 * Large-size experiment: discover the real upper bound of graph sizes each
 * format can load, at a browser-realistic 4 GB heap with a 5-min parse timeout.
 *
 * Strategy per format:
 *   1. Start at a known-good size.
 *   2. Double until parse fails (OOM / throw / timeout).
 *   3. Binary-search between last-good and first-bad to pinpoint the ceiling.
 *
 * Per probe we generate the file, spawn the parser as a child process with the
 * requested heap limit and timeout, capture the result JSON, and delete the
 * file. Results are written to `large_size_experiment/runs/<format>-<nodes>.json`
 * and summarised in `large_size_experiment/results.md` at the end.
 *
 * Invoke with:  npx tsx scripts/experiment-large-sizes.ts
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  genCsvEdgeList,
  genCsvPair,
  genGexf,
  genGraphML,
  genJson,
} from '../src/graph/test/large-files/generators'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'large_size_experiment')
const runsDir = path.join(outDir, 'runs')
const tmpDir = path.join(outDir, 'tmp')
fs.mkdirSync(runsDir, { recursive: true })
fs.mkdirSync(tmpDir, { recursive: true })

const HEAP_MB = 4096
const TIMEOUT_MS = 300_000

type Format = 'json' | 'csv-edge-list' | 'csv-pair' | 'graphml' | 'gexf'

interface ProbeResult {
  format: Format
  nodes: number
  edges: number
  fileBytes: number
  ok: boolean
  nodeCount?: number
  edgeCount?: number
  elapsedMs: number
  peakHeapMB: number
  peakRssMB: number
  error?: string
  generateMs: number
  timedOut?: boolean
}

const humanSize = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return String(n)
}

const humanBytes = (n: number): string => {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}

function runChild(env: NodeJS.ProcessEnv): Promise<{ stdout: string; code: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['tsx', path.join(__dirname, 'experiment-parser-child.ts')],
      {
        env: { ...process.env, ...env, NODE_OPTIONS: `--max-old-space-size=${HEAP_MB}` },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let stdout = ''
    let timedOut = false
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      // Preserve stderr for triage but don't spam the orchestrator terminal
      process.stderr.write(chunk)
    })
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, TIMEOUT_MS)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, code, timedOut })
    })
  })
}

async function generateFile(format: Format, nodes: number): Promise<{ files: string[]; elapsedMs: number }> {
  const start = Date.now()
  const tag = humanSize(nodes)
  if (format === 'json') {
    const file = path.join(tmpDir, `${tag}.json`)
    await genJson(file, nodes, false)
    return { files: [file], elapsedMs: Date.now() - start }
  }
  if (format === 'csv-edge-list') {
    const file = path.join(tmpDir, `${tag}.csv`)
    await genCsvEdgeList(file, nodes, false)
    return { files: [file], elapsedMs: Date.now() - start }
  }
  if (format === 'csv-pair') {
    const nodesFile = path.join(tmpDir, `${tag}-nodes.csv`)
    const edgesFile = path.join(tmpDir, `${tag}-edges.csv`)
    await genCsvPair(nodesFile, edgesFile, nodes, false)
    return { files: [nodesFile, edgesFile], elapsedMs: Date.now() - start }
  }
  if (format === 'graphml') {
    const file = path.join(tmpDir, `${tag}.graphml`)
    await genGraphML(file, nodes, false)
    return { files: [file], elapsedMs: Date.now() - start }
  }
  if (format === 'gexf') {
    const file = path.join(tmpDir, `${tag}.gexf`)
    await genGexf(file, nodes, false)
    return { files: [file], elapsedMs: Date.now() - start }
  }
  throw new Error(`Unknown format: ${String(format)}`)
}

async function probe(format: Format, nodes: number): Promise<ProbeResult> {
  const edges = Math.floor(nodes * 1.5)
  process.stdout.write(`  ${format} @ ${humanSize(nodes)} nodes … `)
  const { files, elapsedMs: generateMs } = await generateFile(format, nodes)
  const fileBytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0)
  const { stdout, code, timedOut } = await runChild({
    FORMAT: format,
    FILE: files[0],
    EDGES_FILE: files[1] ?? '',
  })
  for (const f of files) {
    try {
      fs.unlinkSync(f)
    } catch {
      // ignore
    }
  }

  let parsed: Partial<ProbeResult> = {}
  try {
    parsed = JSON.parse(stdout) as Partial<ProbeResult>
  } catch {
    // Child may have OOM'd before writing anything.
  }

  const result: ProbeResult = {
    format,
    nodes,
    edges,
    fileBytes,
    ok: parsed.ok === true && !timedOut,
    nodeCount: parsed.nodeCount,
    edgeCount: parsed.edgeCount,
    elapsedMs: parsed.elapsedMs ?? 0,
    peakHeapMB: parsed.peakHeapMB ?? 0,
    peakRssMB: parsed.peakRssMB ?? 0,
    error: timedOut ? `timeout after ${TIMEOUT_MS / 1000}s` : parsed.error ?? (code === 0 ? undefined : 'non-zero exit'),
    generateMs,
    timedOut,
  }

  const status = result.ok ? '✓' : '✗'
  const detail = result.ok
    ? `${(result.elapsedMs / 1000).toFixed(1)}s, peak ${result.peakHeapMB} MB heap / ${result.peakRssMB} MB RSS, file ${humanBytes(result.fileBytes)}`
    : `${result.error ?? 'unknown error'} (file ${humanBytes(result.fileBytes)})`
  console.log(`${status} ${detail}`)

  fs.writeFileSync(
    path.join(runsDir, `${format}-${humanSize(nodes)}.json`),
    JSON.stringify(result, null, 2),
  )
  return result
}

async function searchFormat(
  format: Format,
  start: number,
  upperBound: number,
): Promise<ProbeResult[]> {
  console.log(`\n=== ${format} ===`)
  const results: ProbeResult[] = []
  let lastGood = 0
  let firstBad = 0

  // Phase 1: doubling search
  let nodes = start
  while (nodes <= upperBound) {
    const r = await probe(format, nodes)
    results.push(r)
    if (r.ok) {
      lastGood = nodes
      nodes *= 2
    } else {
      firstBad = nodes
      break
    }
  }

  if (firstBad === 0 && lastGood >= upperBound / 2) {
    console.log(`  (no failure up to ${humanSize(lastGood)} — upper bound reached)`)
    return results
  }
  if (firstBad === 0) {
    console.log(`  (doubling capped at ${humanSize(nodes / 2)} without finding fail)`)
    return results
  }

  // Phase 2: binary search between lastGood and firstBad
  // Stop once the gap is less than 25% of lastGood — further precision isn't useful.
  while (firstBad - lastGood > Math.max(500_000, lastGood / 4)) {
    const mid = Math.floor((lastGood + firstBad) / 2 / 100_000) * 100_000
    if (mid === lastGood || mid === firstBad) break
    const r = await probe(format, mid)
    results.push(r)
    if (r.ok) lastGood = mid
    else firstBad = mid
  }

  console.log(`  ceiling: last good ${humanSize(lastGood)}, first bad ${humanSize(firstBad)}`)
  return results
}

async function main(): Promise<void> {
  console.log(`Heap: ${HEAP_MB} MB per probe, timeout: ${TIMEOUT_MS / 1000}s`)
  const allResults: ProbeResult[] = []

  // Format-specific starting points and caps. Streaming paths (JSON, CSV)
  // should go much higher than the XML DOM parsers.
  allResults.push(...(await searchFormat('json', 3_000_000, 30_000_000)))
  allResults.push(...(await searchFormat('csv-edge-list', 3_000_000, 50_000_000)))
  allResults.push(...(await searchFormat('csv-pair', 3_000_000, 30_000_000)))
  allResults.push(...(await searchFormat('graphml', 1_000_000, 10_000_000)))
  allResults.push(...(await searchFormat('gexf', 1_000_000, 10_000_000)))

  writeSummary(allResults)
  console.log(`\nDone. Results in ${outDir}`)
}

function writeSummary(results: ProbeResult[]): void {
  const byFormat = new Map<Format, ProbeResult[]>()
  for (const r of results) {
    const list = byFormat.get(r.format) ?? []
    list.push(r)
    byFormat.set(r.format, list)
  }

  const lines: string[] = []
  lines.push('# Large-size format experiments')
  lines.push('')
  lines.push(
    `Probe conditions: **${HEAP_MB} MB heap**, ${TIMEOUT_MS / 1000}s timeout, 1.5 edges/node. Each probe generates a fresh file, runs the production parser in a separate Node process, records peak memory + elapsed time, then deletes the file.`,
  )
  lines.push('')
  lines.push('## Per-format results')
  lines.push('')

  for (const [format, list] of byFormat) {
    const sorted = [...list].sort((a, b) => a.nodes - b.nodes)
    const lastGood = sorted.filter((r) => r.ok).pop()
    const firstBad = sorted.find((r) => !r.ok)

    lines.push(`### ${format}`)
    lines.push('')
    if (lastGood) {
      lines.push(
        `**Ceiling:** ${humanSize(lastGood.nodes)} nodes / ${humanSize(lastGood.edges)} edges / ${humanBytes(lastGood.fileBytes)} on disk — parsed in ${(lastGood.elapsedMs / 1000).toFixed(1)}s with ${lastGood.peakHeapMB} MB heap / ${lastGood.peakRssMB} MB RSS peak.`,
      )
    } else {
      lines.push('_No successful probe._')
    }
    if (firstBad) {
      lines.push('')
      lines.push(
        `**First failure:** ${humanSize(firstBad.nodes)} nodes — ${firstBad.error ?? 'unknown'}${firstBad.peakHeapMB > 0 ? ` (peaked at ${firstBad.peakHeapMB} MB heap / ${firstBad.peakRssMB} MB RSS before giving up)` : ''}.`,
      )
    }
    lines.push('')
    lines.push('| nodes | edges | file | outcome | elapsed | peak heap | peak RSS |')
    lines.push('|---|---|---|---|---|---|---|')
    for (const r of sorted) {
      const outcome = r.ok ? '✓ parsed' : `✗ ${r.error ?? 'failed'}`
      const elapsed = `${(r.elapsedMs / 1000).toFixed(1)}s`
      const heap = r.peakHeapMB ? `${r.peakHeapMB} MB` : '—'
      const rss = r.peakRssMB ? `${r.peakRssMB} MB` : '—'
      lines.push(
        `| ${humanSize(r.nodes)} | ${humanSize(r.edges)} | ${humanBytes(r.fileBytes)} | ${outcome} | ${elapsed} | ${heap} | ${rss} |`,
      )
    }
    lines.push('')
  }

  lines.push('## Summary')
  lines.push('')
  lines.push('| Format | Last success | File size | Parse time | Peak heap | Notes |')
  lines.push('|---|---|---|---|---|---|')
  for (const [format, list] of byFormat) {
    const lastGood = [...list].filter((r) => r.ok).sort((a, b) => b.nodes - a.nodes)[0]
    const firstBad = [...list].filter((r) => !r.ok).sort((a, b) => a.nodes - b.nodes)[0]
    if (!lastGood) {
      lines.push(`| ${format} | — | — | — | — | every probe failed |`)
      continue
    }
    const note = firstBad
      ? `fails at ${humanSize(firstBad.nodes)} (${firstBad.error ?? 'failed'})`
      : 'no failure observed within probe range'
    lines.push(
      `| ${format} | ${humanSize(lastGood.nodes)} nodes | ${humanBytes(lastGood.fileBytes)} | ${(lastGood.elapsedMs / 1000).toFixed(1)}s | ${lastGood.peakHeapMB} MB | ${note} |`,
    )
  }

  fs.writeFileSync(path.join(outDir, 'results.md'), `${lines.join('\n')}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

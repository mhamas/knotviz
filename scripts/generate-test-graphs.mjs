#!/usr/bin/env node
/**
 * Generate manual-testing graph files in every supported format. By default
 * produces only valid files at a per-format ladder of sizes that climbs up to
 * the empirical ceiling (as measured by `scripts/experiment-large-sizes.ts`):
 *
 *   JSON / CSV edge-list / CSV pair: 10k → 15M (limit: V8 Set/Map cap at 2^24)
 *   GraphML:                         10k → 1M  (limit: fast-xml-parser DOM in RAM)
 *   GEXF:                            10k → 1.5M (limit: same)
 *
 * Pass `--sizes=N[,N,...]` to override with a single list used for every
 * selected format (keeps backward compatibility). Pass `--include-invalid` to
 * also write `invalid-<size>.*` variants alongside each valid file.
 *
 * Output directory: graphs_for_manual_testing_various_formats/
 *   json/<size>.json
 *   csv-edge-list/<size>.csv
 *   csv-pair/<size>-nodes.csv + <size>-edges.csv
 *   graphml/<size>.graphml
 *   gexf/<size>.gexf
 *
 * Usage:
 *   node scripts/generate-test-graphs.mjs                       # all formats, per-format defaults
 *   node scripts/generate-test-graphs.mjs --format=json         # one format
 *   node scripts/generate-test-graphs.mjs --sizes=1000000       # override size
 *   node scripts/generate-test-graphs.mjs --include-invalid     # add malformed variants
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'graphs_for_manual_testing_various_formats')

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

// Per-format "comfortable" sizes — what has been verified to load reliably in
// a real Chrome tab, with margin for the browser's own overhead on top of
// what the worker uses (main-thread receive, zustand store, cosmos GPU buffer
// allocation, Chrome renderer overhead). The automated test suite's Node-side
// ceilings are roughly 2× higher per format, but those don't account for the
// browser's extra ~1 GB+ of overhead. These comfortable ceilings are what the
// README promises, and files generated here should load without crashing.
//
//   JSON:          up to 5M nodes  (~1 GB file)
//   CSV edge-list: up to 5M nodes  (~215 MB file)
//   CSV pair:      up to 2M nodes  (~175 MB total)
//   GraphML:       up to 500k nodes (~118 MB file)
//   GEXF:          up to 1M nodes  (~235 MB file)
const DEFAULT_SIZES_PER_FORMAT = {
  json: [10_000, 100_000, 500_000, 1_000_000, 5_000_000],
  'csv-edge-list': [10_000, 100_000, 500_000, 1_000_000, 5_000_000],
  'csv-pair': [10_000, 100_000, 500_000, 1_000_000, 2_000_000],
  graphml: [10_000, 100_000, 500_000],
  gexf: [10_000, 100_000, 500_000, 1_000_000],
}

const explicitSizes = args.get('sizes')
  ? args
      .get('sizes')
      .split(',')
      .map((s) => Number(s))
  : null
const onlyFormat = args.get('format') ?? 'all'
const includeInvalid = args.get('include-invalid') === 'true'
const formats = ['json', 'csv-edge-list', 'csv-pair', 'graphml', 'gexf']

fs.mkdirSync(outDir, { recursive: true })

const formatDir = (format) => {
  const dir = path.join(outDir, format)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const humanSize = (n) => {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

// ─── Deterministic pseudo-random helpers ──────────────────────────────────

const FIRST_NAMES = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'heidi']
const labelFor = (i) => `${FIRST_NAMES[i % FIRST_NAMES.length]}${i}`
const TAG_POOL = ['engineer', 'designer', 'founder', 'alumnus', 'board', 'advisor']
const COMMUNITY_NAMES = [
  'Tech', 'Finance', 'Arts', 'Sports', 'Science', 'Music', 'Gaming',
  'Food', 'Travel', 'Health', 'Education', 'Media', 'Fashion', 'Auto',
  'Crypto', 'Film', 'Books', 'Fitness', 'Politics', 'Design',
]

// Mulberry32 — tiny deterministic PRNG so re-runs give identical output
function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function nodeProps(rng, i) {
  const age = 18 + Math.floor(rng() * 60)
  const active = rng() > 0.3
  const yyyy = 2000 + Math.floor(rng() * 25)
  const mm = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
  const dd = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
  const joined = `${yyyy}-${mm}-${dd}`
  const tagCount = 1 + Math.floor(rng() * 3)
  const tags = []
  for (let t = 0; t < tagCount; t++) tags.push(TAG_POOL[Math.floor(rng() * TAG_POOL.length)])
  return { age, active, joined, tags }
}

// ─── Clustered topology ───────────────────────────────────────────────────
//
// Builds a community structure scaled by graph size:
//   - Community count: 5 at 10k, ~40 at 500k+ (sqrt(size)/20, clamped)
//   - Power-law community sizes biased toward the large end
//   - 92% of edges stay within a community; 8% are bridges (biased to
//     adjacent communities) so the cluster-of-clusters has some topology
//
// Returns cluster data plus a `pickTarget(sourceIdx)` that returns a target
// node index given the same `rng`. Use in the edge loop instead of a uniform
// random pick to get real-world-looking community structure.

function setupClustering(size, rng) {
  const numCommunities = Math.max(5, Math.min(40, Math.floor(Math.sqrt(size) / 20)))

  // Community sizes — power-law skewed toward big.
  const weights = []
  let totalWeight = 0
  for (let c = 0; c < numCommunities; c++) {
    const w = 1 + Math.pow(rng(), 0.5) * 9
    weights.push(w)
    totalWeight += w
  }
  const minSize = Math.max(100, Math.floor(size / (numCommunities * 5)))
  const communitySizes = []
  let remaining = size
  for (let c = 0; c < numCommunities; c++) {
    const nominal = Math.floor((weights[c] / totalWeight) * size)
    const s = Math.max(minSize, Math.min(remaining, nominal))
    communitySizes.push(s)
    remaining -= s
  }
  if (remaining > 0) communitySizes[communitySizes.length - 1] += remaining

  // Precompute node → community + community spans (O(1) edge-time lookup).
  const nodeToCommunity = new Uint32Array(size)
  const communityStart = new Uint32Array(numCommunities)
  const communityEnd = new Uint32Array(numCommunities)
  let offset = 0
  for (let c = 0; c < numCommunities; c++) {
    communityStart[c] = offset
    communityEnd[c] = offset + communitySizes[c]
    for (let i = offset; i < communityEnd[c]; i++) nodeToCommunity[i] = c
    offset += communitySizes[c]
  }

  function gaussian() {
    const u1 = rng()
    const u2 = rng()
    return Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2)
  }

  function pickIntra(nodeIdx, c) {
    const start = communityStart[c]
    const end = communityEnd[c]
    const range = end - start
    if (range <= 1) return nodeIdx
    // Bias toward nearby nodes in the same community — simulates local connections.
    const step = Math.floor(Math.abs(gaussian()) * range * 0.3) + 1
    const dir = rng() < 0.5 ? 1 : -1
    let t = nodeIdx + dir * step
    if (t < start) t = start
    else if (t >= end) t = end - 1
    return t
  }

  function pickInter(c) {
    if (numCommunities <= 1) return Math.floor(rng() * size)
    let targetC
    if (rng() < 0.6) {
      const delta = rng() < 0.5 ? -1 : 1
      targetC = ((c + delta) % numCommunities + numCommunities) % numCommunities
    } else {
      targetC = Math.floor(rng() * numCommunities)
    }
    if (targetC === c) targetC = (c + 1) % numCommunities
    const start = communityStart[targetC]
    const end = communityEnd[targetC]
    return start + Math.floor(rng() * (end - start))
  }

  function pickTarget(i) {
    const c = nodeToCommunity[i]
    const isIntra = rng() < 0.92
    const t = isIntra ? pickIntra(i, c) : pickInter(c)
    return t === i ? (t + 1) % size : t
  }

  function communityLabel(c) {
    // Only suffix the community index when we've exhausted the name list and
    // need disambiguation. For smaller graphs where numCommunities ≤ names
    // length, labels stay clean ("Tech", "Finance", …) instead of ("Tech_0").
    const name = COMMUNITY_NAMES[c % COMMUNITY_NAMES.length]
    return numCommunities <= COMMUNITY_NAMES.length ? name : `${name}_${c}`
  }

  return { numCommunities, nodeToCommunity, communityStart, pickTarget, communityLabel }
}

// ─── Generic streaming writer ─────────────────────────────────────────────

function writeStream(filePath) {
  const ws = fs.createWriteStream(filePath, { encoding: 'utf8', highWaterMark: 1 << 20 })
  const drain = () => new Promise((resolve) => ws.once('drain', resolve))
  return {
    ws,
    async write(chunk) {
      if (!ws.write(chunk)) await drain()
    },
    async close() {
      return new Promise((resolve, reject) => {
        ws.end((err) => (err ? reject(err) : resolve()))
      })
    },
  }
}

// ─── JSON generator ───────────────────────────────────────────────────────

async function genJson(size, invalid) {
  const name = invalid ? `invalid-${humanSize(size)}.json` : `${humanSize(size)}.json`
  const file = path.join(formatDir('json'), name)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 1 : 0))
  const { nodeToCommunity, pickTarget, communityLabel } = setupClustering(size, rng)

  await w.write('{"version":"1","nodes":[\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    // Invalid variant: every node has JS-style unquoted keys so JSON.parse rejects.
    // The streaming parser silently skips malformed items (by design) so breaking
    // ONE node isn't enough — breaking all of them leaves zero parseable nodes,
    // which downstream GraphBuilder surfaces as "Graph has no nodes to display".
    if (invalid) {
      await w.write(`{id: n${i}, broken: true}`)
    } else {
      const community = communityLabel(nodeToCommunity[i])
      const obj = {
        id: `n${i}`,
        label: labelFor(i),
        properties: {
          community,
          age: p.age,
          active: p.active,
          joined: p.joined,
          tags: p.tags,
        },
      }
      await w.write(JSON.stringify(obj))
    }
    if (i < size - 1) await w.write(',\n')
  }
  await w.write('\n],"edges":[\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    const dst = pickTarget(src)
    const edge = { source: `n${src}`, target: `n${dst}`, weight: Math.round(rng() * 100) / 100 }
    await w.write(JSON.stringify(edge))
    if (e < edgeCount - 1) await w.write(',\n')
  }
  await w.write('\n]}\n')
  await w.close()
}

// ─── CSV edge-list generator ──────────────────────────────────────────────

async function genCsvEdgeList(size, invalid, variant = 'csv') {
  const delim = variant === 'tsv' ? '\t' : ','
  const ext = variant === 'tsv' ? 'tsv' : 'csv'
  const name = invalid ? `invalid-${humanSize(size)}.${ext}` : `${humanSize(size)}.${ext}`
  const file = path.join(formatDir('csv-edge-list'), name)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 2 : 0))
  const { pickTarget } = setupClustering(size, rng)

  if (invalid) {
    // Wrong column names — parser rejects at header validation.
    await w.write(['src', 'dst', 'weight', 'label'].join(delim) + '\n')
  } else {
    await w.write(['source', 'target', 'weight', 'label'].join(delim) + '\n')
  }

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    const dst = pickTarget(src)
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await w.write(`n${src}${delim}n${dst}${delim}${weight}${delim}${label}\n`)
  }
  await w.close()
}

// ─── CSV pair generator (two files) ───────────────────────────────────────

async function genCsvPair(size, invalid, variant = 'csv') {
  const delim = variant === 'tsv' ? '\t' : ','
  const ext = variant === 'tsv' ? 'tsv' : 'csv'
  const prefix = invalid ? `invalid-${humanSize(size)}` : humanSize(size)
  const dir = formatDir('csv-pair')
  const nodesFile = path.join(dir, `${prefix}-nodes.${ext}`)
  const edgesFile = path.join(dir, `${prefix}-edges.${ext}`)
  const nw = writeStream(nodesFile)
  const ew = writeStream(edgesFile)
  const rng = makeRng(size + (invalid ? 3 : 0))
  const { nodeToCommunity, pickTarget, communityLabel } = setupClustering(size, rng)

  const propCols = ['community:string', 'age:number', 'active:boolean', 'joined:date', 'tags:string[]']
  if (invalid) {
    // Missing `id` column in the nodes CSV — the parser throws at validation.
    await nw.write(['name', 'label', ...propCols].join(delim) + '\n')
  } else {
    await nw.write(['id', 'label', ...propCols].join(delim) + '\n')
  }

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    const tagsStr = p.tags.join('|')
    const community = communityLabel(nodeToCommunity[i])
    await nw.write(
      [
        `n${i}`,
        labelFor(i),
        community,
        p.age,
        p.active,
        p.joined,
        tagsStr,
      ].join(delim) + '\n',
    )
  }
  await nw.close()

  await ew.write(['source', 'target', 'weight', 'label'].join(delim) + '\n')
  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    const dst = pickTarget(src)
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await ew.write(`n${src}${delim}n${dst}${delim}${weight}${delim}${label}\n`)
  }
  await ew.close()
}

// ─── GraphML generator ────────────────────────────────────────────────────

async function genGraphML(size, invalid) {
  const name = invalid ? `invalid-${humanSize(size)}.graphml` : `${humanSize(size)}.graphml`
  const file = path.join(formatDir('graphml'), name)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 4 : 0))
  const { nodeToCommunity, pickTarget, communityLabel } = setupClustering(size, rng)

  const rootOpen = invalid ? '<notgraphml>' : '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
  const rootClose = invalid ? '</notgraphml>' : '</graphml>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<key id="lbl" for="node" attr.name="label" attr.type="string"/>\n')
  await w.write('<key id="com" for="node" attr.name="community" attr.type="string"/>\n')
  await w.write('<key id="age" for="node" attr.name="age" attr.type="int"/>\n')
  await w.write('<key id="act" for="node" attr.name="active" attr.type="boolean"/>\n')
  await w.write('<key id="jnd" for="node" attr.name="joined" attr.type="string"/>\n')
  await w.write('<key id="w" for="edge" attr.name="weight" attr.type="double"/>\n')
  await w.write('<graph edgedefault="directed">\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    const community = communityLabel(nodeToCommunity[i])
    await w.write(
      `<node id="n${i}"><data key="lbl">${labelFor(i)}</data><data key="com">${community}</data><data key="age">${p.age}</data><data key="act">${p.active}</data><data key="jnd">${p.joined}</data></node>\n`,
    )
  }

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    const dst = pickTarget(src)
    const weight = Math.round(rng() * 100) / 100
    await w.write(`<edge source="n${src}" target="n${dst}"><data key="w">${weight}</data></edge>\n`)
  }
  await w.write('</graph>\n')
  await w.write(`${rootClose}\n`)
  await w.close()
}

// ─── GEXF generator ───────────────────────────────────────────────────────

async function genGexf(size, invalid) {
  const name = invalid ? `invalid-${humanSize(size)}.gexf` : `${humanSize(size)}.gexf`
  const file = path.join(formatDir('gexf'), name)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 5 : 0))
  const { nodeToCommunity, pickTarget, communityLabel } = setupClustering(size, rng)

  const rootOpen = invalid ? '<notgexf>' : '<gexf xmlns="http://gexf.net/1.3" version="1.3">'
  const rootClose = invalid ? '</notgexf>' : '</gexf>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<graph mode="static" defaultedgetype="directed">\n')
  await w.write('<attributes class="node">\n')
  await w.write('<attribute id="0" title="community" type="string"/>\n')
  await w.write('<attribute id="1" title="age" type="integer"/>\n')
  await w.write('<attribute id="2" title="active" type="boolean"/>\n')
  await w.write('<attribute id="3" title="joined" type="string"/>\n')
  await w.write('</attributes>\n')
  await w.write('<nodes>\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    const community = communityLabel(nodeToCommunity[i])
    await w.write(
      `<node id="n${i}" label="${labelFor(i)}"><attvalues><attvalue for="0" value="${community}"/><attvalue for="1" value="${p.age}"/><attvalue for="2" value="${p.active}"/><attvalue for="3" value="${p.joined}"/></attvalues></node>\n`,
    )
  }
  await w.write('</nodes>\n')
  await w.write('<edges>\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    const dst = pickTarget(src)
    const weight = Math.round(rng() * 100) / 100
    await w.write(`<edge source="n${src}" target="n${dst}" weight="${weight}"/>\n`)
  }
  await w.write('</edges>\n')
  await w.write('</graph>\n')
  await w.write(`${rootClose}\n`)
  await w.close()
}

// ─── Driver ───────────────────────────────────────────────────────────────

async function runOne(format, size, invalid) {
  const start = Date.now()
  const tag = `${invalid ? 'invalid' : 'valid'}-${format}-${humanSize(size)}`
  process.stdout.write(`  ${tag} … `)
  switch (format) {
    case 'json':
      await genJson(size, invalid)
      break
    case 'csv-edge-list':
      // Emit both .csv (comma-separated) and .tsv (tab-separated) so users
      // can exercise either delimiter from the same corpus.
      await genCsvEdgeList(size, invalid, 'csv')
      await genCsvEdgeList(size, invalid, 'tsv')
      break
    case 'csv-pair':
      await genCsvPair(size, invalid, 'csv')
      await genCsvPair(size, invalid, 'tsv')
      break
    case 'graphml':
      await genGraphML(size, invalid)
      break
    case 'gexf':
      await genGexf(size, invalid)
      break
    default:
      throw new Error(`Unknown format: ${format}`)
  }
  const ms = Date.now() - start
  console.log(`done in ${(ms / 1000).toFixed(1)}s`)
}

const targetFormats = onlyFormat === 'all' ? formats : [onlyFormat]
const variants = includeInvalid ? [false, true] : [false]

for (const format of targetFormats) {
  const sizesForFormat = explicitSizes ?? DEFAULT_SIZES_PER_FORMAT[format]
  if (!sizesForFormat) {
    console.warn(`No default sizes for format "${format}", skipping`)
    continue
  }
  console.log(`\n→ ${format}`)
  for (const size of sizesForFormat) {
    for (const invalid of variants) {
      await runOne(format, size, invalid)
    }
  }
}

console.log(`\nOutput directory: ${outDir}`)

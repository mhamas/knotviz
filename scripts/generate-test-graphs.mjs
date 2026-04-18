#!/usr/bin/env node
/**
 * Generate manual-testing graph files in every supported format, at multiple sizes,
 * in both valid and deliberately invalid variants.
 *
 * Output directory: graphs_for_manual_testing_various_formats/
 *   valid-json-<size>.json
 *   valid-csv-edge-list-<size>.csv
 *   valid-csv-pair-<size>-nodes.csv
 *   valid-csv-pair-<size>-edges.csv
 *   valid-graphml-<size>.graphml
 *   valid-gexf-<size>.gexf
 *   invalid-json-<size>.json
 *   invalid-csv-edge-list-<size>.csv
 *   invalid-csv-pair-<size>-nodes.csv
 *   invalid-csv-pair-<size>-edges.csv
 *   invalid-graphml-<size>.graphml
 *   invalid-gexf-<size>.gexf
 *
 * Usage: node scripts/generate-test-graphs.mjs [--sizes=10000,100000,...] [--format=all|json|...]
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

const sizes = (args.get('sizes') ?? '10000,100000,500000,1000000,3000000')
  .split(',')
  .map((s) => Number(s))
const onlyFormat = args.get('format') ?? 'all'
const formats = ['json', 'csv-edge-list', 'csv-pair', 'graphml', 'gexf']

fs.mkdirSync(outDir, { recursive: true })

const humanSize = (n) => {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

// ─── Deterministic pseudo-random helpers ──────────────────────────────────

const LABELS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi']
const TAG_POOL = ['engineer', 'designer', 'founder', 'alumnus', 'board', 'advisor']

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
  const variant = invalid ? 'invalid' : 'valid'
  const file = path.join(outDir, `${variant}-json-${humanSize(size)}.json`)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 1 : 0))

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
      const obj = {
        id: `n${i}`,
        label: LABELS[i % LABELS.length],
        properties: { age: p.age, active: p.active, joined: p.joined, tags: p.tags },
      }
      await w.write(JSON.stringify(obj))
    }
    if (i < size - 1) await w.write(',\n')
  }
  await w.write('\n],"edges":[\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const edge = { source: `n${src}`, target: `n${dst}`, weight: Math.round(rng() * 100) / 100 }
    await w.write(JSON.stringify(edge))
    if (e < edgeCount - 1) await w.write(',\n')
  }
  await w.write('\n]}\n')
  await w.close()
}

// ─── CSV edge-list generator ──────────────────────────────────────────────

async function genCsvEdgeList(size, invalid) {
  const variant = invalid ? 'invalid' : 'valid'
  const file = path.join(outDir, `${variant}-csv-edge-list-${humanSize(size)}.csv`)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 2 : 0))

  if (invalid) {
    // Wrong column names — parser rejects at header validation.
    await w.write('src,dst,weight,label\n')
  } else {
    await w.write('source,target,weight,label\n')
  }

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await w.write(`n${src},n${dst},${weight},${label}\n`)
  }
  await w.close()
}

// ─── CSV pair generator (two files) ───────────────────────────────────────

async function genCsvPair(size, invalid) {
  const variant = invalid ? 'invalid' : 'valid'
  const nodesFile = path.join(outDir, `${variant}-csv-pair-${humanSize(size)}-nodes.csv`)
  const edgesFile = path.join(outDir, `${variant}-csv-pair-${humanSize(size)}-edges.csv`)
  const nw = writeStream(nodesFile)
  const ew = writeStream(edgesFile)
  const rng = makeRng(size + (invalid ? 3 : 0))

  if (invalid) {
    // Missing `id` column in the nodes CSV — the parser throws at validation.
    await nw.write('name,label,age:number,active:boolean,joined:date,tags:string[]\n')
  } else {
    await nw.write('id,label,age:number,active:boolean,joined:date,tags:string[]\n')
  }

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    const tagsStr = p.tags.join('|')
    const nameOrId = `n${i}`
    await nw.write(`${nameOrId},${LABELS[i % LABELS.length]},${p.age},${p.active},${p.joined},${tagsStr}\n`)
  }
  await nw.close()

  await ew.write('source,target,weight,label\n')
  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await ew.write(`n${src},n${dst},${weight},${label}\n`)
  }
  await ew.close()
}

// ─── GraphML generator ────────────────────────────────────────────────────

async function genGraphML(size, invalid) {
  const variant = invalid ? 'invalid' : 'valid'
  const file = path.join(outDir, `${variant}-graphml-${humanSize(size)}.graphml`)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 4 : 0))

  const rootOpen = invalid ? '<notgraphml>' : '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
  const rootClose = invalid ? '</notgraphml>' : '</graphml>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<key id="lbl" for="node" attr.name="label" attr.type="string"/>\n')
  await w.write('<key id="age" for="node" attr.name="age" attr.type="int"/>\n')
  await w.write('<key id="act" for="node" attr.name="active" attr.type="boolean"/>\n')
  await w.write('<key id="jnd" for="node" attr.name="joined" attr.type="string"/>\n')
  await w.write('<key id="w" for="edge" attr.name="weight" attr.type="double"/>\n')
  await w.write('<graph edgedefault="directed">\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    await w.write(`<node id="n${i}"><data key="lbl">${LABELS[i % LABELS.length]}</data><data key="age">${p.age}</data><data key="act">${p.active}</data><data key="jnd">${p.joined}</data></node>\n`)
  }

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    await w.write(`<edge source="n${src}" target="n${dst}"><data key="w">${weight}</data></edge>\n`)
  }
  await w.write('</graph>\n')
  await w.write(`${rootClose}\n`)
  await w.close()
}

// ─── GEXF generator ───────────────────────────────────────────────────────

async function genGexf(size, invalid) {
  const variant = invalid ? 'invalid' : 'valid'
  const file = path.join(outDir, `${variant}-gexf-${humanSize(size)}.gexf`)
  const w = writeStream(file)
  const rng = makeRng(size + (invalid ? 5 : 0))

  const rootOpen = invalid ? '<notgexf>' : '<gexf xmlns="http://gexf.net/1.3" version="1.3">'
  const rootClose = invalid ? '</notgexf>' : '</gexf>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<graph mode="static" defaultedgetype="directed">\n')
  await w.write('<attributes class="node">\n')
  await w.write('<attribute id="0" title="age" type="integer"/>\n')
  await w.write('<attribute id="1" title="active" type="boolean"/>\n')
  await w.write('<attribute id="2" title="joined" type="string"/>\n')
  await w.write('</attributes>\n')
  await w.write('<nodes>\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng, i)
    await w.write(`<node id="n${i}" label="${LABELS[i % LABELS.length]}"><attvalues><attvalue for="0" value="${p.age}"/><attvalue for="1" value="${p.active}"/><attvalue for="2" value="${p.joined}"/></attvalues></node>\n`)
  }
  await w.write('</nodes>\n')
  await w.write('<edges>\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
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
      await genCsvEdgeList(size, invalid)
      break
    case 'csv-pair':
      await genCsvPair(size, invalid)
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

for (const size of sizes) {
  console.log(`\n→ ${humanSize(size)} nodes`)
  for (const format of targetFormats) {
    for (const invalid of [false, true]) {
      await runOne(format, size, invalid)
    }
  }
}

console.log(`\nOutput directory: ${outDir}`)

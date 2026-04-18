#!/usr/bin/env node
/**
 * Generate a 1M-node social-network-style graph with realistic cluster structure.
 * Same shape as gen-social-50k.mjs but scaled up and written via a streaming
 * file writer so it doesn't blow the Node heap on 1M nodes + ~3M edges.
 *
 * Model — tuned for visual cluster legibility at fit-view, not for
 * "realistic social-graph topology". Real social graphs at 1M nodes have
 * thousands of tiny communities that blend into uniform noise on screen;
 * this generator makes fewer, much bigger clusters so the community
 * structure is visible once you colour by `community`.
 *
 *   - ~40 communities, sizes 5k–200k (power-law toward the large end).
 *   - 92% of edges intra-community (high cohesion).
 *   - 8% inter-community with a bias toward adjacent clusters so the
 *     cluster-of-clusters graph itself has some structure.
 *   - Per-node degree 1–5, weighted toward 2–3.
 *   - Node properties useful for filter/colour testing: community (string),
 *     followers (number, power-law), isVerified (bool, ~5%), joinDate (date),
 *     activityScore (number).
 *
 * Output: graphs_for_manual_testing_various_formats/clustered-social-1M.json
 *
 * Usage: node scripts/gen-social-1M.mjs
 */

import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const TOTAL_NODES = 1_000_000
const OUT_PATH = 'graphs_for_manual_testing_various_formats/clustered-social-1M.json'

mkdirSync(dirname(OUT_PATH), { recursive: true })

// ─── Community sizes — few & large, power-law toward big ───────────────────

const TARGET_COMMUNITIES = 40 // aim for ~this many big clusters
const communitySizes = []
{
  let remaining = TOTAL_NODES
  // First pass: allocate with a power-law that favours 20k–80k with a long
  // right tail (a few communities of 100k–200k).
  const weights = []
  let total = 0
  for (let c = 0; c < TARGET_COMMUNITIES; c++) {
    // Skewed toward big: weight ∈ [1, 10]
    const w = 1 + Math.pow(Math.random(), 0.5) * 9
    weights.push(w)
    total += w
  }
  for (let c = 0; c < TARGET_COMMUNITIES; c++) {
    const size = Math.max(5_000, Math.floor((weights[c] / total) * TOTAL_NODES))
    if (size <= remaining) {
      communitySizes.push(size)
      remaining -= size
    }
  }
  // Last community absorbs whatever is left.
  if (remaining > 0) {
    if (communitySizes.length > 0) {
      communitySizes[communitySizes.length - 1] += remaining
    } else {
      communitySizes.push(remaining)
    }
  }
}
const numCommunities = communitySizes.length

// Precompute node → community index mapping (O(1) lookup in the edge loop)
const nodeToCommunity = new Uint32Array(TOTAL_NODES)
const communityStart = new Uint32Array(numCommunities)
const communityEnd = new Uint32Array(numCommunities)
{
  let offset = 0
  for (let c = 0; c < numCommunities; c++) {
    communityStart[c] = offset
    communityEnd[c] = offset + communitySizes[c]
    for (let i = offset; i < offset + communitySizes[c]; i++) nodeToCommunity[i] = c
    offset += communitySizes[c]
  }
}

// ─── Labels ────────────────────────────────────────────────────────────────

const COMMUNITY_NAMES = [
  'Tech', 'Finance', 'Arts', 'Sports', 'Science', 'Music', 'Gaming',
  'Food', 'Travel', 'Health', 'Education', 'Media', 'Fashion', 'Auto',
  'Crypto', 'Film', 'Books', 'Fitness', 'Politics', 'Design',
]
const FIRST_NAMES = [
  'Emma', 'Liam', 'Sofia', 'Noah', 'Mia', 'James', 'Ava', 'Oliver',
  'Luna', 'Ethan', 'Aria', 'Lucas', 'Zoe', 'Mason', 'Lily', 'Alex',
  'Chloe', 'Jack', 'Ella', 'Leo', 'Maya', 'Ben', 'Nora', 'Sam',
  'Ivy', 'Max', 'Ruby', 'Dan', 'Ada', 'Tom', 'Eve', 'Ray',
]

// ─── Streaming writer ──────────────────────────────────────────────────────

const ws = createWriteStream(OUT_PATH, { encoding: 'utf8', highWaterMark: 1 << 20 })
const drain = () => new Promise((resolve) => ws.once('drain', resolve))
const write = async (chunk) => {
  if (!ws.write(chunk)) await drain()
}
const close = () =>
  new Promise((resolve, reject) => ws.end((err) => (err ? reject(err) : resolve())))

// ─── Helpers ───────────────────────────────────────────────────────────────

function pickDegree() {
  const r = Math.random()
  if (r < 0.15) return 1
  if (r < 0.45) return 2
  if (r < 0.75) return 3
  if (r < 0.92) return 4
  return 5
}

function gaussianRandom() {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function pickIntraCommunity(nodeIdx, c) {
  const start = communityStart[c]
  const end = communityEnd[c]
  const range = end - start
  const offset = Math.floor(Math.abs(gaussianRandom()) * range * 0.3) + 1
  const direction = Math.random() < 0.5 ? 1 : -1
  let target = nodeIdx + direction * offset
  if (target < start) target = start
  else if (target >= end) target = end - 1
  return target
}

function pickInterCommunity(c) {
  let targetC
  if (Math.random() < 0.6 && numCommunities > 1) {
    const delta = Math.random() < 0.5 ? -1 : 1
    targetC = ((c + delta) % numCommunities + numCommunities) % numCommunities
  } else {
    targetC = Math.floor(Math.random() * numCommunities)
  }
  if (targetC === c) targetC = (c + 1) % numCommunities
  const start = communityStart[targetC]
  const end = communityEnd[targetC]
  return start + Math.floor(Math.random() * (end - start))
}

// ─── Write nodes ───────────────────────────────────────────────────────────

const start = Date.now()
await write('{"version":"1","nodes":[\n')

for (let i = 0; i < TOTAL_NODES; i++) {
  const c = nodeToCommunity[i]
  const communityLabel = COMMUNITY_NAMES[c % COMMUNITY_NAMES.length] + '_' + c
  const name = FIRST_NAMES[i % FIRST_NAMES.length]
  const surname =
    COMMUNITY_NAMES[c % COMMUNITY_NAMES.length] +
    Math.floor((i - communityStart[c]) / FIRST_NAMES.length)
  const followers = Math.floor(Math.pow(Math.random(), 2) * 10000)
  const isVerified = Math.random() < 0.05
  const joinDate = new Date(2015, 0, 1 + Math.floor(Math.random() * 3650))
    .toISOString()
    .split('T')[0]
  const activityScore = Math.round(Math.random() * 1000) / 10

  // Inline JSON for throughput — all values are safe ASCII by construction.
  await write(
    `{"id":"n${i}","label":"${name} ${surname}","properties":{"community":"${communityLabel}","followers":${followers},"isVerified":${isVerified},"joinDate":"${joinDate}","activityScore":${activityScore}}}`,
  )
  if (i < TOTAL_NODES - 1) await write(',\n')

  if (i > 0 && i % 100_000 === 0) {
    process.stdout.write(`  wrote ${i.toLocaleString()} nodes\n`)
  }
}

// ─── Compute edges ─────────────────────────────────────────────────────────

await write('\n],"edges":[\n')

// Dedup via integer key: (min * (TOTAL+1)) + max. Safe integer as long as
// TOTAL < ~3M, since 3M * 3M ≈ 9 × 10^12 < 2^53.
const STRIDE = TOTAL_NODES + 1
const edgeSet = new Set()
let edgeCount = 0
let firstEdge = true

for (let i = 0; i < TOTAL_NODES; i++) {
  const degree = pickDegree()
  const c = nodeToCommunity[i]
  for (let j = 0; j < degree; j++) {
    const isIntra = Math.random() < 0.92
    const target = isIntra ? pickIntraCommunity(i, c) : pickInterCommunity(c)
    if (target === i) continue
    const a = i < target ? i : target
    const b = i < target ? target : i
    const key = a * STRIDE + b
    if (edgeSet.has(key)) continue
    edgeSet.add(key)
    if (!firstEdge) await write(',\n')
    firstEdge = false
    await write(`{"source":"n${i}","target":"n${target}"}`)
    edgeCount++
  }

  if (i > 0 && i % 100_000 === 0) {
    process.stdout.write(`  processed ${i.toLocaleString()} source nodes (edges so far: ${edgeCount.toLocaleString()})\n`)
  }
}

await write('\n]}\n')
await close()

// ─── Stats ─────────────────────────────────────────────────────────────────

const elapsed = ((Date.now() - start) / 1000).toFixed(1)
const avgDegree = ((edgeCount * 2) / TOTAL_NODES).toFixed(2)
const smallest = Math.min(...communitySizes.slice(0, 1000), communitySizes[0])
// Use a for loop to avoid the Math.max(...array) stack-smash at large N.
let largest = 0
for (const s of communitySizes) if (s > largest) largest = s
let smallestAll = communitySizes[0]
for (const s of communitySizes) if (s < smallestAll) smallestAll = s

console.log('')
console.log(`  Nodes:       ${TOTAL_NODES.toLocaleString()}`)
console.log(`  Edges:       ${edgeCount.toLocaleString()}  (avg degree ${avgDegree})`)
console.log(`  Communities: ${numCommunities.toLocaleString()} (sizes ${smallestAll}–${largest})`)
console.log(`  Written to:  ${OUT_PATH}`)
console.log(`  Took:        ${elapsed}s`)

/**
 * Generates a realistic npm dependency graph fixture for homepage screenshots.
 * Run: node scripts/generate-screenshot-graph.mjs
 * Output: e2e/fixtures/screenshot-graph.json
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Deterministic seeded RNG (mulberry32) ---
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- Real popular npm package names (first ~60) ---
const realPackages = [
  'react', 'react-dom', 'next', 'vue', 'angular', 'svelte', 'solid-js',
  'lodash', 'underscore', 'ramda', 'rxjs', 'immer',
  'express', 'fastify', 'koa', 'hapi', 'nestjs', 'hono',
  'webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'turbopack', 'swc',
  'typescript', 'babel', 'prettier', 'eslint', 'biome',
  'jest', 'vitest', 'mocha', 'chai', 'playwright', 'cypress', 'testing-library',
  'tailwindcss', 'postcss', 'sass', 'styled-components', 'emotion',
  'axios', 'node-fetch', 'got', 'superagent', 'ky',
  'zod', 'yup', 'joi', 'ajv',
  'prisma', 'drizzle-orm', 'typeorm', 'sequelize', 'knex', 'mongoose',
  'redis', 'ioredis', 'pg', 'mysql2', 'better-sqlite3',
  'socket.io', 'ws', 'graphql', 'apollo-server', 'trpc',
  'chalk', 'commander', 'yargs', 'inquirer', 'ora', 'boxen',
  'dotenv', 'cross-env', 'concurrently', 'nodemon', 'tsx', 'ts-node',
  'uuid', 'nanoid', 'date-fns', 'dayjs', 'moment', 'luxon',
  'pino', 'winston', 'bunyan', 'morgan',
  'd3', 'three', 'chart.js', 'recharts', 'echarts',
  'zustand', 'jotai', 'recoil', 'mobx', 'redux', 'redux-toolkit',
  'react-router', 'react-query', 'swr', 'tanstack-query',
  'sharp', 'jimp', 'canvas', 'puppeteer',
  'fs-extra', 'glob', 'chokidar', 'rimraf', 'mkdirp',
  'semver', 'minimatch', 'micromatch', 'picomatch',
  'debug', 'source-map', 'source-map-support',
]

// --- Generated plausible package name parts ---
const prefixes = [
  'fast', 'micro', 'nano', 'super', 'hyper', 'ultra', 'mini', 'tiny',
  'quick', 'smart', 'auto', 'easy', 'simple', 'deep', 'flat', 'safe',
  'pure', 'lazy', 'hot', 'cool', 'next', 'neo', 're', 'un',
]

const roots = [
  'cache', 'store', 'queue', 'stream', 'buffer', 'pool', 'proxy',
  'router', 'handler', 'loader', 'parser', 'render', 'transform',
  'validate', 'serialize', 'compress', 'encrypt', 'hash', 'token',
  'config', 'env', 'logger', 'emitter', 'watcher', 'scheduler',
  'worker', 'cluster', 'bridge', 'adapter', 'connector', 'client',
  'server', 'gateway', 'middleware', 'plugin', 'hook', 'util',
  'helper', 'factory', 'builder', 'resolver', 'mapper', 'reducer',
  'filter', 'sorter', 'merger', 'differ', 'linker', 'bundler',
  'linter', 'formatter', 'compiler', 'transpiler', 'minifier',
  'tester', 'mocker', 'faker', 'seeder', 'migrator',
]

const suffixes = [
  '-js', '-ts', '-node', '-core', '-lite', '-plus', '-pro', '-kit',
  '-hub', '-lab', '-box', '-io', '-x', '-2', '-ng', '',
]

const scopes = ['@app', '@lib', '@util', '@pkg', '@dev', '@tools', '@data', '@net']

function generatePackageName(index) {
  // Mix of scoped and unscoped packages
  const isScoped = rand() < 0.2
  const hasPrefix = rand() < 0.4
  const hasSuffix = rand() < 0.3

  let name = ''
  if (isScoped) name += pick(scopes) + '/'
  if (hasPrefix) name += pick(prefixes) + '-'
  name += pick(roots)
  if (hasSuffix) name += pick(suffixes)

  // Ensure uniqueness by appending index if needed
  return name
}

// --- Build nodes ---
const TARGET_NODES = 300
const usedNames = new Set()
const nodes = []

// Add real packages first
for (const name of realPackages) {
  if (nodes.length >= TARGET_NODES) break
  if (usedNames.has(name)) continue
  usedNames.add(name)
  nodes.push({ id: name })
}

// Generate the rest
let attempts = 0
while (nodes.length < TARGET_NODES && attempts < 5000) {
  attempts++
  const name = generatePackageName(nodes.length)
  if (usedNames.has(name)) continue
  usedNames.add(name)
  nodes.push({ id: name })
}

// --- Assign properties ---
const types = ['library', 'framework', 'tool', 'runtime', 'plugin']
const typeWeights = [0.45, 0.15, 0.2, 0.05, 0.15]
const licenses = ['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'GPL-3.0']
const licenseWeights = [0.55, 0.15, 0.12, 0.1, 0.08]

function weightedPick(items, weights) {
  const r = rand()
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    sum += weights[i]
    if (r < sum) return items[i]
  }
  return items[items.length - 1]
}

// Generate a date between 2020-01-15 and 2026-03-20
const dateMin = new Date('2020-01-15').getTime()
const dateMax = new Date('2026-03-20').getTime()

function randomDate() {
  const ts = dateMin + rand() * (dateMax - dateMin)
  return new Date(ts).toISOString().split('T')[0]
}

// Downloads distribution: log-normal for realism
function randomDownloads() {
  // Use Box-Muller for normal distribution, then exponentiate
  const u1 = rand()
  const u2 = rand()
  const normal = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
  // mean ~12 (corresponds to ~160K), std ~3
  const logVal = 7 + normal * 3.5
  const downloads = Math.round(Math.exp(logVal))
  return Math.max(100, Math.min(50000000, downloads))
}

for (const node of nodes) {
  const isDeprecated = rand() < 0.15
  node.label = node.id
  node.properties = {
    type: weightedPick(types, typeWeights),
    downloads: randomDownloads(),
    deprecated: isDeprecated,
    license: weightedPick(licenses, licenseWeights),
    lastPublished: randomDate(),
  }
}

// --- Build edges ---
const edgeLabels = ['depends on', 'peer dependency', 'dev dependency']
const edgeLabelWeights = [0.6, 0.15, 0.25]
const edges = []
const edgeSet = new Set()

function addEdge(source, target) {
  const key = `${source}->${target}`
  if (edgeSet.has(key)) return false
  if (source === target) return false
  edgeSet.add(key)
  edges.push({
    source,
    target,
    label: weightedPick(edgeLabels, edgeLabelWeights),
  })
  return true
}

const nodeIds = nodes.map((n) => n.id)

// Define hub nodes (first 15 are big hubs like react, lodash, express, etc.)
const hubNodes = nodeIds.slice(0, 15)

// Each hub gets 10-20 connections
for (const hub of hubNodes) {
  const connectionCount = randInt(10, 20)
  const targets = shuffle(nodeIds.filter((id) => id !== hub))
  let added = 0
  for (const target of targets) {
    if (added >= connectionCount) break
    // Some edges go TO hub (depend on it), some FROM hub
    if (rand() < 0.7) {
      addEdge(target, hub) // target depends on hub
    } else {
      addEdge(hub, target) // hub depends on target
    }
    added++
  }
}

// Secondary hubs (next 30 packages) get 5-10 connections
const secondaryHubs = nodeIds.slice(15, 45)
for (const hub of secondaryHubs) {
  const connectionCount = randInt(5, 10)
  const targets = shuffle(nodeIds.filter((id) => id !== hub))
  let added = 0
  for (const target of targets) {
    if (added >= connectionCount) break
    if (rand() < 0.6) {
      addEdge(target, hub)
    } else {
      addEdge(hub, target)
    }
    added++
  }
}

// Regular nodes: ensure each has at least 1-3 connections
for (const nodeId of nodeIds) {
  // Count existing edges for this node
  const existingCount = edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  ).length
  if (existingCount < 2) {
    const needed = randInt(1, 3) - existingCount
    for (let i = 0; i < needed; i++) {
      const target = pick(nodeIds.filter((id) => id !== nodeId))
      if (rand() < 0.5) {
        addEdge(nodeId, target)
      } else {
        addEdge(target, nodeId)
      }
    }
  }
}

// Create 3-4 small isolated clusters (5-8 nodes each, only connected internally)
const unclusteredNodes = nodeIds.slice(200)
let clusterStart = 0
for (let c = 0; c < 4; c++) {
  const clusterSize = randInt(5, 8)
  const cluster = unclusteredNodes.slice(clusterStart, clusterStart + clusterSize)
  clusterStart += clusterSize
  if (cluster.length < 3) break

  // Add internal edges within the cluster
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      if (rand() < 0.4) {
        addEdge(cluster[i], cluster[j])
      }
    }
  }
}

// Add some random cross-connections for variety
const extraEdges = randInt(30, 50)
for (let i = 0; i < extraEdges; i++) {
  const source = pick(nodeIds)
  const target = pick(nodeIds)
  addEdge(source, target)
}

// --- Assemble and write ---
const graph = {
  version: '1',
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    properties: n.properties,
  })),
  edges,
}

const output = JSON.stringify(graph, null, 2)
const outputPath = join(__dirname, '..', 'e2e', 'fixtures', 'screenshot-graph.json')
writeFileSync(outputPath, output, 'utf-8')

const sizeKB = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(1)
console.log(`Generated ${nodes.length} nodes, ${edges.length} edges`)
console.log(`File size: ${sizeKB} KB`)
console.log(`Written to: ${outputPath}`)

// Validation summary
const typeCounts = {}
const licenseCounts = {}
let deprecatedCount = 0
for (const n of nodes) {
  typeCounts[n.properties.type] = (typeCounts[n.properties.type] || 0) + 1
  licenseCounts[n.properties.license] = (licenseCounts[n.properties.license] || 0) + 1
  if (n.properties.deprecated) deprecatedCount++
}
console.log('\nType distribution:', typeCounts)
console.log('License distribution:', licenseCounts)
console.log(`Deprecated: ${deprecatedCount}/${nodes.length} (${((deprecatedCount / nodes.length) * 100).toFixed(1)}%)`)

const downloads = nodes.map((n) => n.properties.downloads)
console.log(`Downloads range: ${Math.min(...downloads)} — ${Math.max(...downloads).toLocaleString()}`)

// Edge degree stats
const degree = {}
for (const e of edges) {
  degree[e.source] = (degree[e.source] || 0) + 1
  degree[e.target] = (degree[e.target] || 0) + 1
}
const degrees = Object.values(degree)
degrees.sort((a, b) => b - a)
console.log(`Max degree: ${degrees[0]}, Top 5: ${degrees.slice(0, 5).join(', ')}`)
console.log(`Min degree: ${degrees[degrees.length - 1]}, Median: ${degrees[Math.floor(degrees.length / 2)]}`)

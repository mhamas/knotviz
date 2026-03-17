#!/usr/bin/env node
/**
 * Converts a CSV edge list (source,target,weight,label) into the graph JSON
 * format expected by the visualizer.
 *
 * Usage:
 *   node scripts/csv-to-graph.mjs <input.csv> [output.json]
 *
 * If output is omitted, writes to stdout.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath) {
  console.error('Usage: node scripts/csv-to-graph.mjs <input.csv> [output.json]')
  process.exit(1)
}

const csv = readFileSync(resolve(inputPath), 'utf-8')
const lines = csv.trim().split('\n')

// Skip header
const header = lines[0].split(',')
const srcIdx = header.indexOf('source')
const tgtIdx = header.indexOf('target')
const weightIdx = header.indexOf('weight')
const labelIdx = header.indexOf('label')

if (srcIdx === -1 || tgtIdx === -1) {
  console.error('CSV must have "source" and "target" columns')
  process.exit(1)
}

const nodeSet = new Set()
const edges = []

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',')
  const source = cols[srcIdx]
  const target = cols[tgtIdx]

  if (!source || !target) continue

  nodeSet.add(source)
  nodeSet.add(target)

  const edge = { source, target }

  if (weightIdx !== -1 && cols[weightIdx]) {
    const w = parseFloat(cols[weightIdx])
    if (!isNaN(w)) edge.weight = w
  }

  if (labelIdx !== -1 && cols[labelIdx]) {
    edge.label = cols[labelIdx]
  }

  edges.push(edge)
}

const nodes = [...nodeSet].map((id) => ({ id, label: id }))

const graph = {
  version: '1',
  nodes,
  edges,
}

const json = JSON.stringify(graph)

if (outputPath) {
  writeFileSync(resolve(outputPath), json, 'utf-8')
  console.log(`Wrote ${nodes.length} nodes, ${edges.length} edges to ${outputPath}`)
} else {
  process.stdout.write(json)
}

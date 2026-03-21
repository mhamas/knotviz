import { readFileSync, writeFileSync } from 'fs'

const path = 'graphs_for_manual_testing/graph_store_with_properties.json'
const d = JSON.parse(readFileSync(path, 'utf8'))
const tags = Array.from({ length: 500 }, (_, i) => 'tag_' + String(i + 1).padStart(3, '0'))
d.nodes.forEach((n, i) => { n.properties.primary_tag = tags[i % 500] })
writeFileSync(path, JSON.stringify(d, null, 2) + '\n')

const d2 = JSON.parse(readFileSync(path, 'utf8'))
const s = new Set(d2.nodes.map(n => n.properties.primary_tag))
console.log('Distinct primary_tag:', s.size)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.join(__dirname, '..', 'graphs_for_manual_testing', 'graph_store_export.json')
const outputPath = path.join(__dirname, '..', 'graphs_for_manual_testing', 'graph_store_with_properties.json')

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))

const categories = ['scraper', 'crawler', 'automation', 'integration', 'analytics', 'utility']
const statuses = ['active', 'deprecated', 'beta', 'stable', 'experimental']
const tiers = ['free', 'basic', 'pro', 'enterprise']
const tags = ['web', 'api', 'social', 'ecommerce', 'data', 'ai', 'search', 'monitoring']

// Deterministic pseudo-random from string
function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const startDate = new Date('2018-01-01').getTime()
const endDate = new Date('2025-12-31').getTime()
const dateRange = endDate - startDate

for (const node of data.nodes) {
  const h = hash(node.id)
  const h2 = hash(node.id + 'x')
  const h3 = hash(node.id + 'y')

  node.properties = {
    // Numbers (4 — various scales for histogram/stats testing)
    monthly_runs: Math.floor(h % 50000),
    rating: Math.round(((h % 500) / 100 + 0.5) * 100) / 100,
    price_usd: Math.round((h2 % 200) * 100) / 100,
    response_time_ms: Math.floor(h3 % 5000) + 50,

    // Strings (4 — various cardinalities for string filter testing)
    category: categories[h % categories.length],
    status: statuses[h2 % statuses.length],
    tier: tiers[h3 % tiers.length],
    primary_tag: tags[h % tags.length],

    // Booleans (4 — various distributions)
    is_verified: h % 3 !== 0,
    is_open_source: h2 % 4 === 0,
    has_api: h3 % 2 === 0,
    is_maintained: h % 5 !== 0,

    // Dates (3 — for date filter/range testing)
    created_at: new Date(startDate + (h % dateRange)).toISOString().split('T')[0],
    last_updated: new Date(startDate + (h2 % dateRange)).toISOString().split('T')[0],
    last_run: new Date(startDate + (h3 % dateRange)).toISOString().split('T')[0],

    // Long-named properties (for truncation/overflow UI testing)
    short_prop: h % 100,
    medium_length_property: h2 % 1000,
    this_is_a_longer_property_name: h3 % 10000,
    this_is_a_really_quite_long_property_name_for_testing: Math.round(((h % 1000) / 10) * 100) / 100,
    this_is_an_extremely_long_property_name_that_should_definitely_overflow_and_test_the_truncation_behavior: h % 2 === 0,
  }
}

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
console.log(`Done. ${data.nodes.length} nodes, ${data.edges.length} edges → ${outputPath}`)

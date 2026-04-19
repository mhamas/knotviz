import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'

const ORDER = [
  'index',
  'input-formats/index',
  'input-formats/json',
  'input-formats/csv-edge-list',
  'input-formats/csv-pair',
  'input-formats/graphml',
  'input-formats/gexf',
  'explore',
  'simulation',
  'filter',
  'search',
  'analyze',
  'export',
  'limits',
  'compare',
  'troubleshooting',
]

const SITE = 'https://knotviz.com/docs'

export const GET: APIRoute = async () => {
  const entries = await getCollection('docs')
  const byId = new Map(entries.map((e) => [e.id, e]))

  const lines: string[] = []
  lines.push('# Knotviz')
  lines.push('')
  lines.push(
    '> Browser-based graph visualization. Drop a file, explore up to ~1M nodes, filter, colour, export. Zero uploads — runs entirely in the browser via WebGL.',
  )
  lines.push('')
  lines.push('## Docs')
  lines.push('')

  for (const id of ORDER) {
    const entry = byId.get(id)
    if (!entry) continue
    const { title, description } = entry.data
    const slug = id === 'index' ? '' : id
    const url = slug ? `${SITE}/${slug}` : SITE
    const desc = description ? `: ${description}` : ''
    lines.push(`- [${title}](${url})${desc}`)
  }

  lines.push('')
  lines.push('## Machine-readable')
  lines.push('')
  lines.push(
    `- [JSON schema](${SITE}/schema.json): JSON Schema for the canonical Knotviz JSON input format`,
  )
  lines.push(
    `- [Full docs as plain text](${SITE}/llms-full.txt): every page concatenated`,
  )
  lines.push(
    `- Any page as raw markdown: append \`.md\` (e.g. \`${SITE}/filter.md\`)`,
  )

  return new Response(lines.join('\n') + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

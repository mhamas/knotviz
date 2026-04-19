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

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '')
}

export const GET: APIRoute = async () => {
  const entries = await getCollection('docs')
  const byId = new Map(entries.map((e) => [e.id, e]))

  const parts: string[] = []
  parts.push('# Knotviz — full docs')
  parts.push('')
  parts.push(
    'Browser-based graph visualization. Drop a file, explore up to ~1M nodes, filter, colour, export. Zero uploads — runs entirely in the browser via WebGL. Canonical URL: https://knotviz.com/docs',
  )
  parts.push('')

  for (const id of ORDER) {
    const entry = byId.get(id)
    if (!entry) continue
    const slug = id === 'index' ? '' : id
    const url = slug ? `${SITE}/${slug}` : SITE
    const body = stripFrontmatter(entry.body ?? '').trim()

    parts.push('---')
    parts.push('')
    parts.push(`# ${entry.data.title}`)
    parts.push('')
    parts.push(`Source: ${url}`)
    parts.push('')
    parts.push(body)
    parts.push('')
  }

  return new Response(parts.join('\n') + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

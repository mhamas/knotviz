/**
 * Fetch a sample graph from /samples/ and return File objects ready to feed
 * through the normal load pipeline. Returns null if the example name is
 * unknown or a fetch fails.
 */
const SINGLE_FILE_EXAMPLES: Record<string, { ext: string }> = {
  json: { ext: 'json' },
  'csv-edge-list': { ext: 'csv' },
  graphml: { ext: 'graphml' },
  gexf: { ext: 'gexf' },
}

async function fetchAsFile(url: string, filename: string, mime: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const blob = await response.blob()
  return new File([blob], filename, { type: mime })
}

export async function loadExample(name: string): Promise<File[] | null> {
  const [format, size] = name.split('/')
  if (!format || !size) return null

  if (format === 'csv-pair') {
    const [nodes, edges] = await Promise.all([
      fetchAsFile(`/samples/csv-pair/${size}-nodes.csv`, `${size}-nodes.csv`, 'text/csv'),
      fetchAsFile(`/samples/csv-pair/${size}-edges.csv`, `${size}-edges.csv`, 'text/csv'),
    ])
    return [nodes, edges]
  }

  const spec = SINGLE_FILE_EXAMPLES[format]
  if (!spec) return null

  const filename = `${size}.${spec.ext}`
  const file = await fetchAsFile(
    `/samples/${format}/${filename}`,
    filename,
    spec.ext === 'json' ? 'application/json' : 'text/plain',
  )
  return [file]
}

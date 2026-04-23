import { formatNumber } from './formatNumber'

export type FileFormat = 'json' | 'csv-edge-list' | 'csv-pair' | 'graphml' | 'gexf'

export interface NamedFile {
  name: string
}

export interface FileFormatResult<T extends NamedFile = NamedFile> {
  format: FileFormat
  /**
   * Files in the order the worker expects. For `csv-pair` this is always
   * `[nodesFile, edgesFile]`. For every other format it's a single-element array.
   */
  orderedFiles: T[]
}

const CSV_EXTENSIONS = new Set(['csv', 'tsv'])

/**
 * Classify a drag-and-drop file list into one of the supported input formats.
 *
 * - A single `.json` / `.csv` / `.tsv` / `.graphml` / `.xml` / `.gexf` file is classified
 *   by its extension (case-insensitive). `.xml` is treated as GraphML since that is the
 *   most common use of `.xml` for graphs.
 * - A pair of CSV/TSV files is classified as `csv-pair` when one filename matches the
 *   `nodes` pattern and the other matches `edges`. The returned `orderedFiles` is always
 *   `[nodesFile, edgesFile]` regardless of the drop order.
 * - Everything else throws with an explanatory message.
 *
 * @param files - The dropped files (or objects with a `.name` for testing).
 * @returns The detected format plus the files ordered for worker consumption.
 * @throws If the count, extensions, or filename pairing cannot be reconciled.
 */
export function detectFileFormat<T extends NamedFile>(files: T[]): FileFormatResult<T> {
  if (files.length === 0) throw new Error('No files provided')
  if (files.length === 1) return detectSingleFile(files[0])
  if (files.length === 2) return detectPair(files)
  throw new Error(
    `Dropped ${formatNumber(files.length)} files; supported drops are a single graph file or a pair of nodes/edges CSV files.`,
  )
}

function detectSingleFile<T extends NamedFile>(file: T): FileFormatResult<T> {
  const ext = extensionOf(file.name)
  switch (ext) {
    case 'csv':
    case 'tsv':
      return { format: 'csv-edge-list', orderedFiles: [file] }
    case 'graphml':
    case 'xml':
      return { format: 'graphml', orderedFiles: [file] }
    case 'gexf':
      return { format: 'gexf', orderedFiles: [file] }
    // json, or anything else (e.g. an extensionless download path): treat as JSON.
    // If the content isn't actually JSON, the worker surfaces "Invalid JSON file".
    default:
      return { format: 'json', orderedFiles: [file] }
  }
}

function detectPair<T extends NamedFile>(files: T[]): FileFormatResult<T> {
  const bothCsv = files.every((f) => CSV_EXTENSIONS.has(extensionOf(f.name)))
  if (!bothCsv) {
    throw new Error('Two-file drops are only supported for a CSV/TSV nodes + edges pair.')
  }
  const nodesFile = files.find((f) => /(^|[^a-z])nodes?([^a-z]|$)/i.test(f.name))
  const edgesFile = files.find((f) => /(^|[^a-z])edges?([^a-z]|$)/i.test(f.name))
  if (!nodesFile || !edgesFile || nodesFile === edgesFile) {
    throw new Error(
      'Could not pair the two CSV files as nodes + edges. Include "nodes" and "edges" in the filenames (e.g. nodes.csv, edges.csv).',
    )
  }
  return { format: 'csv-pair', orderedFiles: [nodesFile, edgesFile] }
}

function extensionOf(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1) return ''
  return name.slice(lastDot + 1).toLowerCase()
}

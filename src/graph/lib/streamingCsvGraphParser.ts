import type { EdgeInput, LoadWarning, NodeInput, PropertyType, PropertyValue } from '../types'
import { inferColumnType, parseTypedCell, parseTypedHeader, type TypedHeader } from './formats'
import { CSVRowStream, detectDelimiter } from './parseCSVRows'

export interface StreamingCsvCallbacks {
  onNode: (node: NodeInput) => void
  onEdge: (edge: EdgeInput) => void
  onProgress?: (bytesProcessed: number) => void
  onWarning?: (warning: LoadWarning) => void
}

/**
 * Stream-parse a single-file CSV/TSV edge list and feed `callbacks.onNode` /
 * `callbacks.onEdge` for each new node id and every valid edge. Nodes are
 * deduplicated internally — `onNode` fires once per unique id the first time
 * it appears in an edge.
 *
 * Memory is O(unique node ids + one row). Suited for hundreds of MB of CSV
 * where the non-streaming variant would need to buffer the whole input and
 * the full GraphData.
 *
 * @param chunks - Async iterable of text chunks (e.g. a decoded File.stream()).
 * @param callbacks - Node / edge / progress callbacks.
 * @throws If the header row lacks `source` or `target`.
 */
export async function parseStreamingEdgeListCSV(
  chunks: AsyncIterable<string>,
  callbacks: StreamingCsvCallbacks,
): Promise<void> {
  const iter = chunks[Symbol.asyncIterator]()
  const { headerText, leftover, done } = await readUntilNewline(iter)
  if (headerText === '' && done) throw new Error('Empty CSV: no header found')

  const delimiter = detectDelimiter(headerText)
  const knownNodeIds = new Set<string>()
  let header: string[] | null = null
  let idxSource = -1
  let idxTarget = -1
  let idxWeight = -1
  let idxLabel = -1
  let rowIndex = 0
  let pendingError: Error | null = null

  const stream = new CSVRowStream(delimiter, (row) => {
    if (pendingError) return
    rowIndex++
    if (!header) {
      header = row.map((c) => c.trim().toLowerCase())
      idxSource = header.indexOf('source')
      idxTarget = header.indexOf('target')
      idxWeight = header.indexOf('weight')
      idxLabel = header.indexOf('label')
      if (idxSource === -1) {
        pendingError = new Error('CSV edge list must have a "source" column')
        return
      }
      if (idxTarget === -1) {
        pendingError = new Error('CSV edge list must have a "target" column')
        return
      }
      return
    }
    emitEdgeListRow(row, rowIndex, {
      idxSource,
      idxTarget,
      idxWeight,
      idxLabel,
      knownNodeIds,
      callbacks,
    })
  })

  // Feed the header+leftover back first, then the rest of the stream.
  stream.write(headerText + '\n')
  if (leftover) stream.write(leftover)
  if (pendingError) throw pendingError

  if (!done) {
    for await (const chunk of { [Symbol.asyncIterator]: () => iter } as AsyncIterable<string>) {
      if (pendingError) throw pendingError
      stream.write(chunk)
    }
  }
  stream.end()
  if (pendingError) throw pendingError
}

/**
 * Stream-parse a two-file CSV/TSV (nodes + edges) into node and edge callbacks.
 *
 * Nodes are consumed first so that `knownIds` is populated before edges are
 * validated. Non-structural column types are inferred from up to
 * `INFERENCE_SAMPLE_SIZE` rows; after that, each row is streamed straight
 * through with no further buffering. Columns declared with a `:type` suffix
 * bypass inference entirely.
 *
 * Memory is O(known node ids + inference sample + one row).
 *
 * @param nodesChunks - Async iterable for the nodes CSV/TSV.
 * @param edgesChunks - Async iterable for the edges CSV/TSV.
 * @param callbacks - Node / edge / progress callbacks.
 * @throws If the nodes CSV lacks `id`, or the edges CSV lacks `source` / `target`.
 */
export async function parseStreamingNodeEdgeCSV(
  nodesChunks: AsyncIterable<string>,
  edgesChunks: AsyncIterable<string>,
  callbacks: StreamingCsvCallbacks,
): Promise<void> {
  const knownIds = new Set<string>()
  await streamNodes(
    nodesChunks,
    (node) => {
      knownIds.add(node.id)
      callbacks.onNode(node)
    },
    callbacks.onWarning,
  )
  await streamEdges(edgesChunks, knownIds, callbacks)
}

// ─── Edge-list row emission (shared) ──────────────────────────────────────

function emitEdgeListRow(
  row: string[],
  rowIndex: number,
  ctx: {
    idxSource: number
    idxTarget: number
    idxWeight: number
    idxLabel: number
    knownNodeIds: Set<string>
    knownIdFilter?: Set<string>
    callbacks: StreamingCsvCallbacks
  },
): void {
  const source = row[ctx.idxSource] ?? ''
  const target = row[ctx.idxTarget] ?? ''
  if (source === '' || target === '') {
    console.warn(`Edges row ${rowIndex}: missing source or target, skipping`)
    return
  }
  if (ctx.knownIdFilter) {
    if (!ctx.knownIdFilter.has(source) || !ctx.knownIdFilter.has(target)) {
      console.warn(
        `Edges row ${rowIndex}: unknown node in edge ${source} → ${target}, skipping`,
      )
      return
    }
  } else {
    if (!ctx.knownNodeIds.has(source)) {
      ctx.knownNodeIds.add(source)
      ctx.callbacks.onNode({ id: source })
    }
    if (!ctx.knownNodeIds.has(target)) {
      ctx.knownNodeIds.add(target)
      ctx.callbacks.onNode({ id: target })
    }
  }
  const edge: EdgeInput = { source, target }
  if (ctx.idxWeight !== -1) {
    const raw = row[ctx.idxWeight] ?? ''
    if (raw !== '') {
      const n = Number(raw)
      if (Number.isFinite(n)) edge.weight = n
      else console.warn(`Edges row ${rowIndex}: non-numeric weight "${raw}", dropping weight`)
    }
  }
  if (ctx.idxLabel !== -1) {
    const raw = row[ctx.idxLabel] ?? ''
    if (raw !== '') edge.label = raw
  }
  ctx.callbacks.onEdge(edge)
}

// ─── Pair: nodes stream ───────────────────────────────────────────────────

const INFERENCE_SAMPLE_SIZE = 1000

interface PropertyColumnSpec {
  name: string
  columnIndex: number
  type: PropertyType
}

async function streamNodes(
  chunks: AsyncIterable<string>,
  onNode: (node: NodeInput) => void,
  onWarning?: (warning: LoadWarning) => void,
): Promise<void> {
  const iter = chunks[Symbol.asyncIterator]()
  const { headerText, leftover, done } = await readUntilNewline(iter)
  if (headerText === '' && done) throw new Error('Empty nodes CSV: no header found')
  const delimiter = detectDelimiter(headerText)

  let header: TypedHeader[] | null = null
  let structural: { idIdx: number; labelIdx: number; xIdx: number; yIdx: number } | null = null
  const untypedColumnIndices: number[] = []
  const typedColumnSpecs: PropertyColumnSpec[] = []
  const inferenceSamples: string[][] = []
  const pendingRows: string[][] = []
  let typesResolved = false
  let pendingError: Error | null = null
  let dataRowIndex = 0

  const processRow = (row: string[]): void => {
    const id = (row[structural!.idIdx] ?? '').trim()
    if (id === '') {
      console.warn(`Nodes row ${dataRowIndex + 1}: missing id, skipping`)
      return
    }
    const node: NodeInput = { id }
    if (structural!.labelIdx !== -1) {
      const v = row[structural!.labelIdx] ?? ''
      if (v !== '') node.label = v
    }
    if (structural!.xIdx !== -1) {
      const raw = row[structural!.xIdx] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) node.x = n
      }
    }
    if (structural!.yIdx !== -1) {
      const raw = row[structural!.yIdx] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) node.y = n
      }
    }
    if (typedColumnSpecs.length > 0) {
      const properties: Record<string, PropertyValue | null> = {}
      for (const spec of typedColumnSpecs) {
        const raw = row[spec.columnIndex] ?? ''
        let coerced: PropertyValue | undefined
        try {
          coerced = parseTypedCell(raw, spec.type)
        } catch (err) {
          const message = (err as Error).message
          console.warn(`Nodes row ${dataRowIndex + 1}: ${message} for property "${spec.name}"`)
          onWarning?.({
            scope: 'nodes',
            kind: 'coercion',
            propertyKey: spec.name,
            row: dataRowIndex + 1,
            value: raw,
            message,
          })
          coerced = undefined
        }
        if (coerced !== undefined) {
          properties[spec.name] = coerced
        } else if (raw === '') {
          // Preserve declared-but-empty columns so GraphBuilder registers the
          // key (parity with parseNodeEdgeCSV, and with JSON's null handling).
          properties[spec.name] = null
        }
      }
      if (Object.keys(properties).length > 0) node.properties = properties
    }
    onNode(node)
  }

  const resolveTypesAndFlush = (): void => {
    for (const columnIndex of untypedColumnIndices) {
      const samples = inferenceSamples.map((r) => r[columnIndex] ?? '')
      const inferredType = inferColumnType(samples)
      const header = typedColumnSpecs.find((s) => s.columnIndex === columnIndex)
      if (header) header.type = inferredType
    }
    typesResolved = true
    for (const r of pendingRows) {
      processRow(r)
      dataRowIndex++
    }
    pendingRows.length = 0
  }

  const stream = new CSVRowStream(delimiter, (row) => {
    if (pendingError) return
    if (!header) {
      header = row.map((c) => parseTypedHeader(c))
      const lower = header.map((h) => h.name.toLowerCase())
      structural = {
        idIdx: lower.indexOf('id'),
        labelIdx: lower.indexOf('label'),
        xIdx: lower.indexOf('x'),
        yIdx: lower.indexOf('y'),
      }
      if (structural.idIdx === -1) {
        pendingError = new Error('Nodes CSV must have an "id" column')
        return
      }
      for (let i = 0; i < header.length; i++) {
        // `label` is intentionally left in the property loop so users can
        // filter/colour by it — it's ALSO consumed structurally as NodeInput.label.
        if (i === structural.idIdx || i === structural.xIdx || i === structural.yIdx) {
          continue
        }
        const h = header[i]
        if (h.type) {
          typedColumnSpecs.push({ name: h.name, columnIndex: i, type: h.type })
        } else {
          untypedColumnIndices.push(i)
          typedColumnSpecs.push({ name: h.name, columnIndex: i, type: 'string' }) // placeholder
        }
      }
      if (untypedColumnIndices.length === 0) typesResolved = true
      return
    }

    if (!typesResolved) {
      inferenceSamples.push(row)
      pendingRows.push(row)
      if (pendingRows.length >= INFERENCE_SAMPLE_SIZE) resolveTypesAndFlush()
      return
    }

    processRow(row)
    dataRowIndex++
  })

  stream.write(headerText + '\n')
  if (leftover) stream.write(leftover)
  if (pendingError) throw pendingError

  if (!done) {
    for await (const chunk of { [Symbol.asyncIterator]: () => iter } as AsyncIterable<string>) {
      if (pendingError) throw pendingError
      stream.write(chunk)
    }
  }
  stream.end()

  if (!typesResolved) resolveTypesAndFlush()
  if (pendingError) throw pendingError
}

// ─── Pair: edges stream ───────────────────────────────────────────────────

async function streamEdges(
  chunks: AsyncIterable<string>,
  knownIds: Set<string>,
  callbacks: StreamingCsvCallbacks,
): Promise<void> {
  const iter = chunks[Symbol.asyncIterator]()
  const { headerText, leftover, done } = await readUntilNewline(iter)
  if (headerText === '' && done) throw new Error('Empty edges CSV: no header found')

  const delimiter = detectDelimiter(headerText)
  let header: string[] | null = null
  let idxSource = -1
  let idxTarget = -1
  let idxWeight = -1
  let idxLabel = -1
  let rowIndex = 0
  let pendingError: Error | null = null

  const ctx = {
    idxSource: -1,
    idxTarget: -1,
    idxWeight: -1,
    idxLabel: -1,
    knownNodeIds: new Set<string>(),
    knownIdFilter: knownIds,
    callbacks,
  }

  const stream = new CSVRowStream(delimiter, (row) => {
    if (pendingError) return
    rowIndex++
    if (!header) {
      header = row.map((c) => c.trim().toLowerCase())
      idxSource = header.indexOf('source')
      idxTarget = header.indexOf('target')
      idxWeight = header.indexOf('weight')
      idxLabel = header.indexOf('label')
      if (idxSource === -1) {
        pendingError = new Error('Edges CSV must have a "source" column')
        return
      }
      if (idxTarget === -1) {
        pendingError = new Error('Edges CSV must have a "target" column')
        return
      }
      ctx.idxSource = idxSource
      ctx.idxTarget = idxTarget
      ctx.idxWeight = idxWeight
      ctx.idxLabel = idxLabel
      return
    }
    emitEdgeListRow(row, rowIndex, ctx)
  })

  stream.write(headerText + '\n')
  if (leftover) stream.write(leftover)
  if (pendingError) throw pendingError

  if (!done) {
    for await (const chunk of { [Symbol.asyncIterator]: () => iter } as AsyncIterable<string>) {
      if (pendingError) throw pendingError
      stream.write(chunk)
    }
  }
  stream.end()
  if (pendingError) throw pendingError
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Pull chunks from `iter` until one contains a newline, then split at that
 * newline. Returns the line (without terminator) and any leftover bytes past
 * the terminator for the caller to feed into the row parser.
 */
async function readUntilNewline(
  iter: AsyncIterator<string>,
): Promise<{ headerText: string; leftover: string; done: boolean }> {
  let buffer = ''
  while (true) {
    const match = buffer.search(/[\r\n]/)
    if (match !== -1) {
      const headerText = buffer.slice(0, match)
      const terminatorLen =
        buffer.charCodeAt(match) === 13 && buffer.charCodeAt(match + 1) === 10 ? 2 : 1
      const leftover = buffer.slice(match + terminatorLen)
      return { headerText, leftover, done: false }
    }
    const next = await iter.next()
    if (next.done) return { headerText: buffer, leftover: '', done: true }
    buffer += next.value
  }
}

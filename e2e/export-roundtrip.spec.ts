/**
 * End-to-end export round-trip matrix.
 *
 * For every (source, target) pair across the five supported formats
 * (json, csv-edge-list, csv-pair, graphml, gexf), drop a known source
 * file, export in the target format, re-import the export, then export
 * one more time as JSON and assert the result matches expectations.
 *
 * The double-export approach lets us inspect the round-trip outcome via
 * a JSON document the test can parse directly — no UI introspection,
 * no Playwright clicks just to read property values.
 *
 * Lossiness is encoded per-pair: csv-edge-list drops per-node properties
 * regardless of source; graphml flattens string[] to pipe-delimited
 * strings (still survives as `string`, just not as an array); the
 * remaining 16 lossless pairs assert full property fidelity.
 *
 * Source files for each format are generated at test-session start by
 * loading source.json into Knotviz, exporting through each serializer,
 * and saving the bytes. This guarantees every source fixture exercises
 * the same logical graph, and is the only test setup that touches the
 * exporters from the Node side — the actual round-trip assertions go
 * through the real browser pipeline.
 */
import { test, expect, type Page, type Download } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_JSON = path.join(__dirname, 'fixtures', 'export-roundtrip', 'source.json')

type Format = 'json' | 'csv-edge-list' | 'csv-pair' | 'graphml' | 'gexf'

const FORMATS: Format[] = ['json', 'csv-edge-list', 'csv-pair', 'graphml', 'gexf']

// Lossy targets: per-node properties / arrays don't fully survive.
const PROPERTY_DROP_TARGETS: Format[] = ['csv-edge-list']
const ARRAY_FLATTEN_TARGETS: Format[] = ['graphml']

let workDir: string

test.beforeAll(async ({ browser }) => {
  // Generate source-format fixtures by running the JSON source through each
  // of Knotviz's serializers. Done once per test session in a temp dir; the
  // 25 round-trip tests below read from here.
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knotviz-export-roundtrip-'))
  const page = await browser.newPage()
  await page.goto('/graph')

  // Load the JSON source so we have the canonical in-memory graph state.
  await dropSingleFile(page, SOURCE_JSON, 'application/json')

  // Export through each format, save bytes per format.
  for (const fmt of FORMATS) {
    const bytes = await downloadAs(page, fmt)
    if (fmt === 'csv-pair') {
      // The export is a ZIP — unzip into nodes.csv + edges.csv on disk so
      // re-import can drop them as separate files.
      const entries = readZip(bytes)
      fs.writeFileSync(path.join(workDir, 'csv-pair-nodes.csv'), entries['nodes.csv'])
      fs.writeFileSync(path.join(workDir, 'csv-pair-edges.csv'), entries['edges.csv'])
    } else {
      const ext = extensionFor(fmt)
      fs.writeFileSync(path.join(workDir, `source.${ext}`), bytes)
    }
  }
  await page.close()
})

test.afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true })
})

// ─── Round-trip matrix: 25 tests ──────────────────────────────────────────

for (const source of FORMATS) {
  for (const target of FORMATS) {
    test(`round-trip ${source} → ${target}`, async ({ page }) => {
      // 1. Drop the source-format fixture.
      await page.goto('/graph')
      await dropSourceFile(page, source)

      // 2. Export in the target format. Save bytes.
      const exportedBytes = await downloadAs(page, target)

      // 3. Reload the page and drop the exported file.
      await page.goto('/graph')
      await dropExportedFile(page, target, exportedBytes)

      // 4. Export once more as JSON to get a parseable comparison surface.
      const finalJsonBytes = await downloadAs(page, 'json')
      const final = JSON.parse(finalJsonBytes.toString('utf8')) as RoundTripJson

      // 5. Assert. Lossy paths get relaxed assertions; lossless paths
      //    assert full property fidelity.
      assertNodesAndEdges(final, source, target)

      const sourceDropsProps = PROPERTY_DROP_TARGETS.includes(source)
      const targetDropsProps = PROPERTY_DROP_TARGETS.includes(target)
      // GraphML flattens string[] to a pipe-encoded string in BOTH directions:
      // as a target it can't represent arrays; as a source the parser loads
      // the pipe-encoded data as a plain string.
      const arrayFlattens =
        ARRAY_FLATTEN_TARGETS.includes(target) || ARRAY_FLATTEN_TARGETS.includes(source)

      if (!sourceDropsProps && !targetDropsProps) {
        assertScalarProps(final)
        if (arrayFlattens) {
          assertArrayFlattened(final)
        } else {
          assertArrayProps(final)
        }
      }
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface RoundTripJson {
  version: string
  nodes: { id: string; label?: string; x?: number; y?: number; properties?: Record<string, unknown> }[]
  edges: { source: string; target: string; weight?: number }[]
}

function extensionFor(fmt: Format): string {
  switch (fmt) {
    case 'json':
      return 'json'
    case 'csv-edge-list':
      return 'csv'
    case 'csv-pair':
      return 'zip'
    case 'graphml':
      return 'graphml'
    case 'gexf':
      return 'gexf'
  }
}

async function dropSingleFile(page: Page, filePath: string, mime: string): Promise<void> {
  const filename = path.basename(filePath)
  const buffer = fs.readFileSync(filePath)
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: filename, mimeType: mime, buffer })
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function dropTwoFiles(
  page: Page,
  files: { name: string; mime: string; buffer: Buffer }[],
): Promise<void> {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles(files.map((f) => ({ name: f.name, mimeType: f.mime, buffer: f.buffer })))
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function dropSourceFile(page: Page, source: Format): Promise<void> {
  switch (source) {
    case 'json':
      return dropSingleFile(page, SOURCE_JSON, 'application/json')
    case 'csv-edge-list':
      return dropSingleFile(page, path.join(workDir, 'source.csv'), 'text/csv')
    case 'csv-pair':
      return dropTwoFiles(page, [
        {
          name: 'nodes.csv',
          mime: 'text/csv',
          buffer: fs.readFileSync(path.join(workDir, 'csv-pair-nodes.csv')),
        },
        {
          name: 'edges.csv',
          mime: 'text/csv',
          buffer: fs.readFileSync(path.join(workDir, 'csv-pair-edges.csv')),
        },
      ])
    case 'graphml':
      return dropSingleFile(page, path.join(workDir, 'source.graphml'), 'application/xml')
    case 'gexf':
      return dropSingleFile(page, path.join(workDir, 'source.gexf'), 'application/xml')
  }
}

async function dropExportedFile(page: Page, target: Format, bytes: Buffer): Promise<void> {
  if (target === 'csv-pair') {
    const entries = readZip(bytes)
    return dropTwoFiles(page, [
      { name: 'nodes.csv', mime: 'text/csv', buffer: Buffer.from(entries['nodes.csv'], 'utf8') },
      { name: 'edges.csv', mime: 'text/csv', buffer: Buffer.from(entries['edges.csv'], 'utf8') },
    ])
  }
  const ext = extensionFor(target)
  const mime =
    target === 'json' ? 'application/json' : target === 'csv-edge-list' ? 'text/csv' : 'application/xml'
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: `roundtrip.${ext}`, mimeType: mime, buffer: bytes })
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function downloadAs(page: Page, format: Format): Promise<Buffer> {
  await page.getByTestId('download-format-picker').click()
  const meta = page.getByTestId(`download-format-${format}`)
  await meta.waitFor({ state: 'visible', timeout: 5_000 })
  const isLossy = format === 'csv-edge-list' || format === 'graphml'
  const downloadPromise = page.waitForEvent('download')
  await meta.click()
  if (isLossy) {
    await page.getByTestId('lossy-export-confirm').click()
  }
  const dl = await downloadPromise
  return readDownloadBytes(dl)
}

async function readDownloadBytes(dl: Download): Promise<Buffer> {
  const tmp = path.join(os.tmpdir(), `knotviz-dl-${Date.now()}-${Math.random()}`)
  await dl.saveAs(tmp)
  const buf = fs.readFileSync(tmp)
  fs.unlinkSync(tmp)
  return buf
}

// ─── Assertions ───────────────────────────────────────────────────────────

const EXPECTED_NODE_IDS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10']
const EXPECTED_EDGE_COUNT = 10

function assertNodesAndEdges(final: RoundTripJson, source: Format, target: Format): void {
  expect(final.nodes.map((n) => n.id).sort()).toEqual(EXPECTED_NODE_IDS.slice().sort())
  expect(final.edges).toHaveLength(EXPECTED_EDGE_COUNT)

  // Spot-check a single weighted edge survives every path that supports weights.
  const e1 = final.edges.find((e) => e.source === 'n1' && e.target === 'n2')
  expect(e1, `${source} → ${target} should preserve edge n1→n2`).toBeDefined()
  expect(e1!.weight).toBeCloseTo(0.8, 3)
}

function assertScalarProps(final: RoundTripJson): void {
  const n1 = final.nodes.find((n) => n.id === 'n1')!
  expect(n1.label).toBe('Alice')
  expect(n1.properties).toBeDefined()
  expect(n1.properties!.age).toBe(34)
  expect(n1.properties!.active).toBe(true)
  expect(n1.properties!.joined).toBe('2021-03-15')
  expect(n1.properties!.community).toBe('Tech')
}

function assertArrayProps(final: RoundTripJson): void {
  const n1 = final.nodes.find((n) => n.id === 'n1')!
  expect(n1.properties!.tags).toEqual(['engineer', 'founder'])
}

function assertArrayFlattened(final: RoundTripJson): void {
  const n1 = final.nodes.find((n) => n.id === 'n1')!
  // GraphML has no list type — string[] arrives back as a pipe-delimited
  // string. Verify it stayed semantically intact even though the type
  // demoted.
  expect(n1.properties!.tags).toBe('engineer|founder')
}

// ─── Hand-rolled ZIP reader ───────────────────────────────────────────────
// Same logic as src/graph/test/exports/csvPair.test.ts — handles client-zip's
// data-descriptor streaming mode (local-header sizes are zero; actual sizes
// arrive in a trailing data descriptor). STORE-only.

function readZip(buffer: Buffer): Record<string, string> {
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const decoder = new TextDecoder()
  const files: Record<string, string> = {}
  const LFH_SIG = [0x50, 0x4b, 0x03, 0x04]
  const CDIR_SIG = [0x50, 0x4b, 0x01, 0x02]
  const DD_SIG = [0x50, 0x4b, 0x07, 0x08]

  function matchesAt(pos: number, sig: number[]): boolean {
    for (let i = 0; i < sig.length; i++) if (data[pos + i] !== sig[i]) return false
    return true
  }

  let offset = 0
  while (offset < data.length - 4 && matchesAt(offset, LFH_SIG)) {
    const view = new DataView(data.buffer, data.byteOffset + offset)
    const gpFlags = view.getUint16(6, true)
    const lfhCompressed = view.getUint32(18, true)
    const nameLen = view.getUint16(26, true)
    const extraLen = view.getUint16(28, true)
    const nameStart = offset + 30
    const name = decoder.decode(data.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen

    if ((gpFlags & 0x0008) !== 0) {
      let p = dataStart
      while (
        p < data.length - 4 &&
        !matchesAt(p, DD_SIG) &&
        !matchesAt(p, LFH_SIG) &&
        !matchesAt(p, CDIR_SIG)
      ) {
        p++
      }
      const ddView = new DataView(data.buffer, data.byteOffset + p)
      const withSig = matchesAt(p, DD_SIG)
      const ddCompressed = withSig ? ddView.getUint32(8, true) : ddView.getUint32(4, true)
      const ddLen = (withSig ? 4 : 0) + 12
      files[name] = decoder.decode(data.subarray(dataStart, dataStart + ddCompressed))
      offset = p + ddLen
      continue
    }

    files[name] = decoder.decode(data.subarray(dataStart, dataStart + lfhCompressed))
    offset = dataStart + lfhCompressed
  }
  return files
}

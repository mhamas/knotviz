/**
 * Hard-content round-trip: a graph whose labels, properties, and ids
 * contain content that exercises every codec corner — unicode, emoji,
 * RTL scripts, CSV-reserved characters (commas, quotes, newlines), XML-
 * reserved characters (`<`, `>`, `&`, `'`, `"`), pipes in regular strings,
 * pipes inside string[] values.
 *
 * The serializer unit tests in src/graph/test/exports/scenarios.test.ts
 * cover these same shapes at the pure-function level. This spec runs the
 * full browser pipeline — the file goes through the loading worker on
 * import, the export code path in GraphView on download, `client-zip`
 * for the CSV pair ZIP, and back through the worker on re-import — to
 * catch any encoding hiccup that only appears when bytes actually cross
 * the worker / browser boundary.
 *
 * Drops the hard-content fixture, exports it as each of the five target
 * formats, re-imports each, and exports once more as JSON to get a
 * parseable assertion surface. Lossy paths (CSV edge list, GraphML) get
 * relaxed checks appropriate to the format.
 */
import { test, expect, type Page, type Download } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { readZipEntries } from '../src/graph/test/exports/readZip'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(__dirname, 'fixtures', 'export-roundtrip', 'hard-content.json')

type Format = 'json' | 'csv-edge-list' | 'csv-pair' | 'graphml' | 'gexf'
const FORMATS: Format[] = ['json', 'csv-edge-list', 'csv-pair', 'graphml', 'gexf']

for (const target of FORMATS) {
  test(`hard-content round-trip: json → ${target} → json`, async ({ page }) => {
    await page.goto('/graph')
    await dropSingle(page, SOURCE, 'application/json')

    const exportedBytes = await downloadAs(page, target)

    await page.goto('/graph')
    await dropExported(page, target, exportedBytes)

    const finalBytes = await downloadAs(page, 'json')
    const final = JSON.parse(finalBytes.toString('utf8'))

    // ── Invariants that hold for every target ─────────────────────────
    // Node ids survive regardless of format (even CSV edge list).
    const ids = final.nodes.map((n: { id: string }) => n.id).sort()
    expect(ids).toContain('n1')
    expect(ids).toContain('n2')
    expect(ids).toContain('n5')
    // Edge count matches (self-loops / multi-edges not in this fixture).
    expect(final.edges.length).toBe(4)
    // Known weight survives.
    const e12 = final.edges.find((e: { source: string; target: string; weight?: number }) => e.source === 'n1' && e.target === 'n2')
    expect(e12?.weight).toBeCloseTo(0.8, 3)

    if (target === 'csv-edge-list') {
      // CSV edge list drops everything per-node. Stop here.
      return
    }

    // ── Per-node unicode + special-char assertions ────────────────────
    const byId = Object.fromEntries(final.nodes.map((n: { id: string }) => [n.id, n]))

    // n1: Åsa Lindström / 日本語 / line1\nline2 / [π, Ω]
    expect(byId.n1.label).toBe('Åsa Lindström')
    expect(byId.n1.properties.community).toBe('日本語')
    expect(byId.n1.properties.note).toBe('line1\nline2')
    // Array types: lossless for json/csv-pair/gexf, flattened for graphml.
    if (target === 'graphml') {
      expect(byId.n1.properties.tags).toBe('π|Ω')
    } else {
      expect(byId.n1.properties.tags).toEqual(['π', 'Ω'])
    }

    // n2: 🎉 Party / עברית RTL / 'Smith, Jane' / [🔥, 💧]
    expect(byId.n2.label).toBe('🎉 Party Person')
    expect(byId.n2.properties.community).toBe('עברית')
    expect(byId.n2.properties.note).toBe('Smith, Jane')

    // n3: <script>alert('x')</script> / a & b < c > d / he said "hi"
    expect(byId.n3.label).toBe("<script>alert('x')</script>")
    expect(byId.n3.properties.community).toBe('a & b < c > d')
    expect(byId.n3.properties.note).toBe('he said "hi"')

    // n4: mixed scripts, commas + quotes inside property values.
    expect(byId.n4.label).toBe('Żółty ruski кирилица')
    expect(byId.n4.properties.community).toBe('commas, and "quotes"')

    // n5: pipe inside a regular :string column (NOT string[]).
    expect(byId.n5.properties.note).toBe('pipe|in|string')
    // And a string[] whose members literally contain pipes (escape
    // machinery must survive round-trip).
    if (target === 'graphml') {
      // GraphML: arrays flatten. Each element's internal `|` becomes `\|`.
      expect(byId.n5.properties.tags).toBe('a\\|b|c')
    } else {
      expect(byId.n5.properties.tags).toEqual(['a|b', 'c'])
    }
  })
}

// ─── Helpers (simplified clones of export-roundtrip.spec.ts) ──────────────

async function dropSingle(page: Page, filePath: string, mime: string): Promise<void> {
  const filename = path.basename(filePath)
  const buffer = fs.readFileSync(filePath)
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: filename, mimeType: mime, buffer })
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function dropTwo(page: Page, files: { name: string; mime: string; buffer: Buffer }[]): Promise<void> {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles(files.map((f) => ({ name: f.name, mimeType: f.mime, buffer: f.buffer })))
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function dropExported(page: Page, target: Format, bytes: Buffer): Promise<void> {
  if (target === 'csv-pair') {
    const entries = readZipEntries(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    return dropTwo(page, [
      { name: 'nodes.csv', mime: 'text/csv', buffer: Buffer.from(entries['nodes.csv'], 'utf8') },
      { name: 'edges.csv', mime: 'text/csv', buffer: Buffer.from(entries['edges.csv'], 'utf8') },
    ])
  }
  const extByFormat: Record<Exclude<Format, 'csv-pair'>, string> = {
    json: 'json',
    'csv-edge-list': 'csv',
    graphml: 'graphml',
    gexf: 'gexf',
  }
  const mime =
    target === 'json' ? 'application/json' : target === 'csv-edge-list' ? 'text/csv' : 'application/xml'
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: `hard.${extByFormat[target]}`, mimeType: mime, buffer: bytes })
  await page.getByTestId('sigma-canvas').waitFor({ state: 'visible', timeout: 15_000 })
}

async function downloadAs(page: Page, format: Format): Promise<Buffer> {
  await page.getByTestId('download-format-picker').click()
  const target = page.getByTestId(`download-format-${format}`)
  await target.waitFor({ state: 'visible', timeout: 5_000 })
  const isLossy = format === 'csv-edge-list' || format === 'graphml'
  const downloadPromise = page.waitForEvent('download')
  await target.click()
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

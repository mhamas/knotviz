# Manual testing — input formats & large files

Automated tests cover happy paths, schema-level malformations, and edge cases for each supported input format. Some things are impractical to cover in CI because they need real files that are too large to commit (hundreds of MB to sub-GB per file). This document describes the manual-testing corpus and what to look for when exercising it.

## Generating the corpus

```bash
node scripts/generate-test-graphs.mjs
```

Output lands in `graphs_for_manual_testing_various_formats/` (gitignored). By default only **valid** files are produced; automated tests cover the invalid side (`npm run test:large-graphs`). To regenerate with invalid variants too, pass `--include-invalid`.

```bash
node scripts/generate-test-graphs.mjs --sizes=10000,100000          # small sizes only
node scripts/generate-test-graphs.mjs --format=csv-edge-list         # one format
node scripts/generate-test-graphs.mjs --format=json --sizes=3000000  # a single file
node scripts/generate-test-graphs.mjs --include-invalid              # add malformed variants
```

Contents (30 files by default — 5 sizes × 5 formats; doubles to 60 with `--include-invalid`) organised into per-format subfolders so you can exercise one format at a time:

```
graphs_for_manual_testing_various_formats/
├── json/              {size}.json
├── csv-edge-list/     {size}.csv
├── csv-pair/          {size}-nodes.csv + {size}-edges.csv
├── graphml/           {size}.graphml
└── gexf/              {size}.gexf
```

With `--include-invalid`, each subfolder also gets `invalid-{size}.*` files alongside. What each invalid variant breaks:

| Folder | Invalid fault |
|---|---|
| `json/` | Every node object uses JS-style unquoted keys so the per-item `JSON.parse` fails; streaming path produces zero nodes and downstream reports "Graph has no nodes to display" |
| `csv-edge-list/` | Header uses `src,dst` instead of `source,target` |
| `csv-pair/` | Nodes file header uses `name` instead of `id` |
| `graphml/` | Wrapped in `<notgraphml>` root |
| `gexf/` | Wrapped in `<notgexf>` root |

Sizes: `10k`, `100k`, `500k`, `1M`, `3M`.

## Manual checklist

Start the dev server and open `http://localhost:5173/graph`.

```bash
npm run dev
```

### 1. Small files (10k, 100k) — correctness

For each format, valid and invalid:

- [ ] Drop the **valid** file → graph renders within a second, node/edge counts in sidebar match the file
- [ ] Drop the **invalid** file → error message appears inline under the drop zone; no graph loads
- [ ] Error message names the problem clearly (not just "failed to parse")

For the CSV pair:

- [ ] Drop **both files at once** → treated as a pair, graph loads
- [ ] Drop **only one of the two** → treated as single-file CSV edge-list → error (expected — single CSV is edge-list semantics)

### 2. Medium files (500k, 1M)

- [ ] Valid JSON loads within ~10s for 1M; progress indicator shows "Streaming nodes… / Streaming edges…" for the largest case (crosses the 200 MB streaming threshold)
- [ ] Valid CSV edge-list / CSV pair loads — UI remains responsive
- [ ] Valid GraphML / GEXF loads — UI remains responsive (these are XML and around ~240 MB for 1M)
- [ ] Invalid variants error **immediately** — users should not be forced to wait through a full-file read just to see "wrong root element"

### 3. Large files (3M)

- [ ] Valid JSON: loads, ~30–60s, memory stays reasonable (streaming parser never holds whole file)
- [ ] Valid CSV edge-list: loads
- [ ] Valid CSV pair: loads
- [ ] Valid GraphML (~720 MB): watch for OOM; if it fails, note the threshold
- [ ] Valid GEXF (~715 MB): same
- [ ] Invalid 3M files: error shows quickly (within a few seconds), not after reading the whole file

### 4. Cross-cutting

- [ ] Switching between formats (drop one, reset, drop a different one) works without stale state
- [ ] After loading a big file, canvas interactions (pan/zoom/simulation) remain responsive
- [ ] Null-default modal appears and lets you cancel or confirm when properties are missing
- [ ] Tooltip on a node shows all properties correctly regardless of which format you loaded from

## Things that deserve attention if something misbehaves

- **Memory**: 3M-node GraphML held in memory as a parsed XML tree could OOM in a tab. If parsers fail to handle this size, we may want to switch GraphML / GEXF to streaming (SAX-style).
- **XML entity decoding**: if strings like `fish & chips` come through as `fish &amp; chips`, that's the XML parser not decoding entities.
- **Numeric edge cases**: zip codes with leading zeros must stay as strings, not become numbers. The generator doesn't produce these — add a custom test file if this matters for your real data.
- **Unicode**: the generator doesn't emit non-ASCII; if you need to verify emoji / CJK handling, either hand-edit one of the generated files or drop one of your own.

## Automated large-file coverage

Most of what manual testing used to do is now automated:

```bash
npm run test:large-graphs                             # all sizes (10k → 3M), all 5 formats
npm run test:large-graphs -- --sizes=10000,100000     # small subset
npm run test:large-graphs -- --sizes=3000000          # single size
```

The suite generates each file on the fly in the OS temp dir, runs the production parser against it, and deletes the file in a `finally` block. Valid files only — schema-level malformations are cheap to test in the normal unit suite (no need to generate a 600 MB file to verify "wrong header rejected"). See `src/graph/test/large-files/`.

## Related small-file coverage

Structural edge cases + invalid files are covered exhaustively here:

- `src/graph/test/parseCSVRows.test.ts`, `parseEdgeListCSV.test.ts`, `parseNodeEdgeCSV.test.ts`
- `src/graph/test/parseGraphML.test.ts`, `parseGEXF.test.ts`
- `src/graph/test/detectFileFormat.test.ts`
- `e2e/import-formats.spec.ts`

Anything manual testing reveals that isn't covered there should be added as a regression test.

import { describe, it, expect } from 'vitest'
import { detectFileFormat } from '../lib/detectFileFormat'

describe('detectFileFormat', () => {
  it('recognises a single .json file as the json format', () => {
    const r = detectFileFormat([{ name: 'graph.json' }])
    expect(r.format).toBe('json')
    expect(r.orderedFiles).toEqual([{ name: 'graph.json' }])
  })

  it('recognises a single .csv file as csv-edge-list', () => {
    expect(detectFileFormat([{ name: 'edges.csv' }]).format).toBe('csv-edge-list')
  })

  it('recognises a single .tsv file as csv-edge-list', () => {
    expect(detectFileFormat([{ name: 'edges.tsv' }]).format).toBe('csv-edge-list')
  })

  it('recognises .graphml as graphml', () => {
    expect(detectFileFormat([{ name: 'sample.graphml' }]).format).toBe('graphml')
  })

  it('recognises .gexf as gexf', () => {
    expect(detectFileFormat([{ name: 'sample.gexf' }]).format).toBe('gexf')
  })

  it('treats .xml as graphml (most common usage)', () => {
    expect(detectFileFormat([{ name: 'sample.xml' }]).format).toBe('graphml')
  })

  it('is case-insensitive on extensions', () => {
    expect(detectFileFormat([{ name: 'GRAPH.JSON' }]).format).toBe('json')
    expect(detectFileFormat([{ name: 'Data.CSV' }]).format).toBe('csv-edge-list')
    expect(detectFileFormat([{ name: 'sample.GraphML' }]).format).toBe('graphml')
  })

  it('defaults unrecognised or missing single-file extensions to json', () => {
    // Rationale: download temp paths often lack extensions; if the content isn't
    // actually JSON, the worker surfaces "Invalid JSON file" at parse time.
    expect(detectFileFormat([{ name: 'data.txt' }]).format).toBe('json')
    expect(detectFileFormat([{ name: 'no-extension' }]).format).toBe('json')
  })

  it('pairs two CSVs named nodes/edges regardless of drop order', () => {
    const a = detectFileFormat([{ name: 'nodes.csv' }, { name: 'edges.csv' }])
    const b = detectFileFormat([{ name: 'edges.csv' }, { name: 'nodes.csv' }])
    expect(a.format).toBe('csv-pair')
    expect(b.format).toBe('csv-pair')
    expect(a.orderedFiles.map((f) => f.name)).toEqual(['nodes.csv', 'edges.csv'])
    expect(b.orderedFiles.map((f) => f.name)).toEqual(['nodes.csv', 'edges.csv'])
  })

  it('accepts nodes/edges pairs with suffixes and TSV', () => {
    const r = detectFileFormat([
      { name: 'my-nodes-v1.csv' },
      { name: 'my-edges-v1.csv' },
    ])
    expect(r.format).toBe('csv-pair')
  })

  it('allows mixed .csv and .tsv in a pair', () => {
    const r = detectFileFormat([{ name: 'nodes.csv' }, { name: 'edges.tsv' }])
    expect(r.format).toBe('csv-pair')
  })

  it('throws when a two-file drop cannot be paired by filename', () => {
    expect(() =>
      detectFileFormat([{ name: 'a.csv' }, { name: 'b.csv' }]),
    ).toThrow(/nodes.*edges/)
  })

  it('throws when two files are not both CSV/TSV', () => {
    expect(() =>
      detectFileFormat([{ name: 'graph.json' }, { name: 'edges.csv' }]),
    ).toThrow()
  })

  it('throws on three or more files', () => {
    expect(() =>
      detectFileFormat([{ name: 'a.csv' }, { name: 'b.csv' }, { name: 'c.csv' }]),
    ).toThrow()
  })

  it('throws on zero files', () => {
    expect(() => detectFileFormat([])).toThrow()
  })

  it('pairs CSV filenames containing spaces around the tokens', () => {
    const r = detectFileFormat([{ name: 'graph nodes.csv' }, { name: 'graph edges.csv' }])
    expect(r.format).toBe('csv-pair')
    expect(r.orderedFiles.map((f) => f.name)).toEqual(['graph nodes.csv', 'graph edges.csv'])
  })

  it('throws when one filename contains both nodes and edges tokens', () => {
    // Ambiguous: both nodes and edges match the same file.
    expect(() =>
      detectFileFormat([{ name: 'nodes-and-edges.csv' }, { name: 'friends.csv' }]),
    ).toThrow(/nodes.*edges/)
  })

  it('throws clearly for three or more files', () => {
    expect(() =>
      detectFileFormat([
        { name: 'a.csv' },
        { name: 'b.csv' },
        { name: 'c.csv' },
        { name: 'd.csv' },
      ]),
    ).toThrow(/4 files/)
  })

  it('throws when two CSVs both match only the nodes token', () => {
    expect(() =>
      detectFileFormat([{ name: 'nodes.csv' }, { name: 'more-nodes.csv' }]),
    ).toThrow(/nodes.*edges/)
  })
})

import { describe, expect, it } from 'vitest'
import { filenameFor } from '../../lib/exports/download'

describe('filenameFor', () => {
  it('swaps a known extension for the target format', () => {
    expect(filenameFor('acme.json', 'gexf')).toBe('acme.gexf')
  })

  it('is case-insensitive on the source extension', () => {
    expect(filenameFor('ACME.JSON', 'gexf')).toBe('ACME.gexf')
  })

  it('strips only the last recognised extension so multi-dot stems survive', () => {
    // `my.graph.data.json` is a real-world case — the user has a stem
    // that already contains dots. We strip the `.json` but keep the rest.
    expect(filenameFor('my.graph.data.json', 'graphml')).toBe('my.graph.data.graphml')
  })

  it('leaves unknown extensions alone', () => {
    // A filename like `data.2024-04-22` has no recognised format suffix,
    // so the whole thing is treated as the stem and the new extension
    // simply appends.
    expect(filenameFor('data.2024-04-22', 'json')).toBe('data.2024-04-22.json')
  })

  it('falls back to knotviz-export when the source is empty', () => {
    expect(filenameFor('', 'json')).toBe('knotviz-export.json')
    expect(filenameFor(undefined, 'gexf')).toBe('knotviz-export.gexf')
  })

  it('trims whitespace around the source filename', () => {
    expect(filenameFor('  acme.json  ', 'graphml')).toBe('acme.graphml')
  })

  it('handles every Knotviz-supported input extension', () => {
    expect(filenameFor('a.json', 'gexf')).toBe('a.gexf')
    expect(filenameFor('a.csv', 'gexf')).toBe('a.gexf')
    expect(filenameFor('a.tsv', 'gexf')).toBe('a.gexf')
    expect(filenameFor('a.graphml', 'gexf')).toBe('a.gexf')
    expect(filenameFor('a.gexf', 'json')).toBe('a.json')
    expect(filenameFor('a.xml', 'gexf')).toBe('a.gexf')
    expect(filenameFor('a.zip', 'json')).toBe('a.json')
  })
})

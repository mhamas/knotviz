import { describe, it, expect } from 'vitest'
import { CSVRowStream } from '../lib/parseCSVRows'

function collectRows(delimiter: string, chunks: string[]): string[][] {
  const rows: string[][] = []
  const stream = new CSVRowStream(delimiter, (row) => {
    rows.push(row)
  })
  for (const c of chunks) stream.write(c)
  stream.end()
  return rows
}

describe('CSVRowStream', () => {
  it('emits rows as they complete', () => {
    const rows = collectRows(',', ['a,b\n1,2\n3,4'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('handles a row split across two chunks mid-cell', () => {
    const rows = collectRows(',', ['a,', 'b\n1', ',2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles a row split across two chunks mid-newline (CRLF between chunks)', () => {
    // '\r' ends chunk 1; '\n' starts chunk 2 — should still count as one CRLF terminator.
    const rows = collectRows(',', ['a,b\r', '\n1,2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles a quoted cell split across chunks', () => {
    const rows = collectRows(',', ['name,role\n"Smith', ', John",dev'])
    expect(rows).toEqual([
      ['name', 'role'],
      ['Smith, John', 'dev'],
    ])
  })

  it('handles escaped quote inside a quoted cell spanning chunks', () => {
    // '"she said ""hi"""' split across chunks.
    const rows = collectRows(',', ['a,b\n"she said ""', 'hi"""', ',2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['she said "hi"', '2'],
    ])
  })

  it('strips a UTF-8 BOM even when it arrives in a standalone chunk', () => {
    const rows = collectRows(',', ['\uFEFF', 'a,b\n1,2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('skips blank lines that span chunk boundaries', () => {
    const rows = collectRows(',', ['a,b\n', '\n', '1,2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('skips lines starting with # even when pushed through chunk boundaries', () => {
    const rows = collectRows(',', ['a,b\n# com', 'ment\n1,2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('emits the last row on end() if it lacks a trailing newline', () => {
    const rows = collectRows(',', ['a,b\n1,2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles a one-character-at-a-time chunking', () => {
    const text = 'a,b\n"x,y",2\n3,4'
    const chunks = text.split('')
    const rows = collectRows(',', chunks)
    expect(rows).toEqual([
      ['a', 'b'],
      ['x,y', '2'],
      ['3', '4'],
    ])
  })

  it('supports tab delimiter across chunks', () => {
    const rows = collectRows('\t', ['a\tb\n1\t', '2'])
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

import { describe, it, expect } from 'vitest'
import { parseCSVRows, detectDelimiter } from '../lib/parseCSVRows'

describe('parseCSVRows', () => {
  it('parses a simple comma-separated file', () => {
    const text = 'a,b,c\n1,2,3\n4,5,6'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it('parses tab-separated values', () => {
    const text = 'a\tb\tc\n1\t2\t3'
    expect(parseCSVRows(text, '\t')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles CRLF line endings', () => {
    const text = 'a,b\r\n1,2\r\n3,4'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('preserves quoted fields containing the delimiter', () => {
    const text = 'name,role\n"Smith, John",dev'
    expect(parseCSVRows(text, ',')).toEqual([
      ['name', 'role'],
      ['Smith, John', 'dev'],
    ])
  })

  it('preserves quoted fields containing newlines', () => {
    const text = 'a,b\n"line1\nline2",2'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['line1\nline2', '2'],
    ])
  })

  it('decodes escaped quotes inside quoted fields', () => {
    const text = 'a,b\n"she said ""hi""",2'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['she said "hi"', '2'],
    ])
  })

  it('handles trailing newline', () => {
    const text = 'a,b\n1,2\n'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('skips blank lines', () => {
    const text = 'a,b\n\n1,2\n\n'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('skips lines starting with #', () => {
    const text = 'a,b\n# this is a comment\n1,2'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseCSVRows('', ',')).toEqual([])
  })

  it('preserves empty cells', () => {
    const text = 'a,b,c\n1,,3'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ])
  })

  it('preserves trailing empty cell after trailing delimiter', () => {
    const text = 'a,b,c\n1,2,'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', ''],
    ])
  })
})

describe('parseCSVRows — robustness', () => {
  it('strips a UTF-8 BOM from the start of the file', () => {
    const text = '\uFEFFa,b\n1,2'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles mixed CRLF and LF line endings', () => {
    const text = 'a,b\r\n1,2\n3,4\r\n5,6'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ])
  })

  it('handles CR-only line endings (Mac classic)', () => {
    const text = 'a,b\r1,2\r3,4'
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('accepts quoted header cells', () => {
    const text = '"source","target"\na,b'
    expect(parseCSVRows(text, ',')).toEqual([
      ['source', 'target'],
      ['a', 'b'],
    ])
  })

  it('preserves unicode content in cells and headers', () => {
    const text = 'name,emoji\nAlíçe,🎉\n博,Bob'
    expect(parseCSVRows(text, ',')).toEqual([
      ['name', 'emoji'],
      ['Alíçe', '🎉'],
      ['博', 'Bob'],
    ])
  })

  it('preserves a whitespace-only cell as its literal content', () => {
    const text = 'a,b\n , '
    expect(parseCSVRows(text, ',')).toEqual([
      ['a', 'b'],
      [' ', ' '],
    ])
  })
})

describe('detectDelimiter', () => {
  it('detects comma by default', () => {
    expect(detectDelimiter('a,b,c')).toBe(',')
  })

  it('detects tab when tabs outnumber commas on the header line', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
  })

  it('falls back to comma when neither delimiter appears', () => {
    expect(detectDelimiter('single-column')).toBe(',')
  })
})

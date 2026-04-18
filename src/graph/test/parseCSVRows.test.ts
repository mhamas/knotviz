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

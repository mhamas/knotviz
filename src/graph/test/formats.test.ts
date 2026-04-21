import { describe, it, expect } from 'vitest'
import {
  parseTypedHeader,
  splitStringArray,
  serializeStringArray,
  parseTypedCell,
  inferColumnType,
} from '../lib/formats'

describe('parseTypedHeader', () => {
  it('parses plain header with no type', () => {
    expect(parseTypedHeader('label')).toEqual({ name: 'label' })
  })

  it('parses typed headers for every PropertyType', () => {
    expect(parseTypedHeader('age:number')).toEqual({ name: 'age', type: 'number' })
    expect(parseTypedHeader('joined:date')).toEqual({ name: 'joined', type: 'date' })
    expect(parseTypedHeader('active:boolean')).toEqual({ name: 'active', type: 'boolean' })
    expect(parseTypedHeader('title:string')).toEqual({ name: 'title', type: 'string' })
    expect(parseTypedHeader('tags:string[]')).toEqual({ name: 'tags', type: 'string[]' })
  })

  it('trims whitespace around name and type', () => {
    expect(parseTypedHeader('  age  :  number  ')).toEqual({ name: 'age', type: 'number' })
  })

  it('preserves colons inside the name when followed by an unknown type', () => {
    // Only recognised types count. Anything else is treated as part of the name.
    expect(parseTypedHeader('weird:thing')).toEqual({ name: 'weird:thing' })
  })

  it('handles empty header as empty name', () => {
    expect(parseTypedHeader('')).toEqual({ name: '' })
  })
})

describe('splitStringArray', () => {
  it('splits on unescaped pipes', () => {
    expect(splitStringArray('red|green|blue')).toEqual(['red', 'green', 'blue'])
  })

  it('returns empty array for empty input', () => {
    expect(splitStringArray('')).toEqual([])
  })

  it('returns single-element array for no-pipe input', () => {
    expect(splitStringArray('single')).toEqual(['single'])
  })

  it('treats escaped pipe as literal pipe character', () => {
    expect(splitStringArray('a\\|b|c')).toEqual(['a|b', 'c'])
  })

  it('handles multiple escaped pipes', () => {
    expect(splitStringArray('a\\|b\\|c')).toEqual(['a|b|c'])
  })

  it('preserves trailing empty element after unescaped pipe', () => {
    expect(splitStringArray('a|')).toEqual(['a', ''])
  })
})

describe('serializeStringArray', () => {
  it('joins with pipe separator', () => {
    expect(serializeStringArray(['red', 'green', 'blue'])).toBe('red|green|blue')
  })

  it('escapes pipes inside values', () => {
    expect(serializeStringArray(['a|b', 'c'])).toBe('a\\|b|c')
  })

  it('returns empty string for empty array', () => {
    expect(serializeStringArray([])).toBe('')
  })

  it('round-trips with splitStringArray', () => {
    const cases: string[][] = [
      ['red', 'green', 'blue'],
      ['a|b', 'c'],
      ['single'],
      [],
      ['x\\', 'y'],
    ]
    for (const arr of cases) {
      expect(splitStringArray(serializeStringArray(arr))).toEqual(arr)
    }
  })
})

describe('parseTypedCell', () => {
  it('returns undefined for empty cell', () => {
    expect(parseTypedCell('', 'number')).toBeUndefined()
    expect(parseTypedCell('', 'string')).toBeUndefined()
    expect(parseTypedCell('', 'boolean')).toBeUndefined()
    expect(parseTypedCell('', 'date')).toBeUndefined()
    expect(parseTypedCell('', 'string[]')).toBeUndefined()
  })

  it('coerces numbers', () => {
    expect(parseTypedCell('42', 'number')).toBe(42)
    expect(parseTypedCell('-3.14', 'number')).toBe(-3.14)
    expect(parseTypedCell('0', 'number')).toBe(0)
  })

  it('throws on invalid numbers', () => {
    expect(() => parseTypedCell('abc', 'number')).toThrow()
    expect(() => parseTypedCell('NaN', 'number')).toThrow()
  })

  it('coerces booleans in either case', () => {
    expect(parseTypedCell('true', 'boolean')).toBe(true)
    expect(parseTypedCell('TRUE', 'boolean')).toBe(true)
    expect(parseTypedCell('false', 'boolean')).toBe(false)
    expect(parseTypedCell('False', 'boolean')).toBe(false)
  })

  it('accepts 1/0 as boolean', () => {
    expect(parseTypedCell('1', 'boolean')).toBe(true)
    expect(parseTypedCell('0', 'boolean')).toBe(false)
  })

  it('throws on invalid booleans', () => {
    expect(() => parseTypedCell('yes', 'boolean')).toThrow()
    expect(() => parseTypedCell('2', 'boolean')).toThrow()
  })

  it('passes ISO date strings through unchanged', () => {
    expect(parseTypedCell('2021-03-15', 'date')).toBe('2021-03-15')
    expect(parseTypedCell('2021-03-15T12:00:00Z', 'date')).toBe('2021-03-15T12:00:00Z')
  })

  it('throws on non-ISO date strings', () => {
    expect(() => parseTypedCell('March 15 2021', 'date')).toThrow()
    expect(() => parseTypedCell('15/03/2021', 'date')).toThrow()
  })

  it('splits pipe-delimited string arrays', () => {
    expect(parseTypedCell('red|green|blue', 'string[]')).toEqual(['red', 'green', 'blue'])
  })

  it('passes strings through unchanged', () => {
    expect(parseTypedCell('hello world', 'string')).toBe('hello world')
  })
})

describe('inferColumnType', () => {
  it('infers number when all samples are numeric', () => {
    expect(inferColumnType(['1', '2', '3.14', '-0.5'])).toBe('number')
  })

  it('infers boolean when all samples are true/false', () => {
    expect(inferColumnType(['true', 'false', 'TRUE', 'False'])).toBe('boolean')
  })

  it('infers date when all samples match ISO 8601', () => {
    expect(inferColumnType(['2021-03-15', '2023-11-02', '2024-05-30'])).toBe('date')
  })

  it('falls back to string for mixed samples', () => {
    expect(inferColumnType(['alpha', 'beta', 'gamma'])).toBe('string')
    expect(inferColumnType(['alpha', '42', '2021-03-15'])).toBe('string')
  })

  it('skips empty samples during inference', () => {
    expect(inferColumnType(['1', '', '2', ''])).toBe('number')
  })

  it('returns number for all-empty (same default as typeDetection.resolveType)', () => {
    expect(inferColumnType([])).toBe('number')
    expect(inferColumnType(['', '', ''])).toBe('number')
  })

  it('infers string[] when every non-empty sample contains a pipe', () => {
    // Pipe-delimited columns are common enough in real CSVs that requiring a
    // :string[] hint every time was friction. A column where every non-empty
    // value has a pipe is treated as an array; :string is the escape hatch.
    expect(inferColumnType(['a|b', 'c|d'])).toBe('string[]')
  })

  it('falls back to string when only some samples contain pipes (ambiguous)', () => {
    expect(inferColumnType(['a|b', 'plain', 'c|d'])).toBe('string')
  })

  it('guards against leading-zero numeric strings (zip codes, phone numbers)', () => {
    // '0012' is a zip-code-shaped string; must NOT be inferred as number.
    expect(inferColumnType(['0012', '0234', '9999'])).toBe('string')
    // '0' alone is still a number.
    expect(inferColumnType(['0', '1', '2'])).toBe('number')
    // '0.5' (leading zero then dot) still a number.
    expect(inferColumnType(['0.5', '0.25', '1.1'])).toBe('number')
  })
})

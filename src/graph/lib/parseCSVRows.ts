/**
 * Parse a CSV or TSV document into rows of string cells, following RFC 4180.
 *
 * - Handles CRLF and LF line terminators.
 * - Respects double-quoted fields; `""` inside a quoted field decodes to a literal `"`.
 * - Quoted fields may contain the delimiter and newlines.
 * - Blank lines and lines whose first non-whitespace character is `#` are skipped
 *   (the latter is a convention for inline comments).
 *
 * @param text - The raw document.
 * @param delimiter - The field delimiter, typically `,` or `\t`.
 * @returns An array of rows; each row is an array of cell strings.
 */
export function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  const pushCell = (): void => {
    row.push(cell)
    cell = ''
  }

  const pushRow = (): void => {
    if (row.length === 0 && cell === '') return
    row.push(cell)
    cell = ''
    if (!(row.length === 1 && row[0] === '')) {
      const first = row[0].trimStart()
      if (!first.startsWith('#')) rows.push(row)
    }
    row = []
  }

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }

    if (ch === '"' && cell === '') {
      inQuotes = true
      i++
      continue
    }
    if (ch === delimiter) {
      pushCell()
      i++
      continue
    }
    if (ch === '\r') {
      pushRow()
      if (text[i + 1] === '\n') i += 2
      else i++
      continue
    }
    if (ch === '\n') {
      pushRow()
      i++
      continue
    }
    cell += ch
    i++
  }

  if (cell !== '' || row.length > 0) pushRow()

  return rows
}

/**
 * Detect the field delimiter of a CSV-like document by comparing tab vs. comma counts
 * on the first non-empty line.
 *
 * @param headerLine - The first line of the document.
 * @returns `'\t'` if tabs outnumber commas, otherwise `','`.
 */
export function detectDelimiter(headerLine: string): ',' | '\t' {
  const tabs = (headerLine.match(/\t/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

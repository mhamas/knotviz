/**
 * Stateful CSV/TSV row reader. Accepts chunks incrementally (via `write`) and
 * emits each complete row via the `onRow` callback as soon as it's terminated.
 * Call `end()` after the final chunk to flush a row that lacked a trailing newline.
 *
 * Follows RFC 4180: quoted fields may contain the delimiter and newlines;
 * `""` inside a quoted field decodes to a literal `"`. Handles CRLF, LF, and
 * CR-only line endings, including a CRLF split across two chunks. Strips a
 * leading UTF-8 BOM no matter which chunk it lands in first. Blank lines and
 * lines whose first non-whitespace character is `#` are skipped.
 *
 * All state is kept in a handful of fields; memory footprint is O(longest row).
 */
export class CSVRowStream {
  private readonly delimiter: string
  private readonly onRow: (row: string[]) => void
  private cell = ''
  private row: string[] = []
  private inQuotes = false
  /** True when the last character of the previous chunk was `\r` — if the next
   *  chunk starts with `\n`, treat them together as one CRLF terminator. */
  private pendingCrNewline = false
  /** True until the first non-empty chunk has been consumed and the BOM check
   *  (if any) has run. */
  private beforeFirstChar = true

  constructor(delimiter: string, onRow: (row: string[]) => void) {
    this.delimiter = delimiter
    this.onRow = onRow
  }

  write(chunk: string): void {
    if (chunk.length === 0) return

    let start = 0
    if (this.beforeFirstChar) {
      if (chunk.charCodeAt(0) === 0xfeff) start = 1
      this.beforeFirstChar = false
    }

    for (let i = start; i < chunk.length; i++) {
      const ch = chunk[i]

      if (this.pendingCrNewline) {
        this.pendingCrNewline = false
        if (ch === '\n') continue
      }

      if (this.inQuotes) {
        if (ch === '"') {
          if (chunk[i + 1] === '"') {
            this.cell += '"'
            i++
            continue
          }
          this.inQuotes = false
          continue
        }
        this.cell += ch
        continue
      }

      if (ch === '"' && this.cell === '') {
        this.inQuotes = true
        continue
      }
      if (ch === this.delimiter) {
        this.row.push(this.cell)
        this.cell = ''
        continue
      }
      if (ch === '\r') {
        this.finishRow()
        this.pendingCrNewline = true
        continue
      }
      if (ch === '\n') {
        this.finishRow()
        continue
      }
      this.cell += ch
    }
  }

  end(): void {
    if (this.cell !== '' || this.row.length > 0) {
      this.finishRow()
    }
  }

  private finishRow(): void {
    this.row.push(this.cell)
    this.cell = ''
    // Drop fully blank rows (nothing but an empty cell) and comment rows.
    if (!(this.row.length === 1 && this.row[0] === '')) {
      const first = this.row[0].trimStart()
      if (!first.startsWith('#')) this.onRow(this.row)
    }
    this.row = []
  }
}

/**
 * Parse an entire CSV/TSV document into rows in one shot. Thin wrapper around
 * `CSVRowStream` for callers that already have the full text in memory.
 *
 * @param text - The raw document.
 * @param delimiter - The field delimiter, typically `,` or `\t`.
 * @returns An array of rows; each row is an array of cell strings.
 */
export function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  const stream = new CSVRowStream(delimiter, (row) => {
    rows.push(row)
  })
  stream.write(text)
  stream.end()
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

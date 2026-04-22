/**
 * Escape a single CSV cell per RFC 4180: if the value contains a comma, a
 * double-quote, or a newline, wrap it in double quotes and double any
 * embedded double-quote. Otherwise emit as-is.
 *
 * Accepts pre-serialised strings only — the caller is responsible for
 * converting numbers, booleans, and dates to text.
 *
 * @example
 * csvCell('Alice')          // 'Alice'
 * csvCell('Smith, Jane')    // '"Smith, Jane"'
 * csvCell('5"10')           // '"5""10"'
 * csvCell('line1\nline2')   // '"line1\nline2"'
 */
export function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/**
 * Join a row of already-escaped cells with commas + CRLF (per RFC 4180,
 * though LF alone is equally common). Use `\r\n` to keep Excel happy.
 */
export function csvRow(cells: string[]): string {
  return cells.join(',') + '\r\n'
}

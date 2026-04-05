/**
 * Parses raw file text into a JavaScript object.
 *
 * @param text - Raw JSON string to parse.
 * @returns Parsed JavaScript value.
 * @throws {Error} "Invalid JSON file" on parse failure.
 * @example
 * const raw = parseJSON('{"version":"1","nodes":[],"edges":[]}')
 */
export function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file')
  }
}

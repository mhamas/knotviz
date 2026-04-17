/**
 * Substring-match a pre-lowered query against a pre-lowered haystack per node.
 * Writes 1 into `out[i]` if the haystack contains the query, else 0. Returns
 * the total number of matches.
 *
 * Callers must pre-lowercase `query` and all entries of `haystacks` once on
 * graph load; this keeps per-keystroke cost to a single `.includes()` per node.
 * Empty query is the caller's responsibility — for an empty query every entry
 * trivially matches (JS `"x".includes("")` is true), so guard upstream.
 *
 * @param query - Lowercased search query.
 * @param haystacks - Per-node lowercased haystack (e.g. `"label id"`).
 * @param nodeCount - Length of the output bitmask to write.
 * @param out - Uint8Array of length ≥ nodeCount; overwritten in place.
 * @returns Number of matching entries (0..nodeCount).
 * @example
 *   const out = new Uint8Array(2)
 *   matchQuery('foo', ['foobar', 'baz'], 2, out) // out=[1,0], returns 1
 */
export function matchQuery(
  query: string,
  haystacks: string[],
  nodeCount: number,
  out: Uint8Array,
): number {
  let count = 0
  for (let i = 0; i < nodeCount; i++) {
    const h = haystacks[i]
    const isMatch = h !== undefined && h.includes(query)
    out[i] = isMatch ? 1 : 0
    if (isMatch) count++
  }
  return count
}

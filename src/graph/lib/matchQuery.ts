/**
 * Substring-match a pre-lowered query against a pre-lowered haystack per node.
 * Writes 1 into `out[i]` for each match and leaves non-matches untouched;
 * `out` must be zero-initialized by the caller (freshly allocated is fine).
 * Returns the total number of matches.
 *
 * Callers must pre-lowercase `query` and all entries of `haystacks` once on
 * graph load; this keeps per-keystroke cost to a single `.includes()` per node.
 * Empty query is the caller's responsibility — for an empty query every entry
 * trivially matches (JS `"x".includes("")` is true), so guard upstream.
 *
 * @param query - Lowercased search query.
 * @param haystacks - Per-node lowercased haystack (e.g. `"label id"`).
 * @param nodeCount - Length of the output bitmask to write.
 * @param out - Zero-initialized Uint8Array of length ≥ nodeCount; matches written in place.
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
    if (h !== undefined && h.includes(query)) {
      out[i] = 1
      count++
    }
  }
  return count
}

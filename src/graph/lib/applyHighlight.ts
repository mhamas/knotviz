/**
 * Pure helpers for the "highlighted subset" appearance mode.
 * Dims non-highlighted filter-visible nodes and recomputes link colors
 * under the OR-endpoint rule used when a highlight subset is active.
 */

/**
 * Multiply the alpha channel of every filter-visible, non-highlighted node by
 * `dimAlpha`. Filter-hidden nodes (visible[i]=0) are left as-is — they stay at
 * whatever alpha the earlier pipeline produced (typically 0).
 *
 * @param pointColors - Float32Array of RGBA per node (length ≥ nodeCount*4). Modified in place.
 * @param visible - Filter-visibility bitmask.
 * @param highlighted - Highlight bitmask (same length as visible).
 * @param nodeCount - Number of nodes to iterate.
 * @param dimAlpha - Alpha multiplier for non-highlighted visible nodes (e.g. 0.1).
 */
export function applyDimming(
  pointColors: Float32Array,
  visible: Uint8Array,
  highlighted: Uint8Array,
  nodeCount: number,
  dimAlpha: number,
): void {
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    if (highlighted[i]) continue
    pointColors[i * 4 + 3] *= dimAlpha
  }
}

/**
 * Write per-link RGBA into `out` based on filter visibility and an optional
 * highlight bitmask.
 *
 * Rules:
 * - Both endpoints filter-visible AND highlight inactive → edge color.
 * - Both endpoints filter-visible AND highlight active AND at least one endpoint highlighted → edge color.
 * - Otherwise → untouched (caller should pre-zero `out`).
 *
 * @param out - Pre-allocated Float32Array of length ≥ linkCount*4. Not cleared by this function.
 * @param linkIndices - Float32Array [src0,tgt0,src1,tgt1,...] (same format as Cosmos links).
 * @param visible - Filter-visibility bitmask per node.
 * @param highlighted - Highlight bitmask per node, or `null` to disable the OR-endpoint rule.
 * @param linkCount - Number of links.
 * @param edgeRgba - Normalized RGBA for visible edges.
 */
export function computeLinkColors(
  out: Float32Array,
  linkIndices: Float32Array,
  visible: Uint8Array,
  highlighted: Uint8Array | null,
  linkCount: number,
  edgeRgba: [number, number, number, number],
): void {
  const [r, g, b, a] = edgeRgba
  for (let i = 0; i < linkCount; i++) {
    const src = linkIndices[i * 2]
    const tgt = linkIndices[i * 2 + 1]
    if (!visible[src] || !visible[tgt]) continue
    if (highlighted && !highlighted[src] && !highlighted[tgt]) continue
    const off = i * 4
    out[off] = r
    out[off + 1] = g
    out[off + 2] = b
    out[off + 3] = a
  }
}

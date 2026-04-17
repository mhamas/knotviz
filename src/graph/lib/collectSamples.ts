/**
 * Collect the first `maxCount` nodes whose bitmask bit is set, returning
 * their `{ id, label }` shape. Labels default to `""` when undefined. Used
 * by the appearance worker to surface a small dropdown sample of highlighted
 * nodes back to the UI without shipping the full label array each update.
 *
 * @param bitmask - Uint8Array where bit i == 1 means node i is selected.
 * @param labels - Parallel array of per-node labels (optional per node).
 * @param ids - Parallel array of per-node ids.
 * @param nodeCount - Upper bound on indices to visit.
 * @param maxCount - Maximum number of samples to return.
 * @returns Up to `maxCount` samples in ascending node-index order.
 */
export function collectSamples(
  bitmask: Uint8Array,
  labels: (string | undefined)[],
  ids: string[],
  nodeCount: number,
  maxCount: number,
): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = []
  if (maxCount <= 0) return out
  for (let i = 0; i < nodeCount; i++) {
    if (!bitmask[i]) continue
    out.push({ id: ids[i], label: labels[i] ?? '' })
    if (out.length >= maxCount) break
  }
  return out
}

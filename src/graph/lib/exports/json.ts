import type { ExportResult, ExportSnapshot } from './types'

/**
 * Serialise an export snapshot as Knotviz JSON (the native, lossless format).
 *
 * The output is byte-compatible with what a user could drop back in — every
 * field name and shape matches `src/graph/lib/graphSchema.json`. Empty
 * property objects and undefined optional fields are omitted so files stay
 * compact.
 *
 * Edge `label` is deliberately NOT emitted — Knotviz doesn't render edge
 * labels anywhere in the UI, and the docs are explicit that edges only
 * carry `weight`. Parsers still read the field from existing files; the
 * export stops propagating it.
 *
 * @param snapshot - The format-agnostic export snapshot built from the
 *   current cosmos state + filter set.
 * @returns A Blob containing compact (no-whitespace) JSON + the `.json`
 *   extension for the download filename.
 */
export function exportAsJson(snapshot: ExportSnapshot): ExportResult {
  const nodes = snapshot.nodes.map((n) => {
    const out: Record<string, unknown> = {
      id: n.id,
      x: n.x,
      y: n.y,
    }
    if (n.label !== undefined) out.label = n.label
    if (Object.keys(n.properties).length > 0) out.properties = n.properties
    return out
  })

  const edges = snapshot.edges.map((e) => {
    const out: Record<string, unknown> = {
      source: e.source,
      target: e.target,
    }
    if (e.weight !== undefined) out.weight = e.weight
    return out
  })

  const payload = { version: '1', nodes, edges }
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  return {
    blob,
    extension: 'json',
    description: 'Native Knotviz JSON — lossless round-trip.',
  }
}

import { serializeStringArray } from '../formats'
import type { PropertyMeta, PropertyType } from '../../types'
import type { ExportNode, ExportResult, ExportSnapshot } from './types'

/**
 * Serialise as GraphML — a single `.graphml` XML document.
 *
 * Follows the W3C-ish schema Knotviz's own parser reads:
 * - `<key>` declarations for every node property + structural label/x/y
 *   and one edge key for weight when any edge carries one.
 * - `<node>` / `<edge>` elements with per-property `<data>` values.
 *
 * **Lossy.** GraphML has no list type, so `string[]` properties are
 * pipe-encoded into a `string` column. The download dialog warns before
 * the user commits.
 *
 * Dates are stored as ISO-8601 strings in `attr.type="string"` columns —
 * the convention Knotviz's own parser expects, and re-import promotes
 * them back to `date` via post-parse inference.
 *
 * @param snapshot - The format-agnostic export snapshot.
 * @returns A Blob containing the complete GraphML document.
 */
export function exportAsGraphML(snapshot: ExportSnapshot): ExportResult {
  const hasLabel = snapshot.nodes.some((n) => n.label !== undefined)
  const hasPosition = snapshot.nodes.some((n) => n.x !== 0 || n.y !== 0)
  const hasAnyWeight = snapshot.edges.some((e) => e.weight !== undefined)

  // GraphML <key> `id` attributes must be valid XML NCNames (no spaces, no
  // `:` prefix, no leading digit). The user's property keys could be
  // anything — `first name`, `user:id`, `42things` — so we assign
  // sequential p0/p1/p2 ids and carry the human-friendly key only in the
  // attr.name attribute (which GraphML parsers accept as an arbitrary
  // string). Nodes below reference these ids by the same index.
  const propertyKeyIds = snapshot.propertyMetas.map((_, i) => `p${i}`)

  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8"?>\n')
  parts.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n')

  // Structural keys
  if (hasLabel) {
    parts.push('  <key id="label" for="node" attr.name="label" attr.type="string"/>\n')
  }
  if (hasPosition) {
    parts.push('  <key id="x" for="node" attr.name="x" attr.type="double"/>\n')
    parts.push('  <key id="y" for="node" attr.name="y" attr.type="double"/>\n')
  }
  // One key per declared property. GraphML has no list type — string[] is
  // declared as string and values are pipe-encoded.
  snapshot.propertyMetas.forEach((meta, i) => {
    const attrType = graphmlAttrType(meta.type)
    parts.push(
      `  <key id="${propertyKeyIds[i]}" for="node" attr.name="${xmlAttr(meta.key)}" attr.type="${attrType}"/>\n`,
    )
  })
  if (hasAnyWeight) {
    parts.push('  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>\n')
  }

  parts.push('  <graph edgedefault="directed">\n')

  for (const node of snapshot.nodes) {
    parts.push(`    <node id="${xmlAttr(node.id)}">\n`)
    if (hasLabel && node.label !== undefined) {
      parts.push(`      <data key="label">${xmlText(node.label)}</data>\n`)
    }
    if (hasPosition) {
      parts.push(`      <data key="x">${node.x}</data>\n`)
      parts.push(`      <data key="y">${node.y}</data>\n`)
    }
    snapshot.propertyMetas.forEach((meta, i) => {
      const raw = formatValue(node, meta)
      if (raw === null) return
      parts.push(`      <data key="${propertyKeyIds[i]}">${xmlText(raw)}</data>\n`)
    })
    parts.push('    </node>\n')
  }

  for (const e of snapshot.edges) {
    if (e.weight !== undefined) {
      parts.push(
        `    <edge source="${xmlAttr(e.source)}" target="${xmlAttr(e.target)}"><data key="weight">${e.weight}</data></edge>\n`,
      )
    } else {
      parts.push(`    <edge source="${xmlAttr(e.source)}" target="${xmlAttr(e.target)}"/>\n`)
    }
  }

  parts.push('  </graph>\n')
  parts.push('</graphml>\n')

  const blob = new Blob([parts.join('')], { type: 'application/xml;charset=utf-8' })
  return {
    blob,
    extension: 'graphml',
    description: 'W3C-ish XML. Arrays flatten to pipe-delimited strings.',
  }
}

function graphmlAttrType(type: PropertyType): string {
  switch (type) {
    case 'number':
      return 'double'
    case 'boolean':
      return 'boolean'
    case 'date':
    case 'string':
    case 'string[]':
    default:
      return 'string'
  }
}

/**
 * Produce the text content of a `<data>` element. Returns `null` when the
 * node doesn't carry the property (skip emitting the element entirely).
 */
function formatValue(node: ExportNode, meta: PropertyMeta): string | null {
  const v = node.properties[meta.key]
  if (v === undefined || v === null) return null
  switch (meta.type) {
    case 'string[]':
      return serializeStringArray(Array.isArray(v) ? v : [String(v)])
    case 'boolean':
      return v === true ? 'true' : 'false'
    default:
      return String(v)
  }
}

/** Escape for inside XML attribute values (wrapped in double quotes). */
function xmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Escape for XML text content (between tags). */
function xmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

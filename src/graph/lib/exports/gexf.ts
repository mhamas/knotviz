import { serializeStringArray } from '../formats'
import type { PropertyMeta, PropertyType } from '../../types'
import type { ExportNode, ExportResult, ExportSnapshot } from './types'

/**
 * Serialise as GEXF 1.3 — a single `.gexf` XML document.
 *
 * Follows the GEXF 1.3 spec plus the widely-used `viz:position` extension
 * for node x/y. Unlike GraphML, GEXF has a native `liststring` type, so
 * `string[]` properties round-trip losslessly.
 *
 * Dates are stored as ISO-8601 strings in `type="string"` attributes —
 * Knotviz's own parser re-infers them back to `date` on load.
 *
 * @param snapshot - The format-agnostic export snapshot.
 * @returns A Blob containing the complete GEXF document.
 */
export function exportAsGexf(snapshot: ExportSnapshot): ExportResult {
  const hasPosition = snapshot.nodes.some((n) => n.x !== 0 || n.y !== 0)

  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8"?>\n')
  parts.push(
    '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">\n',
  )
  parts.push('  <graph mode="static" defaultedgetype="directed">\n')

  // Attribute declarations — one per declared property. Node labels and
  // positions use GEXF's native mechanisms (element attribute + <viz:position>)
  // so they don't need declarations.
  if (snapshot.propertyMetas.length > 0) {
    parts.push('    <attributes class="node">\n')
    snapshot.propertyMetas.forEach((meta, i) => {
      const type = gexfAttrType(meta.type)
      parts.push(
        `      <attribute id="${i}" title="${xmlAttr(meta.key)}" type="${type}"/>\n`,
      )
    })
    parts.push('    </attributes>\n')
  }

  parts.push('    <nodes>\n')
  for (const node of snapshot.nodes) {
    const labelAttr = node.label !== undefined ? ` label="${xmlAttr(node.label)}"` : ''
    parts.push(`      <node id="${xmlAttr(node.id)}"${labelAttr}>\n`)

    if (hasPosition) {
      parts.push(`        <viz:position x="${node.x}" y="${node.y}"/>\n`)
    }

    const attvalues: string[] = []
    snapshot.propertyMetas.forEach((meta, i) => {
      const raw = formatValue(node, meta)
      if (raw === null) return
      attvalues.push(`          <attvalue for="${i}" value="${xmlAttr(raw)}"/>\n`)
    })
    if (attvalues.length > 0) {
      parts.push('        <attvalues>\n')
      parts.push(...attvalues)
      parts.push('        </attvalues>\n')
    }
    parts.push('      </node>\n')
  }
  parts.push('    </nodes>\n')

  parts.push('    <edges>\n')
  snapshot.edges.forEach((e, i) => {
    const w = e.weight !== undefined ? ` weight="${e.weight}"` : ''
    parts.push(
      `      <edge id="${i}" source="${xmlAttr(e.source)}" target="${xmlAttr(e.target)}"${w}/>\n`,
    )
  })
  parts.push('    </edges>\n')

  parts.push('  </graph>\n')
  parts.push('</gexf>\n')

  const blob = new Blob([parts.join('')], { type: 'application/xml;charset=utf-8' })
  return {
    blob,
    extension: 'gexf',
    description: 'GEXF 1.3 — preserves arrays and positions.',
  }
}

function gexfAttrType(type: PropertyType): string {
  switch (type) {
    case 'number':
      return 'double'
    case 'boolean':
      return 'boolean'
    case 'string[]':
      return 'liststring'
    case 'date':
    case 'string':
    default:
      return 'string'
  }
}

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

function xmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

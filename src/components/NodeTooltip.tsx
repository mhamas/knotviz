import { useEffect, useRef, useState, useCallback } from 'react'
import type { GraphData, PropertyMeta, PropertyValue } from '../types'

interface Props {
  nodeId: string
  screenPosition: { x: number; y: number }
  graphData: GraphData
  propertyMetas: PropertyMeta[]
  canvasBounds: DOMRect
  onClose: () => void
}

const TOOLTIP_WIDTH = 260
const TOOLTIP_MARGIN = 12

/**
 * Formats a property value for display based on its detected type.
 *
 * @param value - The raw property value.
 * @param type - The detected property type.
 * @returns Formatted string(s).
 */
function formatValue(value: PropertyValue, type: string): string {
  if (type === 'number' && typeof value === 'number') {
    return value.toFixed(2)
  }
  if (type === 'date' && typeof value === 'string') {
    const date = new Date(value)
    if (isNaN(date.getTime())) return value
    const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000)
    return `${value} · ${daysAgo.toLocaleString()} days ago`
  }
  return String(value)
}

/**
 * Floating tooltip anchored to a node's viewport position.
 * Shows node label, id, and all properties formatted by type.
 * Flips position to stay within canvas bounds.
 *
 * @param props - Node data, position, and close callback.
 * @returns Tooltip dialog element.
 */
export function NodeTooltip({
  nodeId,
  screenPosition,
  graphData,
  propertyMetas,
  canvasBounds,
  onClose,
}: Props): React.JSX.Element {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipHeight, setTooltipHeight] = useState(200)

  // Measure tooltip height after initial render
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  }, [nodeId])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent): void => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return (): void => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  // Auto-focus tooltip on open
  useEffect(() => {
    tooltipRef.current?.focus()
  }, [])

  const node = graphData.nodes.find((n) => n.id === nodeId)
  if (!node) return <></>

  const label = node.label ?? node.id
  const properties = node.properties ?? {}

  // Sort properties alphabetically
  const sortedMetas = [...propertyMetas].sort((a, b) => a.key.localeCompare(b.key))

  // Flip logic
  const isFlipRight = screenPosition.x + TOOLTIP_WIDTH + TOOLTIP_MARGIN > canvasBounds.width
  const isFlipUp = screenPosition.y + tooltipHeight + TOOLTIP_MARGIN > canvasBounds.height

  const style: React.CSSProperties = {
    position: 'absolute',
    left: isFlipRight
      ? screenPosition.x - TOOLTIP_WIDTH - TOOLTIP_MARGIN
      : screenPosition.x + TOOLTIP_MARGIN,
    top: isFlipUp
      ? screenPosition.y - tooltipHeight - TOOLTIP_MARGIN
      : screenPosition.y + TOOLTIP_MARGIN,
    width: TOOLTIP_WIDTH,
  }

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-label="Node details"
      aria-modal="false"
      data-testid="node-tooltip"
      tabIndex={-1}
      className="z-30 rounded-lg border border-slate-200 bg-white p-3 shadow-lg outline-none"
      style={style}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{label}</h3>
          {node.label && (
            <p className="truncate text-[11px] text-slate-400">id: {node.id}</p>
          )}
        </div>
        <button
          aria-label="Close"
          className="shrink-0 cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* Properties */}
      {sortedMetas.length > 0 ? (
        <div className="space-y-1.5">
          {sortedMetas.map((meta) => {
            const value = properties[meta.key]
            if (value === undefined || value === null) return null
            return (
              <div key={meta.key} className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500">{meta.key}</span>
                <span className="truncate text-right text-xs text-slate-800">
                  {formatValue(value, meta.type)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No properties</p>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
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
const PROP_NAME_MAX = 20

/**
 * Formats a property value for display based on its detected type.
 *
 * @param value - The raw property value.
 * @param type - The detected property type.
 * @returns Formatted string.
 */
function formatValue(value: PropertyValue, type: string): string {
  if (type === 'number' && typeof value === 'number') {
    return value.toFixed(2)
  }
  if (type === 'date' && typeof value === 'string') {
    return value
  }
  return String(value)
}

/**
 * Floating tooltip anchored to a node's viewport position.
 * Shows node id (with copy button), and all properties formatted by type.
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
  const [isCopied, setIsCopied] = useState(false)

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

  const handleCopyId = (): void => {
    navigator.clipboard.writeText(node.id).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    })
  }

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-label="Node details"
      aria-modal="false"
      data-testid="node-tooltip"
      tabIndex={-1}
      className="relative z-30 rounded-lg border border-slate-200 bg-white p-3 shadow-lg outline-none"
      style={style}
    >
      {/* Close button — top right corner */}
      <button
        aria-label="Close"
        className="absolute right-1.5 top-1.5 cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        onClick={onClose}
      >
        ×
      </button>

      {/* Header: label + inline copy */}
      <div className="mb-2 pr-5">
        <h3 className="inline break-words text-sm font-semibold text-slate-900">{label}</h3>
        <button
          aria-label="Copy node ID"
          title="Copy node ID"
          className="ml-1 inline-flex translate-y-[1px] cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={handleCopyId}
        >
          {isCopied ? (
            <span className="flex items-center gap-0.5 text-[10px] text-green-600">
              <Check className="h-3 w-3" />
              Copied
            </span>
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Properties */}
      {sortedMetas.length > 0 ? (
        <div className="space-y-1.5">
          {sortedMetas.map((meta) => {
            const value = properties[meta.key]
            if (value === undefined || value === null) return null
            const isTruncated = meta.key.length > PROP_NAME_MAX
            const displayKey = isTruncated
              ? meta.key.slice(0, PROP_NAME_MAX) + '…'
              : meta.key
            return (
              <div key={meta.key} className="flex items-baseline justify-between gap-2">
                <span
                  className="shrink-0 text-[11px] font-medium text-slate-500"
                  title={isTruncated ? meta.key : undefined}
                >
                  {displayKey}
                </span>
                <span className="break-words text-right text-xs text-slate-800">
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

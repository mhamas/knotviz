import { useEffect, useRef, useState, useCallback } from 'react'
import { Copy, Check, X } from 'lucide-react'
import type { NodePropertiesMetadata, PropertyMeta, PropertyValue } from '../types'
import { HelpPopover } from '@/components/sidebar'
import type { PropertyColumns } from '../hooks/useFilterState'
import { formatNumber } from '../lib/formatNumber'

interface Props {
  nodeId: string
  screenPosition: { x: number; y: number }
  nodeIndexMap: Map<string, number>
  nodeLabels: (string | undefined)[]
  propertyColumns: PropertyColumns
  propertyMetas: PropertyMeta[]
  nodePropertiesMetadata: NodePropertiesMetadata | undefined
  canvasBounds: DOMRect
  analysisPropertyKey: string | null
  onClose: () => void
}

const TOOLTIP_WIDTH = 310
const TOOLTIP_MARGIN = 12
const PROP_NAME_MAX = 36

/**
 * Formats a property value for display based on its detected type.
 *
 * @param value - The raw property value.
 * @param propertyType - The detected property type.
 * @returns Formatted string.
 */
function formatValue(value: PropertyValue, propertyType: string): string {
  if (propertyType === 'number' && typeof value === 'number') {
    return formatNumber(value)
  }
  if (propertyType === 'date' && typeof value === 'string') {
    return value
  }
  if (propertyType === 'string[]' && Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

/**
 * Floating tooltip anchored to a node's viewport position.
 * Shows node id (with copy button), and all properties formatted by type.
 * Reads property values from columnar arrays for O(1) lookup.
 * Flips and clamps position to stay within canvas bounds.
 *
 * @param props - Node data, position, and close callback.
 * @returns Tooltip dialog element.
 */
export function NodeTooltip({
  nodeId,
  screenPosition,
  nodeIndexMap,
  nodeLabels,
  propertyColumns,
  propertyMetas,
  nodePropertiesMetadata,
  canvasBounds,
  analysisPropertyKey,
  onClose,
}: Props): React.JSX.Element {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipHeight, setTooltipHeight] = useState(200)
  const [isCopied, setIsCopied] = useState(false)
  const [isLabelCopied, setIsLabelCopied] = useState(false)

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

  // Delay listener registration so the same click that opened the tooltip
  // doesn't immediately close it (mousedown bubbles to document).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
    })
    return (): void => {
      cancelAnimationFrame(id)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleClickOutside])

  // Auto-focus tooltip on open
  useEffect(() => {
    tooltipRef.current?.focus()
  }, [])

  const nodeIndex = nodeIndexMap.get(nodeId)
  if (nodeIndex === undefined) return <></>

  const label = nodeLabels[nodeIndex] ?? nodeId

  // Sort properties alphabetically
  const sortedMetas = [...propertyMetas].sort((a, b) => a.key.localeCompare(b.key))

  // Position with flip + clamp to stay fully within canvas bounds
  const pad = TOOLTIP_MARGIN
  let left = screenPosition.x + pad
  let top = screenPosition.y + pad

  if (left + TOOLTIP_WIDTH > canvasBounds.width) {
    left = screenPosition.x - TOOLTIP_WIDTH - pad
  }
  if (top + tooltipHeight > canvasBounds.height) {
    top = screenPosition.y - tooltipHeight - pad
  }
  left = Math.max(pad, Math.min(left, canvasBounds.width - TOOLTIP_WIDTH - pad))
  top = Math.max(pad, Math.min(top, canvasBounds.height - tooltipHeight - pad))

  const style: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: TOOLTIP_WIDTH,
  }

  const handleCopyId = (): void => {
    navigator.clipboard.writeText(nodeId).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    }).catch(() => {
      // Clipboard API may fail in insecure contexts — fail silently
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
        className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header: label + ID with copy */}
      <div className="mb-2 pr-5">
        <div className="flex items-center gap-1">
          <h3 className="break-words text-sm font-semibold text-slate-900">{label}</h3>
          <button
            aria-label="Copy label"
            title="Copy label"
            className="inline-flex shrink-0 cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={(): void => {
              navigator.clipboard.writeText(label).then(() => {
                setIsLabelCopied(true)
                setTimeout(() => setIsLabelCopied(false), 1500)
              }).catch(() => {})
            }}
          >
            {isLabelCopied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="break-all text-[11px] text-slate-400" data-testid="node-tooltip-id">{nodeId}</span>
          <button
            aria-label="Copy node ID"
            title="Copy node ID"
            className="inline-flex shrink-0 cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={handleCopyId}
          >
            {isCopied ? (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                <Check className="h-3 w-3" />
                Copied
              </span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Properties — read from columnar arrays by index */}
      {sortedMetas.length > 0 ? (
        <div className="space-y-1.5">
          {sortedMetas.map((meta) => {
            const value = propertyColumns[meta.key]?.[nodeIndex] as PropertyValue | undefined
            if (value === undefined || value === null) return null
            const isTruncated = meta.key.length > PROP_NAME_MAX
            const displayKey = isTruncated
              ? meta.key.slice(0, PROP_NAME_MAX) + '…'
              : meta.key
            const desc = nodePropertiesMetadata?.[meta.key]?.description
            const isAnalysisProperty = meta.key === analysisPropertyKey
            return (
              <div key={meta.key} className="flex items-baseline justify-between gap-2">
                <span className="flex shrink-0 items-center gap-1">
                  <span
                    className={`text-[11px] ${isAnalysisProperty ? 'font-bold text-slate-700' : 'font-medium text-slate-500'}`}
                    title={isTruncated ? meta.key : undefined}
                  >
                    {displayKey}
                  </span>
                  {desc && <HelpPopover>{desc}</HelpPopover>}
                </span>
                <span className={`break-words text-right text-xs ${isAnalysisProperty ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
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

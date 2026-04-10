import { PanelRightClose } from 'lucide-react'
import type { NodePropertiesMetadata, PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { SectionHeading } from '@/components/sidebar'
import { FiltersTab } from './FiltersTab'

interface Props {
  propertyMetas: PropertyMeta[]
  nodePropertiesMetadata: NodePropertiesMetadata | undefined
  filterHandle: FilterStateHandle
  matchingCount: number
  nodeCount: number
  onClose: () => void
}

/**
 * Right sidebar panel for Filters.
 *
 * @param props - Property metadata, filter state, match counts, and close callback.
 * @returns Filters sidebar element.
 */
export function FiltersSidebar({
  propertyMetas,
  nodePropertiesMetadata,
  filterHandle,
  matchingCount,
  nodeCount,
  onClose,
}: Props): React.JSX.Element {
  const hasProperties = propertyMetas.length > 0

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <SectionHeading help="Enable filters to show only nodes matching certain property values. Multiple filters combine with AND logic — a node must pass all enabled filters to be visible.">
            Filters
          </SectionHeading>
          <button
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close Filters panel"
            title="Collapse filters"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>
        {!hasProperties ? (
          <p className="text-xs italic text-slate-400">This graph has no node properties to filter by.</p>
        ) : (
          <FiltersTab
            propertyMetas={propertyMetas}
            nodePropertiesMetadata={nodePropertiesMetadata}
            filterHandle={filterHandle}
            matchingCount={matchingCount}
            totalNodeCount={nodeCount}
          />
        )}
      </div>
    </div>
  )
}

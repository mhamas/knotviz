import type { CosmosGraphData, ColorGradientState, PropertyMeta } from '../types'
import type { FilterStateHandle, PropertyColumns } from '../hooks/useFilterState'
import { CollapsibleSection } from '@/components/sidebar'
import { ColorTab } from './ColorTab'
import { FiltersTab } from './FiltersTab'

interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle | null
  gradientState: ColorGradientState | null
  onGradientChange: (s: ColorGradientState) => void
  cosmosData: CosmosGraphData | null
  matchingCount: number
  nodeCount: number
  propertyColumns: PropertyColumns
}

/**
 * Right sidebar with collapsible Color and Filters sections.
 * Shows empty states when no graph is loaded or graph has no properties.
 *
 * @param props - Property metadata, filter state, and color gradient props.
 * @returns Right sidebar element.
 */
export function RightSidebar({
  propertyMetas,
  filterHandle,
  gradientState,
  onGradientChange,
  matchingCount,
  nodeCount,
  propertyColumns,
}: Props): React.JSX.Element {
  const hasProperties = propertyMetas.length > 0
  const isLoaded = filterHandle !== null && gradientState !== null

  return (
    <div
      className="flex h-screen w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white"
      data-testid="right-sidebar"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <CollapsibleSection
          label="Colors"
          help="Map a node property to a color palette. Nodes are colored by their property values — continuously for numbers/dates, or with distinct colors for strings/booleans."
        >
          {!isLoaded ? (
            <p className="text-xs italic text-slate-400">Load a graph to use color mapping.</p>
          ) : !hasProperties ? (
            <p className="text-xs italic text-slate-400">This graph has no node properties to color by.</p>
          ) : (
            <ColorTab
              propertyMetas={propertyMetas}
              state={gradientState}
              propertyColumns={propertyColumns}
              filters={filterHandle.filters}
              onChange={onGradientChange}
            />
          )}
        </CollapsibleSection>

        <div className="my-3 border-t border-slate-200" />

        <CollapsibleSection
          label="Filters"
          help="Enable filters to show only nodes matching certain property values. Multiple filters combine with AND logic — a node must pass all enabled filters to be visible."
        >
          {!isLoaded || !filterHandle ? (
            <p className="text-xs italic text-slate-400">Load a graph to use filters.</p>
          ) : !hasProperties ? (
            <p className="text-xs italic text-slate-400">This graph has no node properties to filter by.</p>
          ) : (
            <FiltersTab
              propertyMetas={propertyMetas}
              filterHandle={filterHandle}
              matchingCount={matchingCount}
              totalNodeCount={nodeCount}
            />
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}

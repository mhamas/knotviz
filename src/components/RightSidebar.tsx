import type Graph from 'graphology'
import type { ColorGradientState, PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FiltersTab } from './FiltersTab'
import { ColorTab } from './ColorTab'

interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle
  gradientState: ColorGradientState
  onGradientChange: (s: ColorGradientState) => void
  isGradientActive: boolean
  graph: Graph | null
  matchingNodeIds: Set<string>
}

/**
 * Right sidebar with tabbed panels: Filters, Stats, Color.
 * Shows a blue indicator dot on Color tab when a gradient is active.
 *
 * @param props - Property metadata, filter state, and color gradient props.
 * @returns Right sidebar element.
 */
export function RightSidebar({
  propertyMetas,
  filterHandle,
  gradientState,
  onGradientChange,
  isGradientActive,
  graph,
  matchingNodeIds,
}: Props): React.JSX.Element {
  return (
    <div className="flex h-screen w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white" data-testid="right-sidebar">
      <Tabs defaultValue="filters" className="flex h-full flex-col">
        <TabsList className="shrink-0 px-2 pt-2">
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="color">
            <span className="flex items-center gap-1.5">
              Color
              {isGradientActive && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500"
                  data-testid="color-active-dot"
                />
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="min-h-0 flex-1 overflow-hidden">
          <FiltersTab propertyMetas={propertyMetas} filterHandle={filterHandle} />
        </TabsContent>

        <TabsContent value="stats" className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="text-xs italic text-slate-400">Stats — coming soon.</p>
        </TabsContent>

        <TabsContent value="color" className="min-h-0 flex-1 overflow-y-auto">
          <ColorTab
            propertyMetas={propertyMetas}
            state={gradientState}
            graph={graph}
            matchingNodeIds={matchingNodeIds}
            onChange={onGradientChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

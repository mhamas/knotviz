import type { PropertyMeta } from '../types'
import type { FilterStateHandle } from '../hooks/useFilterState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FiltersTab } from './FiltersTab'

interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle
}

/**
 * Right sidebar with tabbed panels: Filters, Stats, Color.
 * Stats and Color tabs are stubs for now (Tasks 24, 28).
 *
 * @param props - Property metadata and filter state handle.
 * @returns Right sidebar element.
 */
export function RightSidebar({ propertyMetas, filterHandle }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white" data-testid="right-sidebar">
      <Tabs defaultValue="filters" className="flex h-full flex-col">
        <TabsList className="shrink-0 px-2 pt-2">
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="color">Color</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="flex-1 overflow-hidden">
          <FiltersTab propertyMetas={propertyMetas} filterHandle={filterHandle} />
        </TabsContent>

        <TabsContent value="stats" className="flex-1 p-3">
          <p className="text-xs italic text-slate-400">Stats — coming soon.</p>
        </TabsContent>

        <TabsContent value="color" className="flex-1 p-3">
          <p className="text-xs italic text-slate-400">Color — coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

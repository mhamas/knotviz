import { useCallback, useRef, useState } from 'react'
import type { CosmosGraphData, PropertyMeta } from './types'
import type { FilterStateHandle, PropertyColumns } from './hooks/useFilterState'
import { useGraphStore } from '@/stores/useGraphStore'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { LeftSidebar } from './components/LeftSidebar'
import { RightTabStrip } from './components/RightTabStrip'
import { ColorsSidebar } from './components/ColorsSidebar'
import { FiltersSidebar } from './components/FiltersSidebar'
import { ErrorBoundary } from './components/ErrorBoundary'

const noop = (): void => {}
const emptyFilterHandle: FilterStateHandle = {
  filters: new Map(),
  resetKey: 0,
  setNumberFilter: noop,
  setStringFilter: noop,
  setDateFilter: noop,
  setBooleanFilter: noop,
  setFilterEnabled: noop,
  setAllFiltersEnabled: noop,
  clearAllFilters: noop,
  hasActiveFilters: false,
}

interface LoadedData {
  cosmosData: CosmosGraphData
  propertyColumns: PropertyColumns
  propertyMetas: PropertyMeta[]
  replacementCount: number
  filename: string
}

/**
 * Root component. Manages top-level graph load state.
 * Always renders layout with both sidebars; center area shows DropZone or GraphView.
 *
 * @returns App root element.
 */
function App(): React.JSX.Element {
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoadNewFile = useCallback((file?: File): void => {
    useGraphStore.getState().resetStore()
    setPendingFile(file ?? null)
    setLoadedData(null)
  }, [])

  const handleBrowseFile = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  if (loadedData === null) {
    return (
      <div className="flex h-screen w-screen">
        <LeftSidebar onReset={handleBrowseFile} />
        <div className="relative flex-1">
          <DropZone
            fileInputRef={fileInputRef}
            pendingFile={pendingFile}
            onLoad={(cosmosData, propertyColumns, propertyMetas, replacementCount, filename): void => {
              setPendingFile(null)
              setLoadedData({ cosmosData, propertyColumns, propertyMetas, replacementCount, filename })
            }}
          />
        </div>
        <ColorsSidebar
          propertyMetas={[]}
          gradientState={{ propertyKey: null, palette: 'Viridis', isReversed: false, customColors: [], customPalettes: [] }}
          onGradientChange={() => {}}
          propertyColumns={{}}
          filters={new Map()}
          propertyStats={null}
          onClose={() => {}}
        />
        <FiltersSidebar
          propertyMetas={[]}
          filterHandle={emptyFilterHandle}
          matchingCount={0}
          nodeCount={0}
          onClose={() => {}}
        />
        <RightTabStrip
          isColorsOpen={true}
          isFiltersOpen={true}
          onToggleColors={() => {}}
          onToggleFilters={() => {}}
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <GraphView
        cosmosData={loadedData.cosmosData}
        propertyColumns={loadedData.propertyColumns}
        propertyMetas={loadedData.propertyMetas}
        filename={loadedData.filename}
        onLoadNewFile={handleLoadNewFile}
      />
    </ErrorBoundary>
  )
}

export default App

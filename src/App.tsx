import { useCallback, useRef, useState } from 'react'
import type { CosmosGraphData, PropertyMeta } from './types'
import type { PropertyColumns } from './hooks/useFilterState'
import { useGraphStore } from '@/stores/useGraphStore'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { LeftSidebar } from './components/LeftSidebar'
import { RightTabStrip } from './components/RightTabStrip'
import { ErrorBoundary } from './components/ErrorBoundary'

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
        <RightTabStrip
          isColorsOpen={false}
          isFiltersOpen={false}
          onToggleColors={() => {}}
          onToggleFilters={() => {}}
          isDisabled
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

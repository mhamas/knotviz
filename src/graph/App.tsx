import { useCallback, useEffect, useRef, useState } from 'react'
import type { CosmosGraphData, NodePropertiesMetadata, PropertyMeta } from './types'
import type { PropertyColumns } from './hooks/useFilterState'
import { useGraphStore } from '@/stores/useGraphStore'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { LeftSidebar } from './components/LeftSidebar'
import { RightTabStrip } from './components/RightTabStrip'
import { ErrorBoundary } from './components/ErrorBoundary'
import { loadExample } from './lib/loadExample'

interface LoadedData {
  cosmosData: CosmosGraphData
  propertyColumns: PropertyColumns
  propertyMetas: PropertyMeta[]
  nodePropertiesMetadata: NodePropertiesMetadata | undefined
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
  const [pendingFile, setPendingFile] = useState<File | File[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // On mount, check for ?example=<format>/<size> and auto-load the sample.
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get('example')
    if (!name) return
    let cancelled = false
    loadExample(name)
      .then((files) => {
        if (cancelled || !files) return
        setPendingFile(files)
      })
      .catch((err) => console.error('Failed to load example', name, err))
    return (): void => { cancelled = true }
  }, [])

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
            onLoad={(cosmosData, propertyColumns, propertyMetas, nodePropertiesMetadata, replacementCount, filename): void => {
              setPendingFile(null)
              setLoadedData({ cosmosData, propertyColumns, propertyMetas, nodePropertiesMetadata, replacementCount, filename })
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
        nodePropertiesMetadata={loadedData.nodePropertiesMetadata}
        filename={loadedData.filename}
        onLoadNewFile={handleLoadNewFile}
      />
    </ErrorBoundary>
  )
}

export default App

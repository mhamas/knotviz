import { useCallback, useRef, useState } from 'react'
import type { CosmosGraphData, GraphData, PositionMode } from './types'
import { useGraphStore } from '@/stores/useGraphStore'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { LeftSidebar } from './components/LeftSidebar'
import { ErrorBoundary } from './components/ErrorBoundary'

interface LoadedData {
  data: GraphData
  cosmosData: CosmosGraphData
  positionMode: PositionMode
  filename: string
}

/**
 * Root component. Manages top-level graph load state.
 * Always renders layout with sidebars; center area shows DropZone or GraphView.
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
            onLoad={(data, cosmosData, positionMode, filename): void => {
              setPendingFile(null)
              setLoadedData({ data, cosmosData, positionMode, filename })
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <GraphView
        graphData={loadedData.data}
        cosmosData={loadedData.cosmosData}
        filename={loadedData.filename}
        onLoadNewFile={handleLoadNewFile}
      />
    </ErrorBoundary>
  )
}

export default App

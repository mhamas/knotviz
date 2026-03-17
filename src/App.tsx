import { useCallback, useRef, useState } from 'react'
import type Graph from 'graphology'
import type { GraphData, PositionMode } from './types'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { LeftSidebar } from './components/LeftSidebar'
import { ErrorBoundary } from './components/ErrorBoundary'

interface LoadedData {
  data: GraphData
  graph: Graph
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoadNewFile = useCallback((): void => {
    setLoadedData(null)
  }, [])

  const handleBrowseFile = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  if (loadedData === null) {
    return (
      <div className="flex h-screen w-screen">
        <LeftSidebar
          isDisabled
          isRunning={false}
          simulationError={null}
          gravity={1}
          speed={1}
          nodeCount={0}
          edgeCount={0}
          onRun={(): void => {}}
          onStop={(): void => {}}
          onGravityChange={(): void => {}}
          onSpeedChange={(): void => {}}
          onRandomizeLayout={(): void => {}}
          nodeSize={5}
          edgeSize={1}
          isEdgesVisible={true}
          isNodeLabelsVisible={false}
          isHighlightNeighbors={false}
          onNodeSizeChange={(): void => {}}
          onEdgeSizeChange={(): void => {}}
          onEdgesVisibleChange={(): void => {}}
          onNodeLabelsVisibleChange={(): void => {}}
          onHighlightNeighborsChange={(): void => {}}
          onReset={handleBrowseFile}
        />
        <div className="relative flex-1">
          <DropZone
            fileInputRef={fileInputRef}
            onLoad={(data, graph, positionMode, filename): void => {
              setLoadedData({ data, graph, positionMode, filename })
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
        graph={loadedData.graph}
        positionMode={loadedData.positionMode}
        filename={loadedData.filename}
        onLoadNewFile={handleLoadNewFile}
      />
    </ErrorBoundary>
  )
}

export default App

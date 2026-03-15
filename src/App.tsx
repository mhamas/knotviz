import { useState } from 'react'
import type Graph from 'graphology'
import type { GraphData, PositionMode } from './types'
import { DropZone } from './components/DropZone'
import { GraphView } from './components/GraphView'
import { ErrorBoundary } from './components/ErrorBoundary'

interface LoadedData {
  data: GraphData
  graph: Graph
  positionMode: PositionMode
  filename: string
}

/**
 * Root component. Manages top-level graph load state.
 * Renders DropZone before graph is loaded, GraphView after.
 *
 * @returns App root element.
 */
function App(): React.JSX.Element {
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null)

  if (loadedData === null) {
    return (
      <DropZone
        onLoad={(data, graph, positionMode, filename): void => {
          setLoadedData({ data, graph, positionMode, filename })
        }}
      />
    )
  }

  return (
    <ErrorBoundary>
      <GraphView
        graphData={loadedData.data}
        graph={loadedData.graph}
        positionMode={loadedData.positionMode}
        filename={loadedData.filename}
        onLoadNewFile={(): void => setLoadedData(null)}
      />
    </ErrorBoundary>
  )
}

export default App

import { useState } from 'react'
import type Graph from 'graphology'
import type { GraphData, PositionMode } from './types'
import { DropZone } from './components/DropZone'

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

  // GraphView will be added in Task 07
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-slate-600">
        Graph loaded: {loadedData.filename} ({loadedData.graph.order} nodes,{' '}
        {loadedData.graph.size} edges)
      </p>
    </div>
  )
}

export default App

import { useState, useRef, useCallback } from 'react'
import type Graph from 'graphology'
import type { GraphData, PositionMode, NullDefaultResult } from '../types'
import { parseJSON } from '../lib/parseJSON'
import { validateGraph } from '../lib/validateGraph'
import { applyNullDefaults } from '../lib/applyNullDefaults'
import { buildGraph } from '../lib/buildGraph'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface Props {
  onLoad: (data: GraphData, graph: Graph, positionMode: PositionMode, filename: string) => void
}

/**
 * Full-screen file drop target for initial graph load.
 * Accepts .json via drag-and-drop or click-to-browse.
 * Runs the full data pipeline on drop — including buildGraph.
 *
 * @param props - Component props with onLoad callback.
 * @returns Drop zone UI element.
 */
export function DropZone({ onLoad }: Props): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingLoad, setPendingLoad] = useState<{
    data: GraphData
    graph: Graph
    positionMode: PositionMode
    filename: string
    replacementCount: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    (file: File): void => {
      setError(null)
      setIsLoading(true)

      const reader = new FileReader()
      reader.onload = (e): void => {
        try {
          const text = e.target?.result as string
          const raw = parseJSON(text)
          const validated = validateGraph(raw)
          const nullResult: NullDefaultResult = applyNullDefaults(validated)
          const { graph, positionMode } = buildGraph(nullResult)

          if (nullResult.replacementCount > 0) {
            setPendingLoad({
              data: nullResult.data,
              graph,
              positionMode,
              filename: file.name,
              replacementCount: nullResult.replacementCount,
            })
            setIsLoading(false)
          } else {
            onLoad(nullResult.data, graph, positionMode, file.name)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsLoading(false)
        }
      }
      reader.onerror = (): void => {
        setError('Failed to read file')
        setIsLoading(false)
      }
      reader.readAsText(file)
    },
    [onLoad]
  )

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleClick = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [processFile]
  )

  const handleConfirmLoad = useCallback((): void => {
    if (pendingLoad) {
      onLoad(pendingLoad.data, pendingLoad.graph, pendingLoad.positionMode, pendingLoad.filename)
      setPendingLoad(null)
    }
  }, [pendingLoad, onLoad])

  const handleCancelLoad = useCallback((): void => {
    setPendingLoad(null)
  }, [])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div
        data-testid="drop-zone"
        className={`flex h-64 w-96 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          isDragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isLoading ? (
          <div data-testid="spinner" className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading graph…</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">
              Drop a .json graph file here
            </p>
            <p className="mt-1 text-xs text-slate-400">or click to browse</p>
          </>
        )}

        {error && (
          <p data-testid="error-message" className="mt-3 max-w-xs text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <AlertDialog open={pendingLoad !== null} onOpenChange={(isOpen) => { if (!isOpen) handleCancelLoad() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Missing property values</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLoad?.replacementCount} values were replaced with defaults. Some nodes had
              missing property values that were replaced with type defaults (number → 0, string →
              &quot;&quot;, boolean → false, date → 1970-01-01).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLoad}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad}>Load anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CosmosGraphData, NodePropertiesMetadata, PropertyMeta, PositionMode } from '../types'
import type { PropertyColumns } from '../hooks/useFilterState'
import LoadingWorker from '@/workers/loadingWorker?worker'
import { detectFileFormat } from '../lib/detectFileFormat'
import { SchemaDialog } from './SchemaDialog'
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
  onLoad: (
    cosmosData: CosmosGraphData,
    propertyColumns: PropertyColumns,
    propertyMetas: PropertyMeta[],
    nodePropertiesMetadata: NodePropertiesMetadata | undefined,
    replacementCount: number,
    filename: string,
  ) => void
  fileInputRef?: React.RefObject<HTMLInputElement | null>
  pendingFile?: File | null
}

/**
 * Full-screen file drop target for initial graph load.
 * Uses a Web Worker with streaming JSON parser for large files.
 *
 * @param props - Component props with onLoad callback.
 * @returns Drop zone UI element.
 */
export function DropZone({ onLoad, fileInputRef: externalFileInputRef, pendingFile }: Props): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)
  const [pendingLoad, setPendingLoad] = useState<{
    cosmosData: CosmosGraphData
    propertyColumns: PropertyColumns
    propertyMetas: PropertyMeta[]
    nodePropertiesMetadata: NodePropertiesMetadata | undefined
    positionMode: PositionMode
    filename: string
    replacementCount: number
  } | null>(null)

  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = externalFileInputRef ?? internalFileInputRef
  const workerRef = useRef<Worker | null>(null)

  // Clean up worker on unmount
  useEffect(() => {
    return () => { workerRef.current?.terminate() }
  }, [])

  const processFiles = useCallback(
    (inputFiles: File[]): void => {
      setError(null)
      let detection
      try {
        detection = detectFileFormat(inputFiles)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to read file')
        return
      }
      const { format, orderedFiles } = detection
      const displayName =
        format === 'csv-pair'
          ? `${orderedFiles[0].name} + ${orderedFiles[1].name}`
          : orderedFiles[0].name

      setIsLoading(true)
      setLoadingStatus('Starting…')

      // Terminate any previous worker
      workerRef.current?.terminate()

      const worker = new LoadingWorker()
      workerRef.current = worker

      worker.onmessage = (e: MessageEvent): void => {
        const msg = e.data

        if (msg.type === 'progress') {
          const { stage, percent } = msg as { stage: string; percent: number }
          setLoadingStatus(`${stage} (${percent}%)`)
          return
        }

        if (msg.type === 'error') {
          setError(msg.message as string)
          setIsLoading(false)
          worker.terminate()
          return
        }

        if (msg.type === 'complete') {
          worker.terminate()
          workerRef.current = null

          const nodeIds = msg.nodeIds as string[]
          const nodeIndexMap = new Map<string, number>()
          for (let i = 0; i < nodeIds.length; i++) nodeIndexMap.set(nodeIds[i], i)

          const cosmosData: CosmosGraphData = {
            nodeCount: msg.nodeCount as number,
            nodeIds,
            nodeLabels: msg.nodeLabels as (string | undefined)[],
            nodeIndexMap,
            initialPositions: msg.initialPositions as Float32Array | undefined,
            linkIndices: msg.linkIndices as Float32Array,
            positionMode: msg.positionMode as PositionMode,
            edgeSources: msg.edgeSources as Uint32Array,
            edgeTargets: msg.edgeTargets as Uint32Array,
            edgeLabels: msg.edgeLabels as (string | undefined)[],
            edgeWeights: msg.edgeWeights as Float32Array | undefined,
            edgeSortOrder: msg.edgeSortOrder as Uint32Array,
          }

          const propertyColumns = msg.propertyColumns as PropertyColumns
          const propertyMetas = msg.propertyMetas as PropertyMeta[]
          const nodePropertiesMetadata = msg.nodePropertiesMetadata as NodePropertiesMetadata | undefined
          const replacementCount = msg.replacementCount as number

          if (replacementCount > 0) {
            setPendingLoad({
              cosmosData,
              propertyColumns,
              propertyMetas,
              nodePropertiesMetadata,
              positionMode: cosmosData.positionMode,
              filename: displayName,
              replacementCount,
            })
            setIsLoading(false)
          } else {
            onLoad(cosmosData, propertyColumns, propertyMetas, nodePropertiesMetadata, replacementCount, displayName)
          }
        }
      }

      worker.onerror = (): void => {
        setError('Loading worker failed')
        setIsLoading(false)
      }

      worker.postMessage({ type: 'load', files: orderedFiles, format })
    },
    [onLoad],
  )

  const processFile = useCallback((file: File): void => processFiles([file]), [processFiles])

  // Auto-process a file passed from drag-drop on loaded graph
  const [initialPendingFile] = useState(pendingFile)
  useEffect(() => {
    if (initialPendingFile) {
      const id = requestAnimationFrame(() => processFile(initialPendingFile))
      return (): void => cancelAnimationFrame(id)
    }
  }, [initialPendingFile, processFile])

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
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const handleClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) processFiles(files)
      e.target.value = ''
    },
    [processFiles],
  )

  const handleConfirmLoad = useCallback((): void => {
    if (pendingLoad) {
      onLoad(pendingLoad.cosmosData, pendingLoad.propertyColumns, pendingLoad.propertyMetas, pendingLoad.nodePropertiesMetadata, pendingLoad.replacementCount, pendingLoad.filename)
      setPendingLoad(null)
    }
  }, [pendingLoad, onLoad])

  const handleCancelLoad = useCallback((): void => {
    setPendingLoad(null)
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <div
        data-testid="drop-zone"
        className={`flex h-80 w-[32rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
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
            <p className="text-sm text-slate-500">{loadingStatus || 'Loading graph…'}</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">
              Drop a graph file here
            </p>
            <p className="mt-1 text-xs text-slate-400">
              JSON, CSV/TSV, GraphML, or GEXF — or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400">
              CSV pair: select both <span className="font-mono">*nodes*.csv</span> + <span className="font-mono">*edges*.csv</span> at once
            </p>
            <button
              className="mt-3 cursor-pointer text-xs text-slate-400 underline hover:text-slate-600"
              onClick={(e): void => {
                e.stopPropagation()
                setIsSchemaOpen(true)
              }}
            >
              View expected JSON schema
            </button>
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
        accept=".json,.csv,.tsv,.graphml,.xml,.gexf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <SchemaDialog isOpen={isSchemaOpen} onOpenChange={setIsSchemaOpen} />

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

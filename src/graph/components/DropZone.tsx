import { useState, useRef, useCallback, useEffect } from 'react'
import type { CoercionWarningSummary, CosmosGraphData, NodePropertiesMetadata, PropertyMeta, PositionMode } from '../types'
import type { PropertyColumns } from '../hooks/useFilterState'
import type { FileFormat } from '../lib/detectFileFormat'
import LoadingWorker from '@/workers/loadingWorker?worker'
import { detectFileFormat } from '../lib/detectFileFormat'
import { SchemaDialog } from './SchemaDialog'
import { formatNumber } from '../lib/formatNumber'
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
  pendingFile?: File | File[] | null
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
    coercionWarnings: CoercionWarningSummary[]
  } | null>(null)

  const [pairNodesFile, setPairNodesFile] = useState<File | null>(null)
  const [pairEdgesFile, setPairEdgesFile] = useState<File | null>(null)

  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = externalFileInputRef ?? internalFileInputRef
  const workerRef = useRef<Worker | null>(null)

  // Clean up worker on unmount
  useEffect(() => {
    return () => { workerRef.current?.terminate() }
  }, [])

  /**
   * Runs the loader worker against an explicit set of files and format.
   * Shared by the main drop path (after `detectFileFormat`) and the
   * CSV-pair slots (which already know `[nodes, edges]` and `csv-pair`).
   */
  const runLoader = useCallback(
    (files: File[], format: FileFormat, displayName: string): void => {
      setError(null)
      setIsLoading(true)
      setLoadingStatus('Starting…')

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
          const coercionWarnings = (msg.coercionWarnings as CoercionWarningSummary[] | undefined) ?? []

          if (replacementCount > 0 || coercionWarnings.length > 0) {
            setPendingLoad({
              cosmosData,
              propertyColumns,
              propertyMetas,
              nodePropertiesMetadata,
              positionMode: cosmosData.positionMode,
              filename: displayName,
              replacementCount,
              coercionWarnings,
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

      worker.postMessage({ type: 'load', files, format })
    },
    [onLoad],
  )

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
      runLoader(orderedFiles, format, displayName)
    },
    [runLoader],
  )

  /** Load the CSV pair as soon as both slots are filled. */
  const maybeLoadPair = useCallback(
    (nodes: File | null, edges: File | null): void => {
      if (!nodes || !edges) return
      setError(null)
      const displayName = `${nodes.name} + ${edges.name}`
      runLoader([nodes, edges], 'csv-pair', displayName)
      setPairNodesFile(null)
      setPairEdgesFile(null)
    },
    [runLoader],
  )

  const onDropNodes = useCallback(
    (file: File): void => {
      setPairNodesFile(file)
      maybeLoadPair(file, pairEdgesFile)
    },
    [maybeLoadPair, pairEdgesFile],
  )

  const onDropEdges = useCallback(
    (file: File): void => {
      setPairEdgesFile(file)
      maybeLoadPair(pairNodesFile, file)
    },
    [maybeLoadPair, pairNodesFile],
  )

  // Auto-process a file (or files, for csv-pair) passed from drag-drop on a
  // loaded graph or set asynchronously from a ?example= URL param.
  useEffect(() => {
    if (!pendingFile) return
    const files = Array.isArray(pendingFile) ? pendingFile : [pendingFile]
    if (files.length === 0) return
    const id = requestAnimationFrame(() => processFiles(files))
    return (): void => cancelAnimationFrame(id)
  }, [pendingFile, processFiles])

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
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-50 py-8">
      <div
        data-testid="drop-zone"
        className={`flex h-64 w-[32rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
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

      {!isLoading && (
        <>
          <div className="flex w-[32rem] items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>or a CSV pair</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex w-[32rem] gap-3">
            <CsvSlot
              testId="csv-slot-nodes"
              label="Nodes"
              hint="drop CSV / TSV"
              file={pairNodesFile}
              onFile={onDropNodes}
              onClear={(): void => setPairNodesFile(null)}
            />
            <CsvSlot
              testId="csv-slot-edges"
              label="Edges"
              hint="drop CSV / TSV"
              file={pairEdgesFile}
              onFile={onDropEdges}
              onClear={(): void => setPairEdgesFile(null)}
            />
          </div>
        </>
      )}

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
            <AlertDialogTitle>Data quality warnings</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLoad && pendingLoad.replacementCount > 0 && (
                <>
                  <strong>{formatNumber(pendingLoad.replacementCount)}</strong> missing values
                  will be replaced with type defaults (number → 0, string → &quot;&quot;, boolean → false,
                  date → 1970-01-01).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingLoad && pendingLoad.coercionWarnings.length > 0 && (
            <div data-testid="load-warning-coercion" className="text-sm text-slate-600">
              <p>
                Some cells didn&apos;t match the type declared in their column header and were
                dropped:
              </p>
              <ul className="mt-1.5 space-y-1 pl-4">
                {pendingLoad.coercionWarnings.map((w) => (
                  <li key={`${w.scope}:${w.propertyKey}`} className="list-disc">
                    <code className="text-xs">{w.propertyKey}</code>
                    {' — '}
                    <strong>{formatNumber(w.failedCount)}</strong> {w.scope === 'nodes' ? 'node' : 'edge'}
                    {w.failedCount === 1 ? '' : 's'} failed
                    {w.exampleValue !== undefined && (
                      <>
                        {' (e.g. '}
                        <code className="text-xs">&quot;{w.exampleValue}&quot;</code>
                        {')'}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLoad}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad}>Load anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface CsvSlotProps {
  testId: string
  label: string
  hint: string
  file: File | null
  onFile: (file: File) => void
  onClear: () => void
}

/**
 * One half of the CSV pair drop target — labelled "Nodes" or "Edges" so the
 * user doesn't need to remember a filename convention. When a file is
 * present, the slot shows the filename and a clear (×) button.
 */
function CsvSlot({ testId, label, hint, file, onFile, onClear }: CsvSlotProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const accept = (candidate: File): boolean => /\.(csv|tsv)$/i.test(candidate.name)

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const first = e.dataTransfer.files[0]
    if (first && accept(first)) onFile(first)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const first = e.target.files?.[0]
    if (first && accept(first)) onFile(first)
    e.target.value = ''
  }

  return (
    <div
      data-testid={testId}
      onDragOver={(e): void => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
      }}
      onDragLeave={(e): void => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
      }}
      onDrop={handleDrop}
      onClick={(): void => inputRef.current?.click()}
      className={`flex h-24 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        file
          ? 'border-green-400 bg-green-50'
          : isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      {file ? (
        <>
          <p className="text-xs font-medium uppercase tracking-wider text-green-700">{label}</p>
          <p className="mt-0.5 max-w-[14rem] truncate px-2 text-xs text-slate-700" title={file.name}>
            ✓ {file.name}
          </p>
          <button
            className="mt-1 text-xs text-slate-400 underline hover:text-slate-600"
            onClick={(e): void => {
              e.stopPropagation()
              onClear()
            }}
          >
            clear
          </button>
        </>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

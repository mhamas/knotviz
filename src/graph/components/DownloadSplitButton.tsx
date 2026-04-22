import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EXPORT_FORMATS } from '../lib/exports'
import type { ExportFormat } from '../lib/exports/types'

/**
 * In-session memory of the last format the user chose. Module-level — not
 * persisted to localStorage, so a fresh page load always starts at JSON.
 * Mutated when an export completes successfully.
 */
let lastUsedFormat: ExportFormat = 'json'

interface Props {
  onDownload: (format: ExportFormat) => Promise<void>
  disabled?: boolean
}

/**
 * Split-button download control. Body click triggers the last-used format
 * (defaults to JSON each session). Chevron opens a picker listing all five
 * formats with one-line descriptions; lossy formats route through a
 * confirmation dialog before export.
 */
export function DownloadSplitButton({ onDownload, disabled = false }: Props): React.JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingLossy, setPendingLossy] = useState<ExportFormat | null>(null)
  const [activeFormat, setActiveFormat] = useState<ExportFormat>(lastUsedFormat)

  const performExport = useCallback(
    async (format: ExportFormat) => {
      lastUsedFormat = format
      setActiveFormat(format)
      await onDownload(format)
    },
    [onDownload],
  )

  const handlePick = useCallback(
    (format: ExportFormat) => {
      setPickerOpen(false)
      const meta = EXPORT_FORMATS.find((f) => f.format === format)
      if (meta?.lossy) {
        setPendingLossy(format)
        return
      }
      void performExport(format)
    },
    [performExport],
  )

  const handleConfirmLossy = useCallback(() => {
    if (pendingLossy) {
      const format = pendingLossy
      setPendingLossy(null)
      void performExport(format)
    }
  }, [pendingLossy, performExport])

  const activeLabel = EXPORT_FORMATS.find((f) => f.format === activeFormat)?.shortLabel ?? 'JSON'
  const lossyMeta = pendingLossy ? EXPORT_FORMATS.find((f) => f.format === pendingLossy) : null

  return (
    <>
      <div className={`flex items-stretch gap-px ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        <button
          type="button"
          data-testid="download-button"
          onClick={(): void => {
            void performExport(lastUsedFormat)
          }}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-l-md rounded-r-none border border-r-0 border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          ↓ Download as {activeLabel}
        </button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            data-testid="download-format-picker"
            className="inline-flex w-7 cursor-pointer items-center justify-center rounded-l-none rounded-r-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label="Pick a download format"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-72 p-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Download format
            </div>
            {EXPORT_FORMATS.map((meta) => (
              <button
                key={meta.format}
                type="button"
                data-testid={`download-format-${meta.format}`}
                onClick={(): void => handlePick(meta.format)}
                className={`flex w-full cursor-pointer flex-col items-start rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 ${
                  meta.format === activeFormat ? 'bg-slate-50' : ''
                }`}
              >
                <span className="font-medium text-slate-700">
                  {meta.label}
                  {meta.lossy && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Lossy
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500">{meta.description}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog
        open={pendingLossy !== null}
        onOpenChange={(isOpen): void => {
          if (!isOpen) setPendingLossy(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="lossy-export-dialog-title">Lossy export — {lossyMeta?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {lossyMeta?.format === 'csv-edge-list'
                ? 'CSV edge list only carries connections (source, target, weight). Per-node properties — labels, ages, tags, dates, positions — will not be in the exported file. Continue?'
                : 'GraphML has no native list type. String[] properties will be flattened to pipe-delimited strings (e.g. "engineer|founder"). On re-import they come back as plain strings, not arrays. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLossy} data-testid="lossy-export-confirm">
              Download anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import type { CustomPalette, PaletteName } from '@/types'
import { PALETTE_NAMES, samplePalette, interpolatePalette } from '@/lib/colorScales'
import { formatNumber } from '@/lib/formatNumber'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

const MIN_COUNT = 2
const MAX_COUNT = 10000
const LOG_MIN = Math.log(MIN_COUNT)
const LOG_MAX = Math.log(MAX_COUNT)

/** Convert a linear slider value [0, 1] to a logarithmic count [2, 10000]. */
function sliderToCount(t: number): number {
  return Math.round(Math.exp(LOG_MIN + t * (LOG_MAX - LOG_MIN)))
}

/** Convert a count [2, 10000] to a linear slider value [0, 1]. */
function countToSlider(n: number): number {
  return (Math.log(Math.max(2, n)) - LOG_MIN) / (LOG_MAX - LOG_MIN)
}

/** Format a number with locale separators (e.g. 1,000). */
function formatCount(n: number): string {
  return formatNumber(n)
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (palette: CustomPalette) => void
}

/**
 * Modal for creating a custom palette by sampling N colors from a base color scheme.
 *
 * @param props - Open state, close handler, and save handler.
 * @returns Dialog element.
 */
let nextId = 1

export function CreatePaletteModal({ isOpen, onClose, onSave }: Props): React.JSX.Element {
  const [baseScheme, setBaseScheme] = useState<PaletteName>('Viridis')
  const [sliderValue, setSliderValue] = useState(countToSlider(6))
  const [editingCount, setEditingCount] = useState<string | null>(null)
  const [name, setName] = useState('')
  const idRef = useRef(0)
  const countInputRef = useRef<HTMLInputElement>(null)
  // Prevent blur handler from committing when the user pressed Escape —
  // setEditingCount(null) hasn't flushed by the time onBlur reads the state.
  const isEscapingRef = useRef(false)

  const count = sliderToCount(sliderValue)
  const previewColors = samplePalette(baseScheme, count)

  const commitCount = useCallback((raw: string): void => {
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) {
      setEditingCount(null)
      return
    }
    const clamped = Math.min(MAX_COUNT, Math.max(MIN_COUNT, parsed))
    setSliderValue(countToSlider(clamped))
    setEditingCount(null)
  }, [])

  const handleSave = (): void => {
    idRef.current = nextId++
    const paletteName = name.trim() || `${baseScheme} ×${count}`
    onSave({
      id: `custom-${idRef.current}`,
      name: paletteName,
      colors: previewColors,
    })
    // Reset for next use
    setName('')
    setSliderValue(countToSlider(6))
    setEditingCount(null)
    setBaseScheme('Viridis')
    onClose()
  }

  const handleBaseChange = (value: string | null): void => {
    if (value) setBaseScheme(value as PaletteName)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen): void => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md" data-testid="create-palette-modal">
        <DialogHeader>
          <DialogTitle>Create custom palette</DialogTitle>
          <DialogDescription>
            Sample evenly-spaced colors from a base color scheme.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Palette name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e): void => setName(e.target.value)}
              placeholder={`${baseScheme} ×${count}`}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              data-testid="palette-name-input"
            />
          </div>

          {/* Base scheme */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Base color scheme
            </label>
            <Select value={baseScheme} onValueChange={handleBaseChange}>
              <SelectTrigger className="w-full" data-testid="palette-base-select">
                <span className="flex flex-1 items-center gap-2 text-left">
                  <SchemePreview palette={baseScheme} />
                  {baseScheme}
                </span>
              </SelectTrigger>
              <SelectContent>
                {PALETTE_NAMES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <SchemePreview palette={p} />
                      {p}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of colors — slider for coarse adjust, input for exact value */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label
                htmlFor="palette-count-input"
                className="text-xs font-medium text-slate-600"
              >
                Number of colors
              </label>
              <input
                ref={countInputRef}
                id="palette-count-input"
                type="text"
                inputMode="numeric"
                value={editingCount ?? formatCount(count)}
                onFocus={(e): void => {
                  setEditingCount(String(count))
                  e.target.select()
                }}
                onChange={(e): void => setEditingCount(e.target.value)}
                onBlur={(): void => {
                  if (isEscapingRef.current) {
                    isEscapingRef.current = false
                    return
                  }
                  if (editingCount !== null) commitCount(editingCount)
                }}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
                  if (e.key === 'Enter') {
                    if (editingCount !== null) commitCount(editingCount)
                    countInputRef.current?.blur()
                  } else if (e.key === 'Escape') {
                    isEscapingRef.current = true
                    setEditingCount(null)
                    countInputRef.current?.blur()
                  }
                }}
                className="h-7 w-24 rounded-md border border-input bg-transparent px-2 text-right text-xs tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                data-testid="palette-count-input"
                aria-label="Number of colors"
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={sliderValue}
              onChange={(e): void => {
                setSliderValue(Number(e.target.value))
                // Slider wins while the user drags — drop any in-flight edit
                setEditingCount(null)
              }}
              className="w-full accent-blue-500"
              data-testid="palette-count-slider"
              aria-label="Number of colors slider"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>{formatCount(MIN_COUNT)}</span>
              <span>{formatCount(MAX_COUNT)}</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Preview</label>
            <PalettePreview colors={previewColors} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="palette-save-btn">
            Save palette
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Max number of discrete color chips to render in preview. */
const MAX_PREVIEW_CHIPS = 40

/**
 * Preview for the sampled palette. Shows individual chips for small counts,
 * or a continuous gradient bar for large counts.
 */
function PalettePreview({ colors }: { colors: string[] }): React.JSX.Element {
  if (colors.length <= MAX_PREVIEW_CHIPS) {
    return (
      <>
        <div className="flex" data-testid="palette-preview">
          {colors.map((color, i) => (
            <div
              key={i}
              className="h-6 flex-1 first:rounded-l-sm last:rounded-r-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {colors.map((color, i) => (
            <span key={i} className="text-[9px] font-mono text-slate-400">
              {color}
            </span>
          ))}
        </div>
      </>
    )
  }

  // For large palettes, show a gradient bar with first/last hex values
  const gradientStops = colors
    .filter((_, i) => i % Math.ceil(colors.length / 30) === 0 || i === colors.length - 1)
    .map((c, i, arr) => `${c} ${(i / (arr.length - 1)) * 100}%`)
    .join(', ')

  return (
    <>
      <div
        className="h-6 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${gradientStops})` }}
        data-testid="palette-preview"
      />
      <div className="mt-1 flex justify-between text-[9px] font-mono text-slate-400">
        <span>{colors[0]}</span>
        <span>{formatCount(colors.length)} colors</span>
        <span>{colors[colors.length - 1]}</span>
      </div>
    </>
  )
}

/** Small gradient swatch for base scheme selector. */
function SchemePreview({ palette }: { palette: PaletteName }): React.JSX.Element {
  const stops = Array.from({ length: 5 }, (_, i) =>
    `${interpolatePalette(palette, i / 4)} ${i * 25}%`,
  ).join(', ')
  return (
    <span
      className="inline-block h-3 w-6 rounded-sm"
      style={{ background: `linear-gradient(to right, ${stops})` }}
    />
  )
}

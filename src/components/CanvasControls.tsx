import { RotateCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onRotateCW: () => void
  onRotateCCW: () => void
  disabled?: boolean
}

/**
 * On-screen zoom, fit, and rotate buttons overlaid on the canvas, bottom-right corner.
 *
 * @param props - Zoom, fit, rotate callbacks and disabled state.
 * @returns Canvas controls element.
 */
export function CanvasControls({ onZoomIn, onZoomOut, onFit, onRotateCW, onRotateCCW, disabled = false }: Props): React.JSX.Element {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onZoomIn}
        disabled={disabled}
        aria-label="Zoom in"
      >
        +
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onZoomOut}
        disabled={disabled}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onFit}
        disabled={disabled}
        aria-label="Fit to view"
      >
        ⊡
      </Button>
      <div className="my-0.5" />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onRotateCCW}
        disabled={disabled}
        aria-label="Rotate counter-clockwise"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onRotateCW}
        disabled={disabled}
        aria-label="Rotate clockwise"
      >
        <RotateCw className="h-3.5 w-3.5" />
      </Button>
      <div className="my-0.5" />
      <KeyboardShortcutsHelp />
    </div>
  )
}

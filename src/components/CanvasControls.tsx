import { Button } from '@/components/ui/button'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

/**
 * On-screen zoom and fit buttons overlaid on the canvas, bottom-right corner.
 *
 * @param props - Zoom and fit callbacks.
 * @returns Canvas controls element.
 */
export function CanvasControls({ onZoomIn, onZoomOut, onFit }: Props): React.JSX.Element {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onZoomIn}
        aria-label="Zoom in"
      >
        +
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onZoomOut}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
        onClick={onFit}
        aria-label="Fit to view"
      >
        ⊡
      </Button>
      <div className="my-0.5" />
      <KeyboardShortcutsHelp />
    </div>
  )
}

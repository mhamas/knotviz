import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ShortcutRow {
  keys: string
  description: string
}

const shortcuts: ShortcutRow[] = [
  { keys: 'Space', description: 'Start / stop simulation' },
  { keys: 'Scroll', description: 'Zoom in / out' },
  { keys: 'Click + drag', description: 'Pan the canvas' },
  { keys: 'Shift + scroll', description: 'Rotate canvas' },
  { keys: 'Hover node', description: 'Show label (always)' },
]

/**
 * Help button that shows a popover with keyboard shortcuts and mouse controls.
 *
 * @returns Keyboard shortcuts help element.
 */
export function KeyboardShortcutsHelp(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-500 hover:bg-slate-50 active:bg-slate-100"
        aria-label="Keyboard shortcuts"
      >
        ?
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-56 p-3">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
          Controls
        </h4>
        <div className="space-y-1.5">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-start justify-between gap-2 text-xs">
              <kbd className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {s.keys}
              </kbd>
              <span className="text-right text-slate-500">{s.description}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

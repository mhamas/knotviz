interface Props {
  isVisible: boolean
}

/**
 * Full-canvas overlay shown when dragging a file over a loaded graph.
 *
 * @param props - Visibility state.
 * @returns Overlay element.
 */
export function DragOverlay({ isVisible }: Props): React.JSX.Element {
  return (
    <div
      data-testid="drag-overlay"
      className={`absolute inset-0 z-20 flex items-center justify-center bg-black/40 transition-opacity duration-150 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <p className="text-base font-semibold text-white">Drop to load new graph.</p>
    </div>
  )
}

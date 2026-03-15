interface Props {
  filename: string
}

/**
 * Displays the loaded filename in muted text, positioned top-left of the canvas.
 *
 * @param props - Component props with filename string.
 * @returns Filename label element.
 */
export function FilenameLabel({ filename }: Props): React.JSX.Element {
  return (
    <div
      className="absolute left-3 top-2 z-10 text-xs"
      style={{ color: '#94a3b8' }}
    >
      {filename}
    </div>
  )
}

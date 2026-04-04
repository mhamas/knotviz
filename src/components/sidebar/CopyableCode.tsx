import { useCallback, useState } from 'react'

interface Props {
  /** The code/text content to display and copy. */
  code: string
  /** Label shown above the code block. */
  label: string
}

/**
 * A pre-formatted code block with a one-click copy button.
 * Clicking the code block itself also copies. Shows "Copied!" feedback for 2 seconds.
 *
 * @param props - Code content and label.
 * @returns Copyable code block element.
 */
export function CopyableCode({ code, label }: Props): React.JSX.Element {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback((): void => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch(() => { /* Clipboard access may be denied in non-HTTPS contexts */ })
  }, [code])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <button
          onClick={handleCopy}
          className="cursor-pointer rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className="cursor-pointer overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 hover:bg-slate-100"
        onClick={handleCopy}
        title="Click to copy"
      >
        {code}
      </pre>
    </div>
  )
}

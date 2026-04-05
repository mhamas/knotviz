import { useEffect } from 'react'

/**
 * Toggles simulation on/off when the Space bar is pressed.
 * Ignores keypresses inside input, textarea, or select elements.
 *
 * @param isRunning - Whether the simulation is currently running.
 * @param start - Callback to start the simulation.
 * @param stop - Callback to stop the simulation.
 */
export function useSpacebarToggle(
  isRunning: boolean,
  start: () => void,
  stop: () => void,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (isRunning) {
        stop()
      } else {
        start()
      }
    }
    // Use capture phase on document so the handler fires before any element-level
    // listeners (e.g. canvas, buttons) can consume or interfere with the event.
    // preventDefault() in capture also suppresses native button-activation from Space.
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [isRunning, start, stop])
}

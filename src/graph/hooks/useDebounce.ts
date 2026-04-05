import { useEffect, useMemo, useRef } from 'react'

/**
 * Returns a stable debounced version of the given function.
 *
 * @param fn - Function to debounce.
 * @param delay - Debounce delay in milliseconds.
 * @returns Debounced function with stable identity across renders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 150): T {
  const fnRef = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep fn ref in sync via effect (React 19 disallows ref writes during render)
  useEffect(() => {
    fnRef.current = fn
  })

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => fnRef.current(...args), delay)
      }) as T,
    [delay],
  )
}

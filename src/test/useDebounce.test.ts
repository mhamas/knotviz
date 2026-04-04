import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('delays invocation by the specified delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 100))
    act(() => result.current(42))
    expect(fn).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).toHaveBeenCalledWith(42)
  })

  it('resets the timer on subsequent calls (only last call fires)', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 100))
    act(() => result.current('a'))
    act(() => { vi.advanceTimersByTime(50) })
    act(() => result.current('b'))
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('returns a stable function identity across renders', () => {
    const { result, rerender } = renderHook(
      ({ fn }) => useDebounce(fn, 100),
      { initialProps: { fn: vi.fn() } },
    )
    const first = result.current
    rerender({ fn: vi.fn() })
    expect(result.current).toBe(first)
  })

  it('cleans up timer on unmount', () => {
    const fn = vi.fn()
    const { result, unmount } = renderHook(() => useDebounce(fn, 100))
    act(() => result.current('x'))
    unmount()
    act(() => { vi.advanceTimersByTime(200) })
    expect(fn).not.toHaveBeenCalled()
  })
})

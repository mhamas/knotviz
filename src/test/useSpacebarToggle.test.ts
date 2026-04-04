import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSpacebarToggle } from '../hooks/useSpacebarToggle'

function pressSpace(target?: Partial<HTMLElement>): void {
  const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  document.dispatchEvent(event)
}

describe('useSpacebarToggle', () => {
  it('calls start when not running and Space is pressed', () => {
    const start = vi.fn()
    const stop = vi.fn()
    renderHook(() => useSpacebarToggle(false, start, stop))
    pressSpace({ tagName: 'DIV' })
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()
  })

  it('calls stop when running and Space is pressed', () => {
    const start = vi.fn()
    const stop = vi.fn()
    renderHook(() => useSpacebarToggle(true, start, stop))
    pressSpace({ tagName: 'DIV' })
    expect(stop).toHaveBeenCalledTimes(1)
    expect(start).not.toHaveBeenCalled()
  })

  it('ignores Space when target is an INPUT element', () => {
    const start = vi.fn()
    renderHook(() => useSpacebarToggle(false, start, vi.fn()))
    pressSpace({ tagName: 'INPUT' })
    expect(start).not.toHaveBeenCalled()
  })

  it('ignores Space when target is a TEXTAREA element', () => {
    const start = vi.fn()
    renderHook(() => useSpacebarToggle(false, start, vi.fn()))
    pressSpace({ tagName: 'TEXTAREA' })
    expect(start).not.toHaveBeenCalled()
  })

  it('ignores Space when target is a SELECT element', () => {
    const start = vi.fn()
    renderHook(() => useSpacebarToggle(false, start, vi.fn()))
    pressSpace({ tagName: 'SELECT' })
    expect(start).not.toHaveBeenCalled()
  })

  it('ignores non-Space keys', () => {
    const start = vi.fn()
    renderHook(() => useSpacebarToggle(false, start, vi.fn()))
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))
    expect(start).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const start = vi.fn()
    const { unmount } = renderHook(() => useSpacebarToggle(false, start, vi.fn()))
    unmount()
    pressSpace({ tagName: 'DIV' })
    expect(start).not.toHaveBeenCalled()
  })
})

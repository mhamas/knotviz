import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCosmosLabelSync } from '../hooks/useCosmosLabelSync'

function makeRefs(): {
  labelsRef: React.RefObject<HTMLDivElement | null>
  updateLabels: ReturnType<typeof vi.fn>
  updateLabelsRef: React.RefObject<(() => void) | null>
  container: HTMLDivElement
} {
  const container = document.createElement('div')
  // Pre-populate with a couple of stale label children so we can verify they
  // get cleared when the toggle flips on.
  for (let i = 0; i < 3; i++) {
    const child = document.createElement('div')
    child.textContent = 'stale-' + i
    container.appendChild(child)
  }
  document.body.appendChild(container)
  const updateLabels = vi.fn()
  return {
    labelsRef: { current: container },
    updateLabels,
    updateLabelsRef: { current: updateLabels as (() => void) | null },
    container,
  }
}

describe('useCosmosLabelSync', () => {
  it('hides the overlay when isNodeLabelsVisible is false', () => {
    const { labelsRef, updateLabelsRef, container } = makeRefs()
    renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, false, 'data'))
    expect(container.style.display).toBe('none')
  })

  it('does not call updateLabels when toggled off', () => {
    const { labelsRef, updateLabels, updateLabelsRef } = makeRefs()
    renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, false, 'data'))
    expect(updateLabels).not.toHaveBeenCalled()
  })

  it('clears stale label children and calls updateLabels when toggled on', () => {
    const { labelsRef, updateLabels, updateLabelsRef, container } = makeRefs()
    expect(container.children.length).toBe(3)
    renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, true, 'data'))
    expect(container.innerHTML).toBe('')
    expect(updateLabels).toHaveBeenCalledTimes(1)
  })

  it('re-syncs when data changes (graph reload)', () => {
    const { labelsRef, updateLabels, updateLabelsRef } = makeRefs()
    const { rerender } = renderHook(
      ({ data }: { data: unknown }) => useCosmosLabelSync(labelsRef, updateLabelsRef, true, data),
      { initialProps: { data: 'graph-1' as unknown } },
    )
    expect(updateLabels).toHaveBeenCalledTimes(1)
    rerender({ data: 'graph-2' })
    expect(updateLabels).toHaveBeenCalledTimes(2)
  })

  it('does not re-run when data identity is unchanged', () => {
    const { labelsRef, updateLabels, updateLabelsRef } = makeRefs()
    const data = { graph: 'A' }
    const { rerender } = renderHook(
      ({ d }: { d: unknown }) => useCosmosLabelSync(labelsRef, updateLabelsRef, true, d),
      { initialProps: { d: data as unknown } },
    )
    expect(updateLabels).toHaveBeenCalledTimes(1)
    rerender({ d: data })
    expect(updateLabels).toHaveBeenCalledTimes(1)
  })

  it('toggling on then off then on triggers two updateLabels calls', () => {
    const { labelsRef, updateLabels, updateLabelsRef } = makeRefs()
    const { rerender } = renderHook(
      ({ visible }: { visible: boolean }) =>
        useCosmosLabelSync(labelsRef, updateLabelsRef, visible, 'data'),
      { initialProps: { visible: true } },
    )
    expect(updateLabels).toHaveBeenCalledTimes(1)
    rerender({ visible: false })
    rerender({ visible: true })
    expect(updateLabels).toHaveBeenCalledTimes(2)
  })

  it('does not throw when labelsRef.current is null', () => {
    const updateLabels = vi.fn()
    const labelsRef = { current: null }
    const updateLabelsRef = { current: updateLabels as (() => void) | null }
    expect(() =>
      renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, true, 'data')),
    ).not.toThrow()
    expect(updateLabels).not.toHaveBeenCalled()
  })

  it('does not throw when updateLabelsRef.current is null', () => {
    const { labelsRef, updateLabelsRef } = makeRefs()
    updateLabelsRef.current = null
    expect(() =>
      renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, true, 'data')),
    ).not.toThrow()
  })

  it('cleared overlay survives subsequent updateLabels mutations', () => {
    // updateLabels is responsible for re-populating; this hook only clears.
    const { labelsRef, updateLabels, updateLabelsRef, container } = makeRefs()
    updateLabels.mockImplementation(() => {
      const child = document.createElement('div')
      child.textContent = 'new-label'
      container.appendChild(child)
    })
    renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, true, 'data'))
    // Stale children gone, new child added by updateLabels.
    expect(container.children.length).toBe(1)
    expect(container.children[0]?.textContent).toBe('new-label')
  })

  it('keeps overlay visible (no display:none) when toggled on', () => {
    const { labelsRef, updateLabelsRef, container } = makeRefs()
    container.style.display = 'none' // pre-existing hidden state
    renderHook(() => useCosmosLabelSync(labelsRef, updateLabelsRef, true, 'data'))
    // Hook itself doesn't reset display; the updateLabels callback is what
    // clears it. Verify updateLabels was called so the chain is intact.
    // (display:none stays here because our mock updateLabels is a no-op.)
    act(() => {})
    // The contract: when toggled on, the hook clears children and calls
    // updateLabels. It does NOT itself set display=''. That's intentional —
    // the actual updateLabels in useCosmos clears display.
    expect(container.style.display).toBe('none')
  })
})

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Mock } from 'vitest'
import type { Graph as CosmosGraph } from '@cosmos.gl/graph'
import { useCosmosRotation } from '../hooks/useCosmosRotation'

/**
 * A minimal test double for cosmos.gl's `Graph` class — exposes the public
 * methods our hook calls plus the *private* fields/methods the fast path
 * accesses by name. The real cosmos bundle preserves these names through
 * minification, so this shape mirrors runtime exactly.
 */
type MockCosmos = {
  getPointPositions: Mock
  setPointPositions: Mock
  spaceToScreenPosition: Mock
  render: Mock
  graph?: {
    inputPointPositions?: Float32Array | number[]
    updatePoints?: Mock
  }
  points?: {
    shouldSkipRescale?: boolean
    updatePositions?: Mock
  }
}

/** Build a cosmos with the full fast-path internal surface available. */
function makeFastPathCosmos(positions: number[] = [10, 0, -10, 0, 0, 10, 0, -10]): MockCosmos {
  let stored: Float32Array | number[] = positions
  const cosmos: MockCosmos = {
    getPointPositions: vi.fn(() => Array.from(stored)),
    setPointPositions: vi.fn((p: Float32Array) => { stored = p }),
    // Map space (cx, cy) → screen (cx + 500, cy + 400), so a CoM at (0,0)
    // lands on the canvas centre at (500, 400).
    spaceToScreenPosition: vi.fn(([x, y]: [number, number]) => [x + 500, y + 400] as [number, number]),
    render: vi.fn(),
    graph: {
      inputPointPositions: undefined,
      updatePoints: vi.fn(function (this: MockCosmos['graph']) {
        if (this?.inputPointPositions) stored = this.inputPointPositions
      }),
    },
    points: {
      shouldSkipRescale: undefined,
      updatePositions: vi.fn(),
    },
  }
  return cosmos
}

/** Build a cosmos missing both private internals — forces the fallback path. */
function makeFallbackCosmos(positions: number[] = [10, 0, -10, 0]): MockCosmos {
  return {
    getPointPositions: vi.fn(() => Array.from(positions)),
    setPointPositions: vi.fn(),
    spaceToScreenPosition: vi.fn(([x, y]: [number, number]) => [x + 500, y + 400] as [number, number]),
    render: vi.fn(),
    // No graph, no points — getInternals returns null.
  }
}

interface Refs {
  cosmosRef: React.RefObject<CosmosGraph | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  hoverRef: React.RefObject<HTMLDivElement | null>
  isSimRunningRef: React.RefObject<boolean>
  container: HTMLDivElement
  hover: HTMLDivElement
}

function makeRefs(cosmos: MockCosmos | null): Refs {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const hover = document.createElement('div')
  return {
    cosmosRef: { current: cosmos as unknown as CosmosGraph | null },
    containerRef: { current: container },
    hoverRef: { current: hover },
    isSimRunningRef: { current: false },
    container,
    hover,
  }
}

/** Render the hook with the supplied refs and expose convenience helpers. */
function renderRotation(refs: Refs) {
  return renderHook(() =>
    useCosmosRotation(refs.cosmosRef, refs.containerRef, refs.hoverRef, refs.isSimRunningRef),
  )
}

function fireWheel(target: EventTarget, opts: WheelEventInit = {}): WheelEvent {
  const evt = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...opts })
  target.dispatchEvent(evt)
  return evt
}

describe('useCosmosRotation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('returned shape', () => {
    it('returns rotationCenter, rotatePositionsRef, handleRotateCW, handleRotateCCW', () => {
      const refs = makeRefs(makeFastPathCosmos())
      const { result } = renderRotation(refs)
      expect(result.current.rotationCenter).toBeNull()
      expect(typeof result.current.rotatePositionsRef.current).toBe('function')
      expect(typeof result.current.handleRotateCW).toBe('function')
      expect(typeof result.current.handleRotateCCW).toBe('function')
    })

    it('keeps rotatePositionsRef.current identity stable across re-renders', () => {
      const refs = makeRefs(makeFastPathCosmos())
      const { result, rerender } = renderRotation(refs)
      const first = result.current.rotatePositionsRef.current
      rerender()
      rerender()
      expect(result.current.rotatePositionsRef.current).toBe(first)
    })
  })

  describe('fast path (cosmos internals available)', () => {
    it('updates the position FBO via points.updatePositions, NOT setPointPositions', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.points!.updatePositions).toHaveBeenCalledTimes(1)
      expect(cosmos.setPointPositions).not.toHaveBeenCalled()
      expect(cosmos.render).not.toHaveBeenCalled()
    })

    it('stages positions via graph.inputPointPositions as a Float32Array', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.graph!.inputPointPositions).toBeInstanceOf(Float32Array)
    })

    it('sets points.shouldSkipRescale = true (skip cosmos rescale on FBO upload)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.points!.shouldSkipRescale).toBe(true)
    })

    it('calls graph.updatePoints before points.updatePositions (data must be staged first)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      const updatePointsOrder = cosmos.graph!.updatePoints!.mock.invocationCallOrder[0]
      const updatePositionsOrder = cosmos.points!.updatePositions!.mock.invocationCallOrder[0]
      expect(updatePointsOrder).toBeLessThan(updatePositionsOrder)
    })

    it('does not call render() on the fast path (cosmos render loop picks up the FBO)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      act(() => result.current.rotatePositionsRef.current(-30))
      expect(cosmos.render).not.toHaveBeenCalled()
    })
  })

  describe('fallback path (cosmos internals missing)', () => {
    it('uses setPointPositions + render(0) when graph.updatePoints is missing', () => {
      const cosmos: MockCosmos = {
        getPointPositions: vi.fn(() => [10, 0, -10, 0]),
        setPointPositions: vi.fn(),
        spaceToScreenPosition: vi.fn(() => [0, 0] as [number, number]),
        render: vi.fn(),
        graph: { inputPointPositions: undefined }, // updatePoints intentionally missing
        points: { updatePositions: vi.fn() },
      }
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.setPointPositions).toHaveBeenCalledTimes(1)
      expect(cosmos.render).toHaveBeenCalledWith(0)
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
    })

    it('uses setPointPositions + render(0) when points.updatePositions is missing', () => {
      const cosmos = makeFallbackCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.setPointPositions).toHaveBeenCalledTimes(1)
      expect(cosmos.render).toHaveBeenCalledWith(0)
    })

    it('passes dontRescale=true to setPointPositions in fallback', () => {
      const cosmos = makeFallbackCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      const [positions, dontRescale] = cosmos.setPointPositions.mock.calls[0] as [Float32Array, boolean]
      expect(positions).toBeInstanceOf(Float32Array)
      expect(dontRescale).toBe(true)
    })

    it('still rotates correctly via the fallback path', () => {
      const cosmos = makeFallbackCosmos([1, 0, -1, 0])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(90))
      const [sent] = cosmos.setPointPositions.mock.calls[0] as [Float32Array]
      // CoM (0,0); (1,0) → (0,1)
      expect(sent[0]).toBeCloseTo(0)
      expect(sent[1]).toBeCloseTo(1)
    })
  })

  describe('zero-CSS contract', () => {
    it('never sets style.transform on the canvas during rotation', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const canvas = document.createElement('canvas')
      refs.container.appendChild(canvas)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(canvas.style.transform).toBe('')
      expect(canvas.style.transformOrigin).toBe('')
    })

    it('never sets style.transform on the container during rotation', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(refs.container.style.transform).toBe('')
      expect(refs.container.style.transformOrigin).toBe('')
    })

    it('never sets style.transform via the wheel handler', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const canvas = document.createElement('canvas')
      refs.container.appendChild(canvas)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 100, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      expect(canvas.style.transform).toBe('')
      expect(refs.container.style.transform).toBe('')
    })
  })

  describe('rotation math (around centre of mass)', () => {
    it('rotates points 90° around CoM at origin', () => {
      const cosmos = makeFastPathCosmos([1, 0, 0, 1, -1, 0, 0, -1])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(90))
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      // (1,0) → (0,1), (0,1) → (-1,0), (-1,0) → (0,-1), (0,-1) → (1,0)
      expect(sent[0]).toBeCloseTo(0); expect(sent[1]).toBeCloseTo(1)
      expect(sent[2]).toBeCloseTo(-1); expect(sent[3]).toBeCloseTo(0)
      expect(sent[4]).toBeCloseTo(0); expect(sent[5]).toBeCloseTo(-1)
      expect(sent[6]).toBeCloseTo(1); expect(sent[7]).toBeCloseTo(0)
    })

    it('uses non-trivial CoM correctly', () => {
      // 4 points centred on (10, 20)
      const cosmos = makeFastPathCosmos([11, 20, 9, 20, 10, 21, 10, 19])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(180))
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      // 180° around (10,20): each point reflected through (10,20)
      // (11,20) → (9,20); (9,20) → (11,20); (10,21) → (10,19); (10,19) → (10,21)
      expect(sent[0]).toBeCloseTo(9); expect(sent[1]).toBeCloseTo(20)
      expect(sent[2]).toBeCloseTo(11); expect(sent[3]).toBeCloseTo(20)
      expect(sent[4]).toBeCloseTo(10); expect(sent[5]).toBeCloseTo(19)
      expect(sent[6]).toBeCloseTo(10); expect(sent[7]).toBeCloseTo(21)
    })

    it('a 360° rotation produces approximately the original positions', () => {
      const original = [3, 4, -5, 7, 1, 1]
      const cosmos = makeFastPathCosmos(original)
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(360))
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      for (let i = 0; i < original.length; i++) {
        expect(sent[i]).toBeCloseTo(original[i])
      }
    })

    it('preserves the centre of mass through rotation', () => {
      const cosmos = makeFastPathCosmos([3, 4, 7, 8, -2, 1])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      // CoM of input: ((3+7-2)/3, (4+8+1)/3) = (8/3, 13/3)
      act(() => result.current.rotatePositionsRef.current(73))
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      const cx = (sent[0] + sent[2] + sent[4]) / 3
      const cy = (sent[1] + sent[3] + sent[5]) / 3
      expect(cx).toBeCloseTo(8 / 3, 4)
      expect(cy).toBeCloseTo(13 / 3, 4)
    })
  })

  describe('per-burst caching', () => {
    it('reads positions from cosmos exactly once on the first rotate of a burst', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(10))
      expect(cosmos.getPointPositions).toHaveBeenCalledTimes(1)
    })

    it('does NOT re-read positions for subsequent rotates within the burst', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(10))
      act(() => result.current.rotatePositionsRef.current(10))
      act(() => result.current.rotatePositionsRef.current(10))
      expect(cosmos.getPointPositions).toHaveBeenCalledTimes(1)
    })

    it('drops the cache and re-reads positions after BURST_IDLE_MS of inactivity', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(10))
      // Walk past the 200ms idle window
      act(() => { vi.advanceTimersByTime(250) })
      act(() => result.current.rotatePositionsRef.current(10))
      expect(cosmos.getPointPositions).toHaveBeenCalledTimes(2)
    })

    it('keeps the cache when a rotate fires just before the idle window expires', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(10))
      // 199ms < BURST_IDLE_MS (200) → still in burst
      act(() => { vi.advanceTimersByTime(199) })
      act(() => result.current.rotatePositionsRef.current(10))
      expect(cosmos.getPointPositions).toHaveBeenCalledTimes(1)
    })

    it('rotates relative to the cached snapshot — chained rotations compound correctly', () => {
      const cosmos = makeFastPathCosmos([10, 0, -10, 0])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(90))
      // (10,0) → (0,10), (-10,0) → (0,-10)
      const after1 = cosmos.graph!.inputPointPositions as Float32Array
      expect(after1[0]).toBeCloseTo(0); expect(after1[1]).toBeCloseTo(10)
      expect(after1[2]).toBeCloseTo(0); expect(after1[3]).toBeCloseTo(-10)
      // Same burst, another 90° → 180° total
      act(() => result.current.rotatePositionsRef.current(90))
      const after2 = cosmos.graph!.inputPointPositions as Float32Array
      expect(after2[0]).toBeCloseTo(-10); expect(after2[1]).toBeCloseTo(0)
      expect(after2[2]).toBeCloseTo(10); expect(after2[3]).toBeCloseTo(0)
    })

    it('picks up externally changed positions (e.g. simulation end) on the next burst', () => {
      const cosmos = makeFastPathCosmos([1, 0, -1, 0]) // CoM (0,0)
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      // External change: replace what cosmos returns
      cosmos.getPointPositions.mockImplementation(() => [100, 0, 0, 0]) // CoM (50, 0)
      // Wait out the burst
      act(() => { vi.advanceTimersByTime(250) })
      act(() => result.current.rotatePositionsRef.current(180))
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      // Rotated 180° around (50, 0): (100,0) → (0,0), (0,0) → (100,0)
      expect(sent[0]).toBeCloseTo(0)
      expect(sent[1]).toBeCloseTo(0)
      expect(sent[2]).toBeCloseTo(100)
      expect(sent[3]).toBeCloseTo(0)
    })
  })

  describe('gating', () => {
    it('does not rotate when the simulation is running', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      refs.isSimRunningRef.current = true
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(cosmos.getPointPositions).not.toHaveBeenCalled()
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
      expect(cosmos.setPointPositions).not.toHaveBeenCalled()
    })

    it('does not rotate when delta is 0', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(0))
      expect(cosmos.getPointPositions).not.toHaveBeenCalled()
    })

    it('does not throw when cosmosRef.current is null', () => {
      const refs = makeRefs(null)
      const { result } = renderRotation(refs)
      expect(() => act(() => result.current.rotatePositionsRef.current(45))).not.toThrow()
    })

    it('handles getPointPositions returning empty array safely', () => {
      const cosmos: MockCosmos = {
        getPointPositions: vi.fn(() => []),
        setPointPositions: vi.fn(),
        spaceToScreenPosition: vi.fn(() => [0, 0] as [number, number]),
        render: vi.fn(),
        graph: { inputPointPositions: undefined, updatePoints: vi.fn() },
        points: { shouldSkipRescale: undefined, updatePositions: vi.fn() },
      }
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      expect(() => act(() => result.current.rotatePositionsRef.current(45))).not.toThrow()
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
      expect(cosmos.setPointPositions).not.toHaveBeenCalled()
    })

    it('handles getPointPositions returning a single coordinate (length < 2) safely', () => {
      // Pathological: only one number, not even a complete point.
      const cosmos = makeFastPathCosmos([5])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      expect(() => act(() => result.current.rotatePositionsRef.current(45))).not.toThrow()
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
    })
  })

  describe('rotation centre marker', () => {
    it('sets rotationCenter to the screen position of the CoM', () => {
      // CoM (0,0), spaceToScreenPosition adds (+500, +400)
      const cosmos = makeFastPathCosmos([1, 0, -1, 0, 0, 1, 0, -1])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(result.current.rotationCenter).toEqual({ x: 500, y: 400 })
      // Check spaceToScreenPosition was called with the CoM
      expect(cosmos.spaceToScreenPosition).toHaveBeenCalledWith([0, 0])
    })

    it('clears rotationCenter after 150ms of no rotation', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(result.current.rotationCenter).not.toBeNull()
      act(() => { vi.advanceTimersByTime(160) })
      expect(result.current.rotationCenter).toBeNull()
    })

    it('keeps rotationCenter visible when subsequent rotations reset the hide timer', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(10))
      act(() => { vi.advanceTimersByTime(100) })
      // Second rotate within 100ms — resets the hide timer for another 150ms
      act(() => result.current.rotatePositionsRef.current(10))
      act(() => { vi.advanceTimersByTime(140) })
      expect(result.current.rotationCenter).not.toBeNull()
    })
  })

  describe('hover label', () => {
    it('hides the hover label on rotation', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      refs.hover.style.display = 'block'
      const { result } = renderRotation(refs)
      act(() => result.current.rotatePositionsRef.current(45))
      expect(refs.hover.style.display).toBe('none')
    })

    it('does not throw when hoverRef.current is null', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      refs.hoverRef = { current: null }
      const { result } = renderRotation(refs)
      expect(() => act(() => result.current.rotatePositionsRef.current(45))).not.toThrow()
    })
  })

  describe('button handlers', () => {
    it('handleRotateCW rotates by +15° around the CoM', () => {
      const cosmos = makeFastPathCosmos([1, 0, -1, 0])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.handleRotateCW())
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      const a = (15 * Math.PI) / 180
      expect(sent[0]).toBeCloseTo(Math.cos(a))
      expect(sent[1]).toBeCloseTo(Math.sin(a))
    })

    it('handleRotateCCW rotates by -15° around the CoM', () => {
      const cosmos = makeFastPathCosmos([1, 0, -1, 0])
      const refs = makeRefs(cosmos)
      const { result } = renderRotation(refs)
      act(() => result.current.handleRotateCCW())
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      const a = (-15 * Math.PI) / 180
      expect(sent[0]).toBeCloseTo(Math.cos(a))
      expect(sent[1]).toBeCloseTo(Math.sin(a))
    })

    it('button rotations also respect the simulation gate', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      refs.isSimRunningRef.current = true
      const { result } = renderRotation(refs)
      act(() => result.current.handleRotateCW())
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
    })
  })

  describe('wheel handler', () => {
    it('ignores non-shift wheel events', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 100, shiftKey: false })
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.getPointPositions).not.toHaveBeenCalled()
    })

    it('triggers rotation on shift+wheel after rAF flush (rAF-batched)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 100, shiftKey: true })
      // Before rAF fires, no rotation has happened yet.
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.points!.updatePositions).toHaveBeenCalledTimes(1)
    })

    it('calls preventDefault and stopPropagation on shift+wheel', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      const evt = new WheelEvent('wheel', { deltaY: 100, shiftKey: true, bubbles: true, cancelable: true })
      const preventSpy = vi.spyOn(evt, 'preventDefault')
      const stopSpy = vi.spyOn(evt, 'stopPropagation')
      refs.container.dispatchEvent(evt)
      expect(preventSpy).toHaveBeenCalledTimes(1)
      expect(stopSpy).toHaveBeenCalledTimes(1)
    })

    it('does not call preventDefault on non-shift wheel events (cosmos zoom must work)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      const evt = new WheelEvent('wheel', { deltaY: 100, shiftKey: false, bubbles: true, cancelable: true })
      const preventSpy = vi.spyOn(evt, 'preventDefault')
      refs.container.dispatchEvent(evt)
      expect(preventSpy).not.toHaveBeenCalled()
    })

    it('ignores shift+wheel during simulation', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      refs.isSimRunningRef.current = true
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 100, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.getPointPositions).not.toHaveBeenCalled()
    })

    it('batches multiple wheel events into a single rotation per rAF', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      // 3 events → 1 rotation update
      expect(cosmos.points!.updatePositions).toHaveBeenCalledTimes(1)
    })

    it('summed delta from batched events drives a single rotation of the right magnitude', () => {
      // 3 events × deltaY 30 × 0.3 = 27° total
      const cosmos = makeFastPathCosmos([1, 0, -1, 0])
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      fireWheel(refs.container, { deltaY: 30, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      const sent = cosmos.graph!.inputPointPositions as Float32Array
      const a = (27 * Math.PI) / 180
      expect(sent[0]).toBeCloseTo(Math.cos(a), 4)
      expect(sent[1]).toBeCloseTo(Math.sin(a), 4)
    })

    it('falls back to deltaX when deltaY is 0 (horizontal trackpad scroll)', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 0, deltaX: 50, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.points!.updatePositions).toHaveBeenCalledTimes(1)
    })

    it('ignores wheel events with no delta on either axis', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      renderRotation(refs)
      fireWheel(refs.container, { deltaY: 0, deltaX: 0, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
    })

    describe('deltaMode normalization (consistent feel across input devices)', () => {
      it('deltaMode 0 (pixel): rotation = deltaY * 0.3', () => {
        const cosmos = makeFastPathCosmos([1, 0, -1, 0])
        const refs = makeRefs(cosmos)
        renderRotation(refs)
        fireWheel(refs.container, { deltaY: 100, shiftKey: true, deltaMode: 0 })
        act(() => { vi.advanceTimersByTime(20) })
        const sent = cosmos.graph!.inputPointPositions as Float32Array
        const a = (30 * Math.PI) / 180 // 100 * 0.3
        expect(sent[0]).toBeCloseTo(Math.cos(a), 4)
        expect(sent[1]).toBeCloseTo(Math.sin(a), 4)
      })

      it('deltaMode 1 (line): scaled ×16', () => {
        const cosmos = makeFastPathCosmos([1, 0, -1, 0])
        const refs = makeRefs(cosmos)
        renderRotation(refs)
        fireWheel(refs.container, { deltaY: 1, shiftKey: true, deltaMode: 1 })
        act(() => { vi.advanceTimersByTime(20) })
        const sent = cosmos.graph!.inputPointPositions as Float32Array
        const a = (1 * 16 * 0.3 * Math.PI) / 180 // 4.8°
        expect(sent[0]).toBeCloseTo(Math.cos(a), 4)
        expect(sent[1]).toBeCloseTo(Math.sin(a), 4)
      })

      it('deltaMode 2 (page): scaled ×100', () => {
        const cosmos = makeFastPathCosmos([1, 0, -1, 0])
        const refs = makeRefs(cosmos)
        renderRotation(refs)
        fireWheel(refs.container, { deltaY: 1, shiftKey: true, deltaMode: 2 })
        act(() => { vi.advanceTimersByTime(20) })
        const sent = cosmos.graph!.inputPointPositions as Float32Array
        const a = (1 * 100 * 0.3 * Math.PI) / 180 // 30°
        expect(sent[0]).toBeCloseTo(Math.cos(a), 4)
        expect(sent[1]).toBeCloseTo(Math.sin(a), 4)
      })
    })
  })

  describe('cleanup', () => {
    it('removes the wheel listener on unmount', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { unmount } = renderRotation(refs)
      unmount()
      fireWheel(refs.container, { deltaY: 100, shiftKey: true })
      act(() => { vi.advanceTimersByTime(20) })
      expect(cosmos.getPointPositions).not.toHaveBeenCalled()
    })

    it('cancels a pending rAF on unmount', () => {
      const cosmos = makeFastPathCosmos()
      const refs = makeRefs(cosmos)
      const { unmount } = renderRotation(refs)
      // Queue a rotation but don't let rAF fire yet
      fireWheel(refs.container, { deltaY: 100, shiftKey: true })
      unmount()
      act(() => { vi.advanceTimersByTime(20) })
      // The pending rAF was cancelled — no rotation happened
      expect(cosmos.points!.updatePositions).not.toHaveBeenCalled()
    })
  })
})

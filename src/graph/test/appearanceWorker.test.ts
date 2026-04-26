/**
 * Contract test for the appearance worker's requestId echo. Guards the
 * race fix in `useCosmos`: rapid filter/search input queues N updates;
 * only the latest reply should land on cosmos. The hook drops stale
 * replies by id, which only works if the worker honours the protocol —
 * this test pins that contract.
 *
 * The worker uses `self.onmessage` / `self.postMessage` at module scope.
 * We hijack both on globalThis before importing the module, capture the
 * handler, and drive it with synthetic message events.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

interface UpdateMessageInput {
  type: 'update'
  nodeCount: number
  filters: Record<string, never>
  gradientConfig: {
    propertyKey: string | null
    paletteStops: string[]
    propType: string | null
    visualMode: 'color' | 'size'
    sizeRange: [number, number]
    isLogScale: boolean
  }
  statsConfig: { propertyKey: string | null; propertyType: null }
  defaultRgba: [number, number, number, number]
  edgeRgba: [number, number, number, number]
  searchQuery: string
  requestId: number
}

function makeUpdate(overrides: Partial<UpdateMessageInput> = {}): UpdateMessageInput {
  return {
    type: 'update',
    nodeCount: 2,
    filters: {},
    gradientConfig: {
      propertyKey: null,
      paletteStops: [],
      propType: null,
      visualMode: 'color',
      sizeRange: [4, 16],
      isLogScale: false,
    },
    statsConfig: { propertyKey: null, propertyType: null },
    defaultRgba: [0.5, 0.5, 0.5, 1],
    edgeRgba: [0.3, 0.3, 0.3, 1],
    searchQuery: '',
    requestId: 1,
    ...overrides,
  }
}

describe('appearanceWorker requestId echo', () => {
  const postMessageSpy = vi.fn()
  let handler: (e: { data: unknown }) => void

  beforeAll(async () => {
    let captured: ((e: { data: unknown }) => void) | null = null
    Object.defineProperty(globalThis, 'postMessage', {
      value: (...args: unknown[]) => postMessageSpy(...args),
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'onmessage', {
      set(h: typeof captured) { captured = h },
      configurable: true,
    })
    await import('../workers/appearanceWorker')
    if (!captured) throw new Error('worker did not register onmessage')
    handler = captured
  })

  beforeEach(() => {
    postMessageSpy.mockClear()
    handler({
      data: {
        type: 'init',
        propertyColumns: {},
        linkIndices: new Float32Array(0),
        nodeLabels: ['Alice', 'Bob'],
        nodeIds: ['a', 'b'],
      },
    })
  })

  it('echoes the update requestId in the reply', () => {
    postMessageSpy.mockClear()
    handler({ data: makeUpdate({ requestId: 42 }) })
    expect(postMessageSpy).toHaveBeenCalledOnce()
    expect(postMessageSpy.mock.calls[0][0]).toMatchObject({ requestId: 42 })
  })

  it('updateLinks reply carries the updateLinks requestId, not the cached update id', () => {
    handler({ data: makeUpdate({ requestId: 10 }) })
    postMessageSpy.mockClear()
    handler({
      data: { type: 'updateLinks', linkIndices: new Float32Array(0), requestId: 20 },
    })
    expect(postMessageSpy).toHaveBeenCalledOnce()
    expect(postMessageSpy.mock.calls[0][0]).toMatchObject({ requestId: 20 })
  })

  it('init does not produce a reply', () => {
    // beforeEach posted an init; no reply should have followed
    expect(postMessageSpy).not.toHaveBeenCalled()
  })

  it('updateLinks before any update does not reply (no cached params)', () => {
    postMessageSpy.mockClear()
    handler({
      data: { type: 'updateLinks', linkIndices: new Float32Array(0), requestId: 99 },
    })
    expect(postMessageSpy).not.toHaveBeenCalled()
  })
})

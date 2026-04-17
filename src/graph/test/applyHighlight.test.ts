import { describe, it, expect } from 'vitest'
import { applyDimming, computeLinkColors } from '../lib/applyHighlight'

describe('applyDimming', () => {
  it('multiplies alpha of visible non-highlighted nodes by dimAlpha', () => {
    // 3 nodes, all filter-visible, only node 1 is highlighted
    const pointColors = new Float32Array([
      0.5, 0.6, 0.7, 1.0, // node 0 (not highlighted → dim)
      0.1, 0.2, 0.3, 1.0, // node 1 (highlighted → keep)
      0.9, 0.8, 0.7, 1.0, // node 2 (not highlighted → dim)
    ])
    const visible = new Uint8Array([1, 1, 1])
    const highlighted = new Uint8Array([0, 1, 0])
    applyDimming(pointColors, visible, highlighted, 3, 0.1)
    expect(pointColors[3]).toBeCloseTo(0.1)  // node 0 alpha dimmed
    expect(pointColors[7]).toBe(1.0)         // node 1 alpha unchanged
    expect(pointColors[11]).toBeCloseTo(0.1) // node 2 alpha dimmed
    // RGB untouched
    expect(pointColors[0]).toBeCloseTo(0.5)
    expect(pointColors[4]).toBeCloseTo(0.1)
    expect(pointColors[8]).toBeCloseTo(0.9)
  })

  it('does not touch filter-hidden nodes (visible=0)', () => {
    const pointColors = new Float32Array([0, 0, 0, 0, 0.5, 0.5, 0.5, 1.0])
    const visible = new Uint8Array([0, 1])
    const highlighted = new Uint8Array([0, 0])
    applyDimming(pointColors, visible, highlighted, 2, 0.1)
    expect(pointColors[3]).toBe(0)           // hidden node stays alpha=0
    expect(pointColors[7]).toBeCloseTo(0.1)  // visible non-highlighted dimmed
  })

  it('is a no-op when every visible node is highlighted', () => {
    const pointColors = new Float32Array([0.5, 0.5, 0.5, 1.0, 0.2, 0.2, 0.2, 1.0])
    const visible = new Uint8Array([1, 1])
    const highlighted = new Uint8Array([1, 1])
    applyDimming(pointColors, visible, highlighted, 2, 0.1)
    expect(pointColors[3]).toBe(1.0)
    expect(pointColors[7]).toBe(1.0)
  })
})

describe('computeLinkColors', () => {
  const edgeRgba: [number, number, number, number] = [0.8, 0.8, 0.8, 1.0]

  it('without highlight: colors links whose endpoints are both filter-visible', () => {
    // 3 nodes, all filter-visible. 2 links: 0↔1, 0↔2
    const linkIndices = new Float32Array([0, 1, 0, 2])
    const visible = new Uint8Array([1, 1, 1])
    const out = new Float32Array(2 * 4)
    computeLinkColors(out, linkIndices, visible, null, 2, edgeRgba)
    expect(out[0]).toBeCloseTo(0.8)
    expect(out[3]).toBe(1.0)
    expect(out[4]).toBeCloseTo(0.8)
    expect(out[7]).toBe(1.0)
  })

  it('without highlight: hides links where an endpoint is filter-hidden', () => {
    const linkIndices = new Float32Array([0, 1])
    const visible = new Uint8Array([1, 0])
    const out = new Float32Array(4)
    computeLinkColors(out, linkIndices, visible, null, 1, edgeRgba)
    expect(Array.from(out)).toEqual([0, 0, 0, 0])
  })

  it('with highlight: shows link when both endpoints highlighted', () => {
    const linkIndices = new Float32Array([0, 1])
    const visible = new Uint8Array([1, 1])
    const highlighted = new Uint8Array([1, 1])
    const out = new Float32Array(4)
    computeLinkColors(out, linkIndices, visible, highlighted, 1, edgeRgba)
    expect(out[0]).toBeCloseTo(0.8)
    expect(out[1]).toBeCloseTo(0.8)
    expect(out[2]).toBeCloseTo(0.8)
    expect(out[3]).toBe(1.0)
  })

  it('with highlight: shows link when exactly one endpoint highlighted', () => {
    const linkIndices = new Float32Array([0, 1])
    const visible = new Uint8Array([1, 1])
    const highlighted = new Uint8Array([1, 0])
    const out = new Float32Array(4)
    computeLinkColors(out, linkIndices, visible, highlighted, 1, edgeRgba)
    expect(out[0]).toBeCloseTo(0.8)
    expect(out[1]).toBeCloseTo(0.8)
    expect(out[2]).toBeCloseTo(0.8)
    expect(out[3]).toBe(1.0)
  })

  it('with highlight: hides link when neither endpoint highlighted', () => {
    const linkIndices = new Float32Array([0, 1])
    const visible = new Uint8Array([1, 1])
    const highlighted = new Uint8Array([0, 0])
    const out = new Float32Array(4)
    computeLinkColors(out, linkIndices, visible, highlighted, 1, edgeRgba)
    expect(Array.from(out)).toEqual([0, 0, 0, 0])
  })

  it('with highlight: hides link with filter-hidden endpoint even if other is highlighted', () => {
    const linkIndices = new Float32Array([0, 1])
    const visible = new Uint8Array([1, 0])
    const highlighted = new Uint8Array([1, 1]) // node 1 wouldn't pass visible anyway
    const out = new Float32Array(4)
    computeLinkColors(out, linkIndices, visible, highlighted, 1, edgeRgba)
    expect(Array.from(out)).toEqual([0, 0, 0, 0])
  })
})

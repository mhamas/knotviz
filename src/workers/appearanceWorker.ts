/**
 * Web Worker that builds Float32Arrays for node colors, sizes, and link colors.
 * Runs off the main thread so filtering/coloring doesn't freeze the UI.
 *
 * Input message: { nodeRgba, visible, linkIndices, edgeRgba, hasActiveFilters }
 * Output message: { pointColors, pointSizes, linkColors } (transferred, zero-copy)
 */

interface WorkerInput {
  /** Pre-built RGBA for each node [r,g,b,a, r,g,b,a, ...] (n*4). Visible nodes have their color, hidden nodes have 0,0,0,0. */
  nodeRgba: Float32Array
  /** 1 = visible, 0 = hidden. Length = nodeCount. null if no filters active. */
  visible: Uint8Array | null
  /** Link source/target index pairs [src,tgt, src,tgt, ...] */
  linkIndices: Float32Array
  /** Default edge RGBA [r,g,b,a] */
  edgeRgba: [number, number, number, number]
  /** Whether any filter is active */
  hasActiveFilters: boolean
}

self.onmessage = (e: MessageEvent<WorkerInput>): void => {
  const { nodeRgba, visible, linkIndices, edgeRgba, hasActiveFilters } = e.data
  const nodeCount = nodeRgba.length / 4

  // Point sizes: 4 for visible, 0 for hidden
  const pointSizes = new Float32Array(nodeCount)
  if (visible) {
    for (let i = 0; i < nodeCount; i++) {
      pointSizes[i] = visible[i] ? 4 : 0
    }
  } else {
    pointSizes.fill(4)
  }

  // Link colors: visible edges get edgeRgba, hidden edges stay 0,0,0,0
  let linkColors: Float32Array
  if (hasActiveFilters && visible) {
    const linkCount = linkIndices.length / 2
    linkColors = new Float32Array(linkCount * 4)
    const [er0, er1, er2, er3] = edgeRgba
    for (let i = 0; i < linkCount; i++) {
      if (visible[linkIndices[i * 2]] && visible[linkIndices[i * 2 + 1]]) {
        const off = i * 4
        linkColors[off] = er0
        linkColors[off + 1] = er1
        linkColors[off + 2] = er2
        linkColors[off + 3] = er3
      }
    }
  } else {
    linkColors = new Float32Array(0)
  }

  // Transfer ownership (zero-copy)
  const msg = { pointColors: nodeRgba, pointSizes, linkColors }
  const transfer = [msg.pointColors.buffer, msg.pointSizes.buffer, msg.linkColors.buffer]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)(msg, transfer)
}

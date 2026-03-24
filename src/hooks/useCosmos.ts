import { useCallback, useEffect, useRef, useState } from 'react'
import { Graph as CosmosGraph } from '@cosmos.gl/graph'
import type { GraphConfigInterface } from '@cosmos.gl/graph'
import type { CosmosGraphData, ColorGradientState, FilterMap, PropertyType, PropertyStatsResult, TooltipState } from '../types'
import type { PropertyColumns } from './useFilterState'
import { getPaletteColors, isBuiltinPalette } from '@/lib/colorScales'
import { useGraphStore } from '@/stores/useGraphStore'
import { COLOR_DEFAULT, COLOR_EDGE_DEFAULT } from '@/lib/colors'
import AppearanceWorker from '@/workers/appearanceWorker?worker'

/** Max number of node labels rendered as HTML overlays. */
const MAX_LABELS = 300

/** Parse a hex color string to normalized [r, g, b, a] (all 0.0–1.0). Cached. */
const rgbaCache = new Map<string, [number, number, number, number]>()
function hexToRgba(hex: string): [number, number, number, number] {
  let cached = rgbaCache.get(hex)
  if (cached) return cached
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  cached = [r, g, b, 1]
  rgbaCache.set(hex, cached)
  return cached
}

/** Generate random positions for n nodes in [-2048, 2048] range. */
function generateRandomPositions(n: number): Float32Array {
  const positions = new Float32Array(n * 2)
  for (let i = 0; i < n * 2; i++) {
    positions[i] = (Math.random() - 0.5) * 4096
  }
  return positions
}

export interface UseCosmosReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  labelsRef: React.RefObject<HTMLDivElement | null>
  tooltipState: TooltipState | null
  closeTooltip: () => void
  hoverRef: React.RefObject<HTMLDivElement | null>
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleFit: () => void
  handleRotateCW: () => void
  handleRotateCCW: () => void
  rotationCenter: { x: number; y: number } | null
  isSimulationRunning: boolean
  matchingCount: number
  propertyStats: PropertyStatsResult | null
  startSimulation: () => void
  stopSimulation: () => void
  pauseSimulation: () => void
  randomizePositions: () => void
  cosmosRef: React.RefObject<CosmosGraph | null>
}

/**
 * Manages the @cosmos.gl/graph instance lifecycle: init/destroy,
 * node/link data, colors, sizes, events, camera controls, and simulation.
 *
 * @param data - The CosmosGraphData to render.
 * @param nodeColors - Per-node color map (nodeId → hex).
 * @returns Cosmos container ref, tooltip state, camera controls, simulation controls.
 */
export function useCosmos(
  data: CosmosGraphData | null,
  propertyColumns: PropertyColumns,
  filters: FilterMap,
  gradientState: ColorGradientState,
  propertyTypeMap: Map<string, PropertyType>,
): UseCosmosReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const cosmosRef = useRef<CosmosGraph | null>(null)
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)
  const hoverRef = useRef<HTMLDivElement | null>(null)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [matchingCount, setMatchingCount] = useState(0)
  const [propertyStats, setPropertyStats] = useState<PropertyStatsResult | null>(null)

  // Store state
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const edgeSize = useGraphStore((s) => s.edgeSize)
  const isEdgesVisible = useGraphStore((s) => s.isEdgesVisible)
  const isNodeLabelsVisible = useGraphStore((s) => s.isNodeLabelsVisible)
  const isHighlightNeighbors = useGraphStore((s) => s.isHighlightNeighbors)
  const repulsion = useGraphStore((s) => s.repulsion)
  const friction = useGraphStore((s) => s.friction)
  const linkSpring = useGraphStore((s) => s.linkSpring)
  const decay = useGraphStore((s) => s.decay)

  // Refs for callback closures
  const dataRef = useRef(data)
  const isHighlightNeighborsRef = useRef(isHighlightNeighbors)
  const isNodeLabelsVisibleRef = useRef(isNodeLabelsVisible)
  const hoveredIndexRef = useRef<number | undefined>(undefined)
  const tooltipNodeIndexRef = useRef<number | undefined>(undefined)
  const isSimRunningRef = useRef(false)

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { isHighlightNeighborsRef.current = isHighlightNeighbors }, [isHighlightNeighbors])
  useEffect(() => { isNodeLabelsVisibleRef.current = isNodeLabelsVisible }, [isNodeLabelsVisible])

  // Mark graph as loaded
  useEffect(() => {
    if (data) {
      useGraphStore.getState().setGraphLoaded(data.nodeCount, data.linkIndices.length / 2)
    }
  }, [data])

  // ── Cosmos init / destroy ──
  useEffect(() => {
    if (!data) return
    const div = containerRef.current
    if (!div) return

    let cosmos: CosmosGraph | null = null
    let observer: ResizeObserver | null = null

    // MAX_LABELS defined at module level

    /**
     * Update node labels overlay. Uses GPU-sampled visible points when available
     * (avoids reading all 2M floats from getPointPositions). Falls back to stride
     * sampling for headless/SwiftShader environments.
     */
    const updateLabels = (): void => {
      const container = labelsRef.current
      const c = cosmosRef.current
      const d = dataRef.current
      if (!container || !c || !d) return
      if (!isNodeLabelsVisibleRef.current) {
        container.style.display = 'none'
        return
      }
      container.style.display = ''

      // GPU-sampled points: only visible, pre-sampled subset (fast for 1M+ graphs).
      // Returns space coordinates — must convert to screen via spaceToScreenPosition.
      const sampled = c.getSampledPointPositionsMap()
      const children = container.children
      let count = 0
      const canvasW = containerRef.current?.clientWidth ?? 0
      const canvasH = containerRef.current?.clientHeight ?? 0

      if (sampled.size > 0) {
        for (const [index, [spaceX, spaceY]] of sampled) {
          if (count >= MAX_LABELS) break
          const [screenX, screenY] = c.spaceToScreenPosition([spaceX, spaceY])
          if (screenX < -50 || screenX > canvasW + 50 || screenY < -50 || screenY > canvasH + 50) continue

          let el: HTMLElement
          if (count < children.length) {
            el = children[count] as HTMLElement
          } else {
            el = document.createElement('div')
            el.className = 'pointer-events-none absolute font-sans text-[10px] text-slate-600'
            el.style.whiteSpace = 'nowrap'
            container.appendChild(el)
          }
          el.style.left = `${screenX + 8}px`
          el.style.top = `${screenY - 6}px`
          el.style.display = ''
          el.textContent = d.nodeLabels[index] ?? d.nodeIds[index]
          count++
        }
      } else {
        // Fallback: stride sampling (skip every N nodes to avoid scanning all 1M)
        const stride = Math.max(1, Math.floor(d.nodeCount / MAX_LABELS))
        const positions = c.getPointPositions()
        if (!positions || positions.length === 0) return

        for (let idx = 0; idx < d.nodeCount && count < MAX_LABELS; idx += stride) {
          const sx = positions[idx * 2]
          const sy = positions[idx * 2 + 1]
          if (sx === undefined || sy === undefined) continue
          const [screenX, screenY] = c.spaceToScreenPosition([sx, sy])
          if (screenX < -50 || screenX > canvasW + 50 || screenY < -50 || screenY > canvasH + 50) continue

          let el: HTMLElement
          if (count < children.length) {
            el = children[count] as HTMLElement
          } else {
            el = document.createElement('div')
            el.className = 'pointer-events-none absolute font-sans text-[10px] text-slate-600'
            el.style.whiteSpace = 'nowrap'
            container.appendChild(el)
          }
          el.style.left = `${screenX + 8}px`
          el.style.top = `${screenY - 6}px`
          el.style.display = ''
          el.textContent = d.nodeLabels[idx] ?? d.nodeIds[idx]
          count++
        }
      }

      // Hide excess DOM elements
      for (let i = count; i < children.length; i++) {
        (children[i] as HTMLElement).style.display = 'none'
      }
    }

    /** Update hover label position directly on DOM (no React re-render). */
    const updateHoverPosition = (clientX: number, clientY: number): void => {
      const el = hoverRef.current
      if (!el || hoveredIndexRef.current === undefined) return
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) return
      el.style.left = `${clientX - bounds.left + 10}px`
      el.style.top = `${clientY - bounds.top - 10}px`
    }

    const config: GraphConfigInterface = {
      // 8192 is the documented max. Cosmos auto-reduces to maxTextureSize/2
      // if the GPU can't handle it. Don't go higher — framebuffer limits
      // are stricter than texture size limits on many GPUs.
      spaceSize: 8192,
      backgroundColor: '#ffffff',
      pointDefaultColor: COLOR_DEFAULT,
      linkDefaultColor: COLOR_EDGE_DEFAULT,
      pointDefaultSize: 4,
      pointSizeScale: nodeSize / 4,
      linkDefaultWidth: 1,
      linkWidthScale: edgeSize,
      renderLinks: isEdgesVisible,
      hoveredPointCursor: 'default',
      renderHoveredPointRing: true,
      hoveredPointRingColor: '#3b82f6',
      focusedPointRingColor: '#3b82f6',
      fitViewOnInit: true,
      fitViewDelay: 0,
      fitViewPadding: 0.1,
      rescalePositions: true,
      enableDrag: true,
      // Simulation is enabled but we don't call start() — user must click Run.
      enableSimulation: true,
      simulationRepulsion: repulsion,
      simulationGravity: 0.25,
      simulationCenter: 1,
      simulationFriction: friction,
      simulationLinkSpring: linkSpring,
      simulationDecay: decay,
      pointGreyoutOpacity: 0.1,
      linkGreyoutOpacity: 0.1,
      attribution: '',
      onSimulationStart: () => {
        isSimRunningRef.current = true
        setIsSimulationRunning(true)
      },
      onSimulationTick: () => {
        cosmosRef.current?.fitView(0)
        // Skip label updates during simulation for large graphs (>50K nodes) —
        // labels are illegible when millions of nodes are moving, and updateLabels
        // would read positions from GPU every frame.
        if (data.nodeCount <= 50_000) updateLabels()
      },
      onSimulationEnd: () => {
        isSimRunningRef.current = false
        setIsSimulationRunning(false)
        cosmosRef.current?.fitView(250)
      },
      onSimulationPause: () => {
        isSimRunningRef.current = false
        setIsSimulationRunning(false)
      },
      onSimulationUnpause: () => {
        isSimRunningRef.current = true
        setIsSimulationRunning(true)
      },
      onPointClick: (index, _pointPosition, event) => {
        if (isSimRunningRef.current) return
        const d = dataRef.current
        const c = cosmosRef.current
        if (!d || !c || index === undefined) return
        const nodeId = d.nodeIds[index]
        if (!nodeId) return
        const container = containerRef.current
        const bounds = container?.getBoundingClientRect() ?? new DOMRect()
        tooltipNodeIndexRef.current = index
        setTooltipState({
          nodeId,
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          canvasBounds: bounds,
        })
        // Keep neighbors highlighted while tooltip is open
        if (isHighlightNeighborsRef.current) {
          c.selectPointByIndex(index, true)
        }
      },
      onBackgroundClick: () => {
        tooltipNodeIndexRef.current = undefined
        setTooltipState(null)
        // Clear selection when tooltip closes
        if (isHighlightNeighborsRef.current) {
          cosmosRef.current?.unselectPoints()
        }
      },
      onMouseMove: (_index, _pointPosition, event) => {
        updateHoverPosition(event.clientX, event.clientY)
      },
      onDrag: (e) => {
        const src = e.sourceEvent as MouseEvent | undefined
        if (src) updateHoverPosition(src.clientX, src.clientY)
      },
      onPointMouseOver: (index) => {
        hoveredIndexRef.current = index
        const d = dataRef.current
        const c = cosmosRef.current
        if (!d || !c) return

        // Show hover label via DOM (no React state)
        const el = hoverRef.current
        if (el) {
          el.textContent = d.nodeLabels[index] ?? d.nodeIds[index]
          el.style.display = 'block'
        }

        if (isHighlightNeighborsRef.current) {
          c.selectPointByIndex(index, true)
        }
      },
      onPointMouseOut: () => {
        hoveredIndexRef.current = undefined
        // Hide hover label via DOM
        const el = hoverRef.current
        if (el) el.style.display = 'none'

        const c = cosmosRef.current
        if (!c || !isHighlightNeighborsRef.current) return
        if (tooltipNodeIndexRef.current !== undefined) return
        c.unselectPoints()
      },
      onZoom: () => { updateLabels() },
      onDragEnd: () => { updateLabels() },
    }

    /**
     * Initialize Cosmos and feed it data. This MUST only be called when `div`
     * has a non-zero clientWidth/clientHeight, otherwise the Cosmos constructor
     * defers its internal create() and subsequent set* calls silently no-op.
     */
    const init = (): void => {
      try {
        cosmos = new CosmosGraph(div, config)
      } catch (e) {
        console.error('Cosmos init error:', e)
        return
      }
      cosmosRef.current = cosmos

      // Positions: use provided or generate random
      const positions = data.initialPositions ?? generateRandomPositions(data.nodeCount)
      cosmos.setPointPositions(positions)

      // Links
      cosmos.setLinks(data.linkIndices)

      // Render statically (alpha=0 = no physics forces).
      // fitViewOnInit zooms camera to frame all nodes.
      cosmos.render(0)

      // Show labels after initial render (delayed so fitView settles first)
      setTimeout(updateLabels, 300)
    }

    // Cosmos needs a container with actual pixel dimensions. If the div has
    // already been laid out, init immediately. Otherwise wait for layout.
    if (div.clientWidth > 0 && div.clientHeight > 0) {
      init()
    } else {
      observer = new ResizeObserver(() => {
        if (div.clientWidth > 0 && div.clientHeight > 0) {
          observer?.disconnect()
          observer = null
          init()
        }
      })
      observer.observe(div)
    }

    // ── Update labels during canvas panning ──
    // onZoom handles zoom, onDragEnd handles node drag end, but background
    // click-and-drag (pan) has no cosmos callback — track it via DOM.
    let panFrameId = 0
    const handlePanMove = (e: PointerEvent): void => {
      if (!(e.buttons & 1)) return // left button not held = not panning
      if (!isNodeLabelsVisibleRef.current) return
      if (panFrameId) return // already scheduled for this frame
      panFrameId = requestAnimationFrame(() => {
        panFrameId = 0
        updateLabels()
      })
    }
    div.addEventListener('pointermove', handlePanMove)

    return (): void => {
      div.removeEventListener('pointermove', handlePanMove)
      if (panFrameId) cancelAnimationFrame(panFrameId)
      observer?.disconnect()
      if (cosmos) {
        try { cosmos.destroy() } catch { /* ignore */ }
      }
      cosmosRef.current = null
      setIsSimulationRunning(false)
    }
    // Only re-create when data identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // ── Block pan/zoom/drag on canvas during simulation (but allow mousemove for hover) ──
  useEffect(() => {
    const div = containerRef.current
    if (!div) return
    const blockEvent = (e: Event): void => {
      if (isSimRunningRef.current) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    // Capture phase so we intercept before Cosmos event handlers
    div.addEventListener('mousedown', blockEvent, { capture: true })
    div.addEventListener('wheel', blockEvent, { capture: true, passive: false })
    div.addEventListener('touchstart', blockEvent, { capture: true })
    return (): void => {
      div.removeEventListener('mousedown', blockEvent, { capture: true })
      div.removeEventListener('wheel', blockEvent, { capture: true })
      div.removeEventListener('touchstart', blockEvent, { capture: true })
    }
  }, [])

  // ── Sync simulation settings ──
  useEffect(() => {
    cosmosRef.current?.setConfig({
      simulationRepulsion: repulsion,
      simulationGravity: 0.25,
      simulationCenter: 1,
      simulationFriction: friction,
      simulationLinkSpring: linkSpring,
      simulationDecay: decay,
    })
  }, [repulsion, friction, linkSpring, decay])

  // ── Sync display settings ──
  useEffect(() => {
    cosmosRef.current?.setConfig({ renderLinks: isEdgesVisible })
  }, [isEdgesVisible])

  // ── Sync node labels ──
  // When toggled, render labels using stride sampling (reliable across all GPUs).
  useEffect(() => {
    const container = labelsRef.current
    if (!container) return
    if (!isNodeLabelsVisible) {
      container.style.display = 'none'
      return
    }
    const cosmos = cosmosRef.current
    if (!cosmos || !data) return

    container.style.display = ''
    container.innerHTML = ''

    const positions = cosmos.getPointPositions()
    if (!positions || positions.length === 0) return
    const canvasW = containerRef.current?.clientWidth ?? 0
    const canvasH = containerRef.current?.clientHeight ?? 0
    const stride = Math.max(1, Math.floor(data.nodeCount / MAX_LABELS))
    let count = 0
    for (let idx = 0; idx < data.nodeCount && count < MAX_LABELS; idx += stride) {
      const sx = positions[idx * 2]
      const sy = positions[idx * 2 + 1]
      if (sx === undefined || sy === undefined) continue
      const [screenX, screenY] = cosmos.spaceToScreenPosition([sx, sy])
      if (screenX < -50 || screenX > canvasW + 50 || screenY < -50 || screenY > canvasH + 50) continue
      const el = document.createElement('div')
      el.className = 'pointer-events-none absolute font-sans text-[10px] text-slate-600'
      el.style.whiteSpace = 'nowrap'
      el.style.left = `${screenX + 8}px`
      el.style.top = `${screenY - 6}px`
      el.textContent = data.nodeLabels[idx] ?? data.nodeIds[idx]
      container.appendChild(el)
      count++
    }
  }, [isNodeLabelsVisible, data])

  // ── Sync node sizes ──
  // Use pointSizeScale (shader uniform) for instant slider response — no data flush needed.
  useEffect(() => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    // Initial pointDefaultSize is 4 (cosmos default). Scale relative to that.
    cosmosRef.current?.setConfig({ pointSizeScale: nodeSize / 4 })
  }, [nodeSize])

  // ── Sync edge sizes ──
  useEffect(() => {
    cosmosRef.current?.setConfig({ linkWidthScale: edgeSize })
  }, [edgeSize])


  // ── Appearance worker: send columns once, then lightweight updates ──
  const workerRef = useRef<Worker | null>(null)
  useEffect(() => {
    const worker = new AppearanceWorker()
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent): void => {
      const { pointColors, pointSizes, linkColors, matchingCount: mc, stats: s } = e.data as {
        pointColors: Float32Array
        pointSizes: Float32Array
        linkColors: Float32Array
        matchingCount: number
        stats: PropertyStatsResult | null
      }
      const c = cosmosRef.current
      if (!c) return
      c.setPointColors(pointColors)
      c.setPointSizes(pointSizes)
      c.setLinkColors(linkColors)
      // render() without alpha arg preserves current simulation state.
      // render(0) would set alpha=0, killing a running simulation.
      c.render()
      setMatchingCount(mc)
      setPropertyStats(s)
    }
    return () => { worker.terminate(); workerRef.current = null }
  }, [])

  // Send property columns + link indices to worker ONCE per graph load
  useEffect(() => {
    if (!data) return
    const worker = workerRef.current
    if (!worker) return
    worker.postMessage({
      type: 'init',
      propertyColumns,
      linkIndices: data.linkIndices,
    })
    // Also trigger initial appearance
    setMatchingCount(data.nodeCount)
  }, [data, propertyColumns])

  // Send lightweight update on filter/gradient change (no columns cloned)
  useEffect(() => {
    if (!data) return
    const worker = workerRef.current
    if (!worker) return

    // Serialize filters (convert Sets to arrays for structured clone)
    const serializedFilters: Record<string, unknown> = {}
    for (const [key, f] of filters) {
      if (f.type === 'string') {
        serializedFilters[key] = { ...f, selectedValues: Array.from(f.selectedValues) }
      } else {
        serializedFilters[key] = { ...f }
      }
    }

    // Resolve palette stops for the worker
    let paletteStops: string[] = []
    if (gradientState.propertyKey) {
      if (isBuiltinPalette(gradientState.palette)) {
        paletteStops = getPaletteColors(gradientState.palette, gradientState.customColors)
      } else {
        const custom = gradientState.customPalettes.find((p) => p.id === gradientState.palette)
        paletteStops = custom ? [...custom.colors, ...gradientState.customColors] : getPaletteColors('Viridis', gradientState.customColors)
      }
      if (gradientState.isReversed) paletteStops = [...paletteStops].reverse()
    }

    const propType = gradientState.propertyKey ? (propertyTypeMap.get(gradientState.propertyKey) ?? null) : null

    worker.postMessage({
      type: 'update',
      nodeCount: data.nodeCount,
      filters: serializedFilters,
      gradientConfig: {
        propertyKey: gradientState.propertyKey,
        paletteStops,
        propType,
      },
      statsConfig: {
        propertyKey: gradientState.propertyKey,
        propertyType: propType,
      },
      defaultRgba: hexToRgba(COLOR_DEFAULT),
      edgeRgba: hexToRgba(COLOR_EDGE_DEFAULT),
    })
  }, [data, filters, gradientState, propertyTypeMap])

  // ── Sync highlight neighbors ──
  useEffect(() => {
    if (!isHighlightNeighbors) {
      cosmosRef.current?.unselectPoints()
    }
  }, [isHighlightNeighbors])

  // ── Close tooltip (also clears neighbor highlight) ──
  const closeTooltip = useCallback((): void => {
    tooltipNodeIndexRef.current = undefined
    setTooltipState(null)
    if (isHighlightNeighborsRef.current) {
      cosmosRef.current?.unselectPoints()
    }
  }, [])

  // ── Rotation (transforms actual node positions) ──
  const [rotationCenter, setRotationCenter] = useState<{ x: number; y: number } | null>(null)
  const hideRotationCenterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Rotate all point positions by a delta angle (degrees) around their center of mass. */
  const rotatePositions = useCallback((deltaDeg: number): void => {
    const cosmos = cosmosRef.current
    if (!cosmos || isSimRunningRef.current) return
    const positions = cosmos.getPointPositions()
    if (!positions || positions.length < 2) return

    const n = positions.length / 2
    // Find center of mass
    let cx = 0, cy = 0
    for (let i = 0; i < n; i++) {
      cx += positions[i * 2]
      cy += positions[i * 2 + 1]
    }
    cx /= n
    cy /= n

    // Apply rotation matrix around center
    const rad = (deltaDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const rotated = new Float32Array(positions.length)
    for (let i = 0; i < n; i++) {
      const x = positions[i * 2] - cx
      const y = positions[i * 2 + 1] - cy
      rotated[i * 2] = x * cos - y * sin + cx
      rotated[i * 2 + 1] = x * sin + y * cos + cy
    }
    cosmos.setPointPositions(rotated)
    cosmos.render(0)

    // Hide hover label during rotation
    if (hoverRef.current) hoverRef.current.style.display = 'none'

    // Show rotation center marker
    const [sx, sy] = cosmos.spaceToScreenPosition([cx, cy])
    setRotationCenter({ x: sx, y: sy })

    // Auto-hide after 600ms of no rotation
    if (hideRotationCenterTimer.current) clearTimeout(hideRotationCenterTimer.current)
    hideRotationCenterTimer.current = setTimeout(() => setRotationCenter(null), 150)
  }, [])

  // Shift+wheel rotation handler — batches rapid scroll events into one rAF
  useEffect(() => {
    const div = containerRef.current
    if (!div) return
    let pendingDeg = 0
    let frameId = 0
    const flush = (): void => {
      frameId = 0
      if (pendingDeg === 0) return
      const deg = pendingDeg
      pendingDeg = 0
      rotatePositions(deg)
    }
    const handleWheel = (e: WheelEvent): void => {
      if (!e.shiftKey || isSimRunningRef.current) return
      const rawDelta = e.deltaY || e.deltaX
      if (!rawDelta) return
      e.preventDefault()
      e.stopPropagation()
      pendingDeg += rawDelta * 0.3
      if (!frameId) frameId = requestAnimationFrame(flush)
    }
    div.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return (): void => {
      div.removeEventListener('wheel', handleWheel, { capture: true })
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [rotatePositions])

  // ── Camera controls ──
  const handleZoomIn = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() * 1.5, 200)
  }, [])

  const handleZoomOut = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setZoomLevel(cosmos.getZoomLevel() / 1.5, 200)
  }, [])

  const handleFit = useCallback((): void => {
    cosmosRef.current?.fitView(200)
  }, [])

  const handleRotateCW = useCallback((): void => {
    rotatePositions(15)
  }, [rotatePositions])

  const handleRotateCCW = useCallback((): void => {
    rotatePositions(-15)
  }, [rotatePositions])

  // ── Simulation controls ──
  const startSimulation = useCallback((): void => {
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.fitView(0)
    cosmos.start()
  }, [])

  const stopSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [])

  const pauseSimulation = useCallback((): void => {
    cosmosRef.current?.pause()
  }, [])

  const randomizePositions = useCallback((): void => {
    if (!data) return
    const cosmos = cosmosRef.current
    if (!cosmos) return
    cosmos.setPointPositions(generateRandomPositions(data.nodeCount))
    cosmos.render(0)
    cosmos.fitView(0)
  }, [data])

  return {
    containerRef,
    labelsRef,
    tooltipState,
    closeTooltip,
    hoverRef,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleRotateCW,
    handleRotateCCW,
    rotationCenter,
    isSimulationRunning,
    matchingCount,
    propertyStats,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    randomizePositions,
    cosmosRef,
  }
}



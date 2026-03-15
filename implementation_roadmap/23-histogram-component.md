# Task 23: Histogram Component

**Release:** R3 | **Chunk:** 7 — Stats Tab
**Size:** S
**Prerequisites:** Task 22

## Goal

A horizontal bar chart visualises the distribution of a selected number property. Each bar has a hover tooltip showing its range and count.

## Deliverables

### Files to create
- `src/components/Histogram.tsx`

## Implementation Notes

### Props
```ts
interface Props { buckets: HistogramBucket[] }
```

### Implementation
- `<div>` bars with `position: relative` and absolute-positioned hover tooltips
- No external charting library needed
- No Y-axis labels
- Bar height: `height: (bucket.count / maxCount * 100)%` within a fixed-height container
- Bar width: equal width, flex layout

### Hover tooltip per bar
- Shown on `mouseenter`; hidden on `mouseleave`
- Format: `"10.0 – 20.0: 5 nodes"` (both boundaries displayed as inclusive for readability)
- Accessible fallback: `title` attribute on each bar `<div>` with the same string

### Empty state
- Renders nothing (`null`) when `buckets.length === 0`

## Tests

### E2E — `e2e/stats.spec.ts`
- Load `sample-graph.json`, navigate to Stats tab, select `age` property
- Histogram appears with correct number of bars (Sturges: n=5 → 4 buckets)
- Hover over a bar → tooltip shows `"from – to: N nodes"` format

### Manual verification
- Select `score` property → histogram bars render with varying heights
- Hovering each bar shows correct range and count
- No console errors when histogram renders

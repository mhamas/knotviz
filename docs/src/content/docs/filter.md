---
title: Filter
description: Hide nodes by property. Per-type UI. Multiple filters combine with AND.
---

*Hide nodes that don't match. Filtered-out nodes and their edges disappear — not dim, actually gone.*

Filtering is how you reduce visual noise to what matters. Every property on every node is filterable, with a UI tailored to its type. Multiple filters stack with **AND** semantics. The result is a live view that updates as you adjust controls, with edges from/to hidden nodes culled automatically.

The difference from [Search](/docs/search) matters: filter **carves** the view (hidden means gone), search **highlights within it** (non-matches dim, stay in place). You typically filter first to carve, then search to find.

## Per-type UI

Knotviz gives each property type a dedicated control, because filtering a numeric range is fundamentally different from picking categorical values.

| Property type | Control |
|---|---|
| `number` | Dual-handle range slider with min/max inputs. Log-scale toggle (appears only when min > 0). Histogram overlay shows distribution. |
| `string` / `string[]` | Searchable multi-select with chip display. Select-all / clear-all / reset shortcuts. |
| `boolean` | True / False radio. Disable the filter to include both. |
| `date` | Dual-handle range slider with ISO-formatted endpoints. Same histogram overlay as numbers. |

Each filter has its own enable checkbox at the top-left. **Disabling** keeps your configured values but stops the filter from participating in the match. Handy for A/B comparisons — flip one filter on and off to see its effect in isolation.

![Filter panel with three filters enabled (active, age, community). Match count reads 714/1,000 nodes, and the canvas on the left shows the reduced set.](/docs/screenshots/filter-panel-active.png)

## AND across all filters

Multiple enabled filters combine with **AND** — a node is visible only if it matches *every* one of them. The match count at the top of the panel (`714/1,000 nodes match`) updates live as you adjust controls.

For concrete intuition: imagine filtering to `age ≥ 30 AND tags includes "engineer" AND joined > 2020-01-01`. A 35-year-old engineer who joined in 2022 passes all three and stays visible. A 40-year-old designer with the right join date fails the `tags` filter and disappears, along with every edge attached to them.

There's no OR / NOT / XOR. Keep filters simple; combine with [Search](/docs/search) or multiple comparison passes for more complex expressions.

## Hide, don't dim

Filtered-out nodes render at **alpha 0, size 0** — effectively gone from the GPU's draw call, not just visually dimmed. Every edge attached to a hidden endpoint is also hidden; you never see "floating" edges with a missing end.

That's deliberate: filters are the carving tool. If you want something softer (keep context, emphasise a subset) use [Search](/docs/search) instead, which dims non-matches to alpha 0.1 and keeps the full layout visible.

The cost of carving is you lose context: a neighbour of a filtered-in node might be hidden, making the visible node look less connected than it is. Toggle the filter off to zoom out, toggle on to zoom in. Cheap in both directions.

## The productive loop: filter + colour

Filter and [Analyze](/docs/analyze) compose well. A typical pattern:

1. **Colour by a categorical property** — communities, types, risk tiers. You can now see which clusters dominate.
2. **Filter by a numeric or boolean property** — `activity > threshold`, `verified = true`. The coloured clusters thin out; which colour survives?
3. **Add a second filter** to sharpen the question. Does the high-risk cluster mostly share one community?

Stats update live with the filter set, so the distribution you see in the Statistics panel reflects only what's currently visible — concrete enough to notice patterns you'd miss in raw tables.

## Per-filter shortcuts

- **Select all** / **Clear all** on string and string[] filters — skip the multi-click when you want everything except a handful.
- **Reset** per filter — returns to default (disabled, full range). Doesn't remove the filter; you can re-enable later.
- **Clear all** at the top — disables every filter at once. Equivalent to starting over without losing your configured values.

## Gotchas

- Edges to hidden nodes disappear even if the edge itself has nothing filtered. Intentional; the alternative (orphan edges) looks broken.
- Log-scale toggle only appears when the property's min value is `> 0` (log of zero is undefined, of negative is complex). If you have non-positive values, use linear scale or pre-filter to strictly positive.
- `string[]` filtering uses **any-match** semantics — a node with tags `[a, b, c]` passes a filter that selects `a` alone. For must-match-all-tags, add one filter per required tag.
- The filter panel computes distinct values live from visible nodes, so disabling one filter may change the options available in another (the multi-select updates to reflect the now-visible set).

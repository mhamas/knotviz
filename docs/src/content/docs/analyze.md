---
title: Analyze
description: Colour by property, size by property, per-property statistics. All in one panel.
---

*Encode a property into colour or size (one at a time). Inspect its distribution in the stats panel. Three tools, same goal: see patterns in the data behind the graph.*

A laid-out graph tells you about **structure** — who's connected to whom. Analyze tells you about **attributes** — what each node actually is. Colour a fraud network by risk score and the dangerous clusters light up. Size a commit graph by lines-changed and the dominant authors visually dominate. The graph + the encoding together are how you actually *read* your data.

## Colour

Pick any property and every node re-colours to match. The encoding adapts to the property's type:

| Property type | Scale |
|---|---|
| `number`, `date` | Continuous gradient — min → max, legend shows the range |
| `boolean` | Two chips (true / false) |
| `string`, `string[]` | Discrete chips, one colour per distinct value, ordered by frequency |

The Statistics panel underneath the legend updates to match, so you get the visual encoding *and* a numerical breakdown in the same glance.

### Picking a palette

There are 19 built-in palettes. Picking the right one is about matching the data's structure to the palette's perceptual shape:

- **Perceptually uniform** (Viridis, Plasma, Magma, Inferno, Turbo) — for continuous numeric/date data where you want equal visual steps. Default choice; Viridis is colour-blind-safe.
- **Monochromatic** (Blues, Reds, Greens, Oranges, Purples, Grays) — single-hue ramps. Great when colour is already carrying one semantic (e.g. you want "risk" to feel red).
- **Diverging** (Spectral, RdBu, RdYlGn, PiYG, BlueOrange, TealRose, IndigoAmber) — dark-to-light-to-dark through a neutral midpoint. Use for data with a meaningful zero (correlation, sentiment, net change).
- **Rainbow** — high chroma, not perceptually uniform. Use for categorical data where distinctness matters more than ordering.

Plus a **custom palette** editor, and a one-click **reverse** if the default direction is backwards for your data (e.g. you want low risk = dark, not bright).

### Log scale

Numeric and date properties with `min > 0` expose a **log scale** toggle. Use it when your data is power-law-distributed — follower counts, file sizes, incomes, citations. Without log scale, a handful of whales crush the colour range and everyone else reads identical. With log scale, each order of magnitude gets equal colour space.

## Size

Pick a numeric property; node size scales by value.

- **Scaling is area-proportional.** Doubling the value makes a node look twice as big — which is what your eye naturally reads, rather than 4× bigger as a naive scaling would produce.
- **Configurable min and max size.** Set the floor so small values stay visible, and cap the ceiling so one outlier doesn't eat the screen. A **Reverse sizes** button flips the direction (big values → small nodes) for when inverted encoding reads better.
- **Colour and size are mutually exclusive.** Only one encoding is active at a time. Switching keeps your property selection but re-renders through the new mode. If you need both at once, [filter](/docs/filter) to a smaller subset first, then apply one encoding at a time.

### When to pick size vs colour

- **Magnitude matters more than category** → size. Instantly comparable across the graph (`A is bigger than B` is read as a size difference before any cognitive step).
- **Distinguishing groups matters more than magnitude** → colour. Categorical properties pretty much always want colour.
- **Both matter** → pick the more important one as the Analyze encoding; use [filter](/docs/filter) to slice by the other.

## Statistics

Pick a property; the stats panel shows what the distribution actually looks like:

| Property type | Stats shown |
|---|---|
| `number`, `date` | count, mean, p25 / p50 / p75 / p90, sum, histogram (11 bins) |
| `string`, `boolean` | count, number of distinct values, frequency table (sorted descending) |

The stats update live when filters change — the numbers reflect what's currently visible, not the whole graph. Filter to "active users only" and the stats tell you about active users, not the original population.

Power-law data (follower counts, file sizes, incomes) pushes almost every value into one tall bar at the left of the histogram. That's a signal to switch to log scale on the colour encoding, not a bug in the chart.

## Gotchas

- Gradient respects `min` / `max` of the **visible** set — change a filter and the scale re-normalises. That's usually what you want; if you need a fixed scale across filter states, keep the filters stable while exploring.
- `string[]` colours by **first tag alphabetically** when encoded as colour. If your nodes carry `[designer, engineer]` and you want to colour by the "interesting" tag, move it to first alphabetically via a pre-process, or switch to filtering.
- **Size doesn't respect log scale** — only colour does. For power-law numeric properties you'll want colour, not size, unless you've log-transformed the values upstream.
- The Statistics panel's frequency table is sorted by count, not by value. For alphabetical listing, export the JSON and sort externally.
- Switching between colour and size modes on a 1M-node graph takes a beat — the new encoding is computed from scratch.

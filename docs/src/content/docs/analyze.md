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

Pick a numeric property; node radius scales by value.

- **Area-proportional (sqrt) scaling.** Doubling the value doubles the *area*, not the radius. That's what visual perception actually does — if radius scaled linearly, a 2× value would look 4× bigger because area is what you see.
- **Configurable min/max radius range.** Avoid 0-radius "invisible" nodes on the bottom end; cap the top so one outlier doesn't eat the screen.
- **Colour and size are mutually exclusive.** The Analyze panel has one active encoding mode. Switching modes keeps your property selection but re-renders through the new encoding. If you need both at once, use [filter](/docs/filter) to narrow the visible set, then one encoding at a time on the smaller view.

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

Everything computes in the **appearance worker**, off the main thread, so a 1M-node stats recompute doesn't block the UI. Updates live when filters change — the numbers reflect the *visible* set, not the whole graph. That's what you want: if you've filtered to "active users only" the stats tell you about active users, not the original population.

Worth knowing: the histogram uses 11 fixed bins from min to max, equal width. For power-law data the rightmost bins will be tall and the rest flat — that's a signal to switch to log scale on the colour encoding, not a bug in the histogram.

## Gotchas

- Gradient respects `min` / `max` of the **visible** set — change a filter and the scale re-normalises. That's usually what you want; if you need a fixed scale across filter states, keep the filters stable while exploring.
- `string[]` colours by **first tag alphabetically** when encoded as colour. If your nodes carry `[designer, engineer]` and you want to colour by the "interesting" tag, move it to first alphabetically via a pre-process, or switch to filtering.
- **Size doesn't respect log scale** — only colour does. For power-law numeric properties you'll want colour, not size, unless you've log-transformed the values upstream.
- The Statistics panel's frequency table is sorted by count, not by value. For alphabetical listing, export the JSON and sort externally.
- Switching modes (colour ↔ size) takes ~100ms on 1M-node graphs — the appearance worker has to rebuild the palette / size mapping from scratch.

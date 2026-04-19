---
title: Simulation
description: GPU force-directed layout. Space to toggle. Four sliders to tune.
---

*Force-directed layout on the GPU. Space toggles it. Four sliders control the physics — repulsion, friction, link spring, and the edges-to-keep percentage.*

Force simulation is what turns random node positions into something you can reason about. At a high level: every node repels every other node (that spreads the graph out), connected nodes pull toward each other (that forms clusters), and friction damps oscillation (that lets the layout settle). Running on the GPU via [cosmos.gl](https://cosmograph.app/) means a 1M-node graph lays out in under 30 seconds on a laptop.

## Controls

| Control | What it does |
|---|---|
| `Space` (or Run/Stop) | Toggle simulation |
| **Repulsion** | Force pushing *every* pair of nodes apart. Higher = more spread, weaker clusters. |
| **Friction** | Momentum damping. Higher = settles faster, nodes travel less. |
| **Link spring** | Pull between *connected* nodes. Higher = tighter clusters. |
| **Edges to keep %** | Drop the bottom (100−X)% of edges by weight for this run. Speeds the sim and declutters dense graphs. |
| **Always keep strongest per node** | Guarantees no node is left without its strongest edge when the % slider is low. Keeps the graph connected. |
| **Restart** | Re-randomise positions and start over. |

Camera auto-follows during simulation via `fitView` every tick — the whole graph stays on screen as it reshapes. When you press **Stop**, the camera does one final 250ms fit to smooth the transition.

## What "settled" looks like

A laid-out graph has three visual cues:

1. **Clusters separate.** If your data has community structure, you'll see distinct clumps of nodes with mostly internal edges and sparser bridges between.
2. **Node motion slows to near-zero.** Frames-per-second on the sim counter should plateau; visually, nodes stop jittering.
3. **No "piling" at the edges.** If nodes compress into a ring at the boundary, you're hitting the [8192×8192 grid](#the-8192-grid) limit — reduce repulsion or graph size.

For a 1k-node clustered graph, settling takes 3–5s. For 100k, 15–20s. For 1M, 25–40s. Past that see [Limits](/docs/limits).

## Tuning recipe

Most graphs look right at default settings. When they don't, the pattern matches the problem:

**Graph looks tangled, nodes bunched in the middle**

1. Raise **repulsion** (wider spread)
2. Lower **friction** (nodes travel further before settling)
3. Let it run longer — complex layouts need 20–30 seconds

**Graph collapses into a solid ball**

1. Lower **repulsion** — too much is as bad as too little
2. Raise **friction** to kill the bouncing
3. Lower **link spring** — connected nodes are winning the tug-of-war

**Dense edges obscure the structure**

1. Lower **edges to keep %** to 20–40% for the layout run
2. Tick **always keep strongest per node** so the graph doesn't fragment
3. Once settled, raise edges-to-keep back to 100% to see the full network around the positioned nodes

**Disconnected components drift apart forever**

The default force model has no global gravity. Small disconnected components will float off indefinitely. Accept it (they're disconnected — that's informative) or pre-filter to the largest component before loading.

## The 8192 grid

The simulation runs on a fixed **8192 × 8192 grid** — hardcoded by cosmos.gl, independent of your GPU. That's 67 million pixels. At 1M nodes that's ~67 px² per node; nodes visually touch at fit-view. At 2M+ they overlap and pile against the grid boundary.

Your GPU's `MAX_TEXTURE_SIZE` matters only as a *lower* bound. Weaker GPUs (old integrated, some Chromebooks) get less than 8192 and cosmos logs a console warning: `The spaceSize has been reduced to N due to WebGL limits`. Modern GPUs (16K+) don't help — the cap is inside cosmos, not hardware.

This is the main reason ~1M is the useful ceiling. See [Limits](/docs/limits) for the full picture.

## Gotchas

- Running the simulation past ~2M nodes drops interaction FPS to ~15. Pre-filter with the [Filter panel](/docs/filter) first.
- **Restart** re-randomises positions — your current layout is gone. [Export](/docs/export) first if you want to preserve it.
- Rotation is disabled during simulation — the sim overwrites positions every tick, rotation would race. Hit **Space** to stop, rotate, then resume.
- The simulation doesn't resume from saved positions when you reload an exported JSON. It starts from those positions and may reshape them; hit **Stop** immediately if you only wanted to view the saved layout.

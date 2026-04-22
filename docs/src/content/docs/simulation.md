---
title: Simulation
description: GPU force-directed layout. Space to toggle. Four sliders to tune.
---

*Force-directed layout on the GPU. Space toggles it. Four sliders control the physics — repulsion, friction, link spring, and the edges-to-keep percentage.*

Force simulation is what turns random node positions into something you can reason about. In a sentence: every node repels every other node (that spreads the graph out), connected nodes pull toward each other (that forms clusters), and friction stops the bouncing (that lets the layout settle). Fast enough that a 1M-node graph lays out in under 30 seconds on a laptop.

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

The camera auto-follows while the sim is running — the whole graph stays on screen as it reshapes.

## What "settled" looks like

A laid-out graph has three visual cues:

1. **Clusters separate.** If your data has community structure, you'll see distinct clumps of nodes with mostly internal edges and sparser bridges between.
2. **Node motion slows to near-zero.** Frames-per-second on the sim counter should plateau; visually, nodes stop jittering.
3. **No "piling" at the edges.** If nodes compress into a ring at the boundary, your graph is too big for the simulation space — reduce repulsion, or see [Limits](/docs/limits) if you're above ~1M nodes.

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

## Gotchas

- Running the simulation past ~2M nodes drops interaction framerate noticeably. Pre-filter with the [Filter panel](/docs/filter) first.
- **Restart** re-randomises positions — your current layout is gone. [Export](/docs/export) first if you want to preserve it.
- Rotation is disabled while the sim is running — it would immediately overwrite the rotated positions. Hit **Space** to stop, rotate, then resume.
- Re-opening an exported graph loads the saved positions, but pressing **Space** still starts a fresh simulation that will reshape them. Hit **Stop** immediately if you only wanted to view the saved layout.
- On older hardware (old integrated GPUs, some Chromebooks) the simulation space can shrink below the usual size; you'll see a console warning and the graph may feel cramped. See [Limits](/docs/limits).

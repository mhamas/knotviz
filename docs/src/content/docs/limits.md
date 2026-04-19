---
title: Limits
description: Honest ceilings. Useful up to ~1M nodes. Past that, the tool loads but doesn't help you.
---

*You can work with Knotviz productively up to ~1M nodes (up to ~2M for strongly clustered graphs). Past that, the tool loads but you won't get much out of it.*

## Why ~1M

Two things break down at once:

1. **Simulation grid saturates.** Cosmos runs the force simulation on a fixed **8192 × 8192** grid. That's 67M pixels. At 1M nodes that's ~67 px² per node — nodes touch visually at fit-view. At 2M+ they overlap; the graph becomes a blob and nodes pile against the grid boundary.

2. **Interaction degrades.** Pan/zoom holds 30+ FPS through ~1–2M. At 5M it's ~15 FPS — technically interactive, practically frustrating.

## Interaction tier

| Size | Load | Interaction | Fit-view |
|---|---|---|---|
| 100K | ~2s | 60 FPS | Dense, clusters separated |
| 500K | ~5s | 60 FPS | Grid mostly used, distinct |
| 1M | ~10s | 30+ FPS | Saturating — edge of useful |
| 2M | ~20s | 30 FPS | Only clustered graphs stay legible |
| 5M | ~30s | 15 FPS | Solid blob; filter/search only |

## Loading limits per format

Past this, the tab crashes ("Aw, Snap!" renderer OOM). The useful ~1M ceiling hits first for every format except GraphML.

| Format | Loads up to |
|---|---|
| JSON | ~5M (~1 GB file) |
| CSV edge list | ~5M (~215 MB file) |
| CSV nodes+edges pair | ~2M (~175 MB file) |
| GraphML | ~500k (~118 MB file) |
| GEXF | ~1M (~235 MB file) |

## System requirements

Needs **WebGL2** — modern Chrome, Safari, Firefox, and Edge all supported. iPad Safari works but typically gets a smaller simulation grid.

Your GPU's `MAX_TEXTURE_SIZE` matters only as a *lower* bound. Cosmos caps the simulation grid at 8192 regardless of GPU capacity. Weaker GPUs (old integrated, some Chromebooks) get less than 8192 and cosmos logs `The spaceSize has been reduced to N due to WebGL limits`. Modern GPUs (16K+) don't help — the cap is in cosmos, not hardware.

## Past 1M

If your data is larger than 1M nodes, you have three options. Pick one before Knotviz opens.

### Option 1: Sample to the largest connected component

Most real-world graphs (social, transaction, citation) have a single giant component that contains 80–99% of the interesting nodes, plus many small disconnected islands. Keep the big component; drop the rest.

**NetworkX** — extract the largest weakly-connected component:

```python
import networkx as nx, json
G = nx.read_graphml('huge.graphml')
largest = max(nx.weakly_connected_components(G), key=len)
sub = G.subgraph(largest).copy()
data = nx.node_link_data(sub)
data['version'] = '1'
data['edges'] = data.pop('links')
json.dump(data, open('trimmed.json', 'w'))
```

Typical reduction: 5M → 4M nodes. Useful only if the big component fits under 1M.

### Option 2: Filter by an activity threshold

Drop low-signal nodes *before* the graph reaches the browser. Works well when your dataset has a "weight" or "activity" column with a long tail — Twitter followers, transaction count, commit count.

**Pandas** — keep the top 10% of nodes by degree:

```python
import pandas as pd
edges = pd.read_csv('huge.csv')
degree = pd.concat([edges.source, edges.target]).value_counts()
keep = set(degree[degree >= degree.quantile(0.90)].index)
small = edges[edges.source.isin(keep) & edges.target.isin(keep)]
small.to_csv('top10pc.csv', index=False)
```

A 10M-edge graph over 2M nodes often drops to ~200k nodes / 2M edges this way. The structure that dominates visually (hubs + bridges) is preserved.

### Option 3: Project from the source database

If the source is a database, project the subset server-side. Cheaper than exporting 10M nodes then filtering in Python.

**Neo4j** — Cypher query for the risk > 0.7 subgraph:

```cypher
MATCH (n)-[r]-(m)
WHERE n.risk > 0.7 AND m.risk > 0.7
RETURN n, r, m
```

Pipe the result through `jq` into Knotviz JSON — see [JSON](/docs/input-formats/json) for the shape.

**PostgreSQL** — activity-thresholded edge list:

```sql
COPY (
  SELECT source_id AS source, target_id AS target
  FROM edges
  WHERE created_at > NOW() - INTERVAL '90 days'
) TO 'recent.csv' CSV HEADER;
```

### Once it's loaded

Even a pre-filtered 1M-node graph is dense. Use Knotviz's [filter](/docs/filter) + [search](/docs/search) + [analyze](/docs/analyze) inside the tool to carve further. Filter-hidden nodes are fully culled — what's left reads at normal density, so a 1M graph filtered to 100k looks identical to a 100k graph.

### When you really need all 10M

Knotviz isn't the tool. See [Compare](/docs/compare) — Cosmograph and Graphistry handle billions because they have cloud backends that you upload to. The trade-off is your data leaves your machine.


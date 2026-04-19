---
title: Compare
description: How Knotviz differs from Gephi, Cosmograph, and Graphistry.
---

*Knotviz trades raw scale for privacy and zero setup. If your graph fits in a browser tab, it opens here in five seconds.*

## At a glance

| | Knotviz | Gephi | Cosmograph | Graphistry |
|---|---|---|---|---|
| Runs in | Browser tab | Desktop (Java) | Browser (cloud) | Browser (cloud) |
| Install | None | 30-min Java | Account required | Python + cloud |
| Data location | Never leaves browser | Local | Cloud (DuckDB) | Server-side |
| Practical size | ~1M on a laptop | ~100k before slowdown | Billions (cloud) | Billions (cloud) |
| Cost | Free, open-source | Free | Free (personal) | Paid |
| GPU | WebGL in browser | CPU only | WebGL in browser | Server-side |
| Filter & search | Typed, multi-filter + label search | Basic | DuckDB SQL | SQL |
| Best for | Private work on ≤1M graphs | Offline analysis, publications | Massive graphs with cloud query | Enterprise / security work |

## Pick Knotviz if

- **Your data shouldn't leave your machine.** Regulated data, sensitive investigations, air-gapped environments — Knotviz is the only one of these that does zero network I/O with your graph.
- **You want zero setup.** Open a tab, drop a file.
- **Your graph is ≤ 1M nodes.** Above that, the competitors with cloud backends handle more — see [limits](/docs/limits).

## Pick something else if

- **Your graph is > 5M nodes and you can upload the data.** Cosmograph or Graphistry will serve you better.
- **You need community detection, centrality, or rich graph algorithms built in.** Gephi's your tool — Knotviz has none of those today.
- **You need Gephi-exact layouts for publication.** Knotviz reads GEXF round-trip but doesn't reproduce Gephi's layouts identically.

## Migration

- **Gephi** → Export as GEXF, drop in. Positions preserved via `viz:position`.
- **NetworkX** → `nx.node_link_data(G)`, rename `links` to `edges`, drop as JSON.
- **Neo4j** → Cypher export + `jq` transform. See [JSON](/docs/input-formats/json).
- **Spreadsheet** → Save as CSV, drop as edge list or pair.


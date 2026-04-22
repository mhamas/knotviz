---
title: Compare
description: How Knotviz differs from Gephi, Cosmograph, and Graphistry.
---

*Knotviz is the zero-setup, free, open-source browser option. Open a tab, drop a file, your data never leaves the machine. If your graph fits a browser tab, it opens here in five seconds.*

## At a glance

| | Knotviz | Gephi | Cosmograph | Graphistry |
|---|---|---|---|---|
| Runs in | Browser tab | Desktop app | Browser tab | Browser + server |
| Install | None | Download + run (JRE bundled) | Sign-in | Python SDK + hosted/self-hosted server |
| Data location | Stays in the browser | Local filesystem | Stays in the browser (DuckDB-WASM) | Uploaded to the Graphistry server |
| Practical size | ~1M on a laptop | ~50–100k before the UI slows | Millions+ (client-side WebGL) | Very large (server GPU) |
| Cost | Free, open-source | Free, open-source | Free tier + paid (Team, Enterprise) | Free tier (Hub) + paid (Pro, Enterprise) |
| GPU | WebGL in the browser | CPU (core product) | WebGL in the browser | Server-side GPU |
| Filter & search | Typed multi-filter; label + id search | GUI filters with AND/OR / nested queries | Visual filters, histograms, timeline (DuckDB under the hood) | Visual filters, clustering, search, timebars |
| Best for | Private work on ≤1M graphs | Offline analysis, publication-quality layouts, rich graph algorithms | Large graphs with rich built-in query | Enterprise / security analytics with server GPUs |

## Pick Knotviz if

- **You want zero setup, for free.** Open a tab, drop a file. No install, no sign-in, no upload — and no paid tier to bump into.
- **Your data must stay on the machine.** Regulated data, sensitive investigations, air-gapped environments — both Knotviz and Cosmograph keep data in the browser, but Knotviz is open-source and has no account gate.
- **Your graph is ≤ 1M nodes.** Past that, the competitors with bigger scale envelopes handle more — see [limits](/docs/limits).

## Pick something else if

- **You need graph algorithms** — community detection, centrality, shortest path, modularity. Gephi has a deep plugin ecosystem for these; Knotviz has none today.
- **You need publication-exact layouts from Gephi.** Knotviz reads GEXF round-trip but doesn't reproduce Gephi's layout algorithms identically.
- **You want richer built-in query on very large graphs.** Cosmograph has visual histograms, timebars, and multi-dimensional filters over a DuckDB engine — more analytical than Knotviz's filter panel, and they push further on interactive scale.
- **You're doing enterprise security analytics with server-side GPUs.** Graphistry is purpose-built for that workflow: Python SDK, GPU server, enterprise support.

## Migration

- **Gephi** → File → Export → `.gexf`. Drop the `.gexf` into Knotviz; positions ride in `<viz:position>`.
- **NetworkX** → `nx.node_link_data(G)`, rename `links` to `edges`, add `version: "1"`, drop as JSON. Full snippet on the [JSON page](/docs/input-formats/json#networkx).
- **Neo4j** → APOC JSON export + a `jq` transform to stringify ids. Full snippet on the [JSON page](/docs/input-formats/json#neo4j-apoc-json-export).
- **Spreadsheet** → Save as CSV, drop as [edge list](/docs/input-formats/csv-edge-list) (just connections) or [nodes + edges pair](/docs/input-formats/csv-pair) (connections + per-node properties).

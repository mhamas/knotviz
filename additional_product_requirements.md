## Product Specification Additions

### 1. Graph Export & Position Persistence

**Export**
- After running the physics simulation, add a **"Download Graph" option**
- The exported graph file should include **node position data** (x/y coordinates) enriched from the simulation result

**Import / Position Respect**
- When a graph file **containing existing node positions** is loaded into the program, those positions should be **honored on initialization**
- The layout engine should skip or defer physics simulation for pre-positioned nodes

---

### 2. Node Color Gradient Visualization (Right Panel UI)

A new UI panel on the right side to visualize a single node property as a color gradient across all **active nodes** (i.e. nodes passing all current filters).

**Controls**
- Property selector — choose a single property to visualize
- Color scheme selector — choose a gradient/palette

**Coloring Behavior by Property Type**

| Type | Behavior |
|------|----------|
| **Number** | Continuous gradient mapped across the value range |
| **Boolean** | Binary partition into 2 colors |
| **String** | Nodes with the same string value share a color; distinct values get distinct colors (with 4 tonal strengths implied) |
| **Dates** | Same as numbers



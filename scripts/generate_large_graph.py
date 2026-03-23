#!/usr/bin/env python3
"""Generate large graph JSON files for testing.

Each node has properties of every type (number, string, boolean, date).
Edge count per node: 50% chance of 1, 30% chance of 2, 20% chance of 3.
"""

import json
import random
import sys
from datetime import datetime, timedelta

CATEGORIES = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"]
DATE_START = datetime(2018, 1, 1)
DATE_RANGE_DAYS = 365 * 7  # 7 years


def random_date() -> str:
    delta = timedelta(days=random.randint(0, DATE_RANGE_DAYS))
    return (DATE_START + delta).strftime("%Y-%m-%d")


def generate_graph(node_count: int, output_path: str) -> None:
    print(f"Generating {node_count:,} nodes → {output_path}")

    nodes = []
    for i in range(node_count):
        node = {
            "id": str(i),
            "label": f"node_{i}",
            "properties": {
                "score": round(random.uniform(0, 100), 2),
                "category": random.choice(CATEGORIES),
                "is_active": random.random() > 0.3,
                "created_at": random_date(),
            },
        }
        nodes.append(node)
        if (i + 1) % 500_000 == 0:
            print(f"  nodes: {i + 1:,}")

    print(f"  generating edges...")
    edges = []
    for i in range(node_count):
        # 50% → 1 edge, 30% → 2 edges, 20% → 3 edges
        r = random.random()
        if r < 0.5:
            edge_count = 1
        elif r < 0.8:
            edge_count = 2
        else:
            edge_count = 3

        targets = set()
        for _ in range(edge_count):
            target = random.randint(0, node_count - 1)
            while target == i or target in targets:
                target = random.randint(0, node_count - 1)
            targets.add(target)
            edges.append({"source": str(i), "target": str(target)})

        if (i + 1) % 500_000 == 0:
            print(f"  edges for node: {i + 1:,} (total edges: {len(edges):,})")

    graph = {"version": "1", "nodes": nodes, "edges": edges}

    print(f"  writing JSON ({len(nodes):,} nodes, {len(edges):,} edges)...")
    with open(output_path, "w") as f:
        json.dump(graph, f, separators=(",", ":"))

    import os
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  done: {size_mb:.0f} MB")


if __name__ == "__main__":
    sizes = [2_000_000, 3_000_000, 4_000_000, 5_000_000]
    output_dir = "graphs_for_manual_testing"

    for size in sizes:
        label = f"{size // 1_000_000}M"
        path = f"{output_dir}/graph_{label}.json"
        generate_graph(size, path)
        print()

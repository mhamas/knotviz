/**
 * Generates a 50k-node social network graph with realistic cluster structure.
 *
 * Model:
 * - ~200 communities of varying sizes (power-law distributed, 50–800 nodes)
 * - Within a community, nodes connect preferentially (80% of edges are intra-community)
 * - Between communities, a few "bridge" nodes connect clusters (20% of edges)
 * - Each node has 1–5 edges, weighted towards 2–3 (realistic degree distribution)
 * - Communities have thematic names (cities) for realism
 *
 * Usage: node scripts/gen-social-50k.mjs
 */

import { writeFileSync } from 'fs';

const TOTAL_NODES = 50_000;

// --- Community generation ---
// Power-law-ish community sizes summing to TOTAL_NODES
function generateCommunitySizes(total) {
  const sizes = [];
  let remaining = total;

  while (remaining > 0) {
    // Power-law: many small communities, few large ones
    const base = 50 + Math.floor(Math.random() * 150); // 50-200 base
    const scale = Math.random() < 0.15 ? 3 + Math.random() * 2 : 1; // 15% chance of large community
    const size = Math.min(Math.floor(base * scale), remaining);
    sizes.push(size);
    remaining -= size;
  }

  return sizes;
}

const communitySizes = generateCommunitySizes(TOTAL_NODES);
const numCommunities = communitySizes.length;

// Assign community labels
const communityNames = [
  'Tech', 'Finance', 'Arts', 'Sports', 'Science', 'Music', 'Gaming',
  'Food', 'Travel', 'Health', 'Education', 'Media', 'Fashion', 'Auto',
  'Crypto', 'Film', 'Books', 'Fitness', 'Politics', 'Design',
];

// Build community ranges
const communityRanges = []; // [{start, end, name}]
let offset = 0;
for (let c = 0; c < numCommunities; c++) {
  communityRanges.push({
    start: offset,
    end: offset + communitySizes[c],
    name: communityNames[c % communityNames.length],
    index: c,
  });
  offset += communitySizes[c];
}

// --- Node generation ---
const firstNames = [
  'Emma', 'Liam', 'Sofia', 'Noah', 'Mia', 'James', 'Ava', 'Oliver',
  'Luna', 'Ethan', 'Aria', 'Lucas', 'Zoe', 'Mason', 'Lily', 'Alex',
  'Chloe', 'Jack', 'Ella', 'Leo', 'Maya', 'Ben', 'Nora', 'Sam',
  'Ivy', 'Max', 'Ruby', 'Dan', 'Ada', 'Tom', 'Eve', 'Ray',
];

const nodes = [];
for (let i = 0; i < TOTAL_NODES; i++) {
  const community = communityRanges.find((c) => i >= c.start && i < c.end);
  const name = firstNames[i % firstNames.length];
  const surname = `${community.name}${Math.floor((i - community.start) / firstNames.length)}`;

  nodes.push({
    id: 'n' + i,
    label: `${name} ${surname}`,
    properties: {
      community: community.name + '_' + community.index,
      followers: Math.floor(Math.pow(Math.random(), 2) * 10000), // power-law followers
      isVerified: Math.random() < 0.05, // 5% verified
      joinDate: new Date(
        2015, 0, 1 + Math.floor(Math.random() * 3650)
      ).toISOString().split('T')[0],
      activityScore: Math.round(Math.random() * 100 * 10) / 10,
    },
  });
}

// --- Edge generation ---
// For each node: 1-5 edges, weighted towards 2-3
// 80% intra-community, 20% inter-community (bridges)
const edges = [];
const edgeSet = new Set(); // deduplicate

function addEdge(source, target) {
  if (source === target) return;
  const key = source < target ? `${source}-${target}` : `${target}-${source}`;
  if (edgeSet.has(key)) return;
  edgeSet.add(key);
  edges.push({ source: 'n' + source, target: 'n' + target });
}

// Pick weighted degree: 1-5, favoring 2-3
function pickDegree() {
  const r = Math.random();
  if (r < 0.15) return 1;
  if (r < 0.45) return 2;
  if (r < 0.75) return 3;
  if (r < 0.92) return 4;
  return 5;
}

// Pick a random node within the same community (preferring nearby nodes for clustering)
function pickIntraCommunity(nodeIdx, community) {
  // Triangle-closing: with 30% chance, try to connect to a neighbor's neighbor
  // Otherwise pick random within community
  const range = community.end - community.start;
  // Gaussian-ish: prefer nodes close in index (simulates knowing nearby people)
  const offset = Math.floor(Math.abs(gaussianRandom()) * range * 0.3) + 1;
  const direction = Math.random() < 0.5 ? 1 : -1;
  let target = nodeIdx + direction * offset;
  // Clamp to community
  target = Math.max(community.start, Math.min(community.end - 1, target));
  return target;
}

// Pick a node from a different community (bridge connection)
function pickInterCommunity(nodeIdx) {
  // Prefer "nearby" communities (simulates geographic/interest proximity)
  const myCommunity = communityRanges.find((c) => nodeIdx >= c.start && nodeIdx < c.end);
  const myIdx = myCommunity.index;

  // 60% chance: connect to adjacent community, 40%: random
  let targetCommunity;
  if (Math.random() < 0.6 && numCommunities > 1) {
    const delta = Math.random() < 0.5 ? -1 : 1;
    const targetIdx = ((myIdx + delta) % numCommunities + numCommunities) % numCommunities;
    targetCommunity = communityRanges[targetIdx];
  } else {
    targetCommunity = communityRanges[Math.floor(Math.random() * numCommunities)];
  }

  if (targetCommunity.index === myIdx) {
    // Fell back to same community, pick any other
    const otherIdx = (myIdx + 1) % numCommunities;
    targetCommunity = communityRanges[otherIdx];
  }

  return targetCommunity.start + Math.floor(Math.random() * (targetCommunity.end - targetCommunity.start));
}

function gaussianRandom() {
  // Box-Muller
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

for (let i = 0; i < TOTAL_NODES; i++) {
  const degree = pickDegree();
  const community = communityRanges.find((c) => i >= c.start && i < c.end);

  for (let j = 0; j < degree; j++) {
    const isIntra = Math.random() < 0.8;

    if (isIntra) {
      const target = pickIntraCommunity(i, community);
      addEdge(i, target);
    } else {
      const target = pickInterCommunity(i);
      addEdge(i, target);
    }
  }
}

// --- Output ---
const data = JSON.stringify({ version: '1', nodes, edges });
writeFileSync('example_graph_50k.json', data);

// Stats
const avgDegree = (edges.length * 2 / TOTAL_NODES).toFixed(1);
console.log(`Nodes: ${TOTAL_NODES}`);
console.log(`Edges: ${edges.length}`);
console.log(`Communities: ${numCommunities} (sizes: ${Math.min(...communitySizes)}–${Math.max(...communitySizes)})`);
console.log(`Avg degree: ${avgDegree}`);
console.log(`Size: ${(Buffer.byteLength(data) / 1024 / 1024).toFixed(1)} MB`);

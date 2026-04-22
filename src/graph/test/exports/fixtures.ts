import type { ExportSnapshot } from '../../lib/exports/types'

/**
 * Small but type-complete snapshot for exporter unit tests. Every declared
 * PropertyType is represented; structural label/x/y also covered; one edge
 * has a weight and one doesn't.
 */
export function sampleSnapshot(): ExportSnapshot {
  return {
    nodes: [
      {
        id: 'n1',
        x: 10,
        y: 20,
        label: 'Alice',
        properties: {
          age: 34,
          active: true,
          joined: '2021-03-15',
          community: 'Tech',
          tags: ['engineer', 'founder'],
        },
      },
      {
        id: 'n2',
        x: -5,
        y: 8,
        label: 'Bob',
        properties: {
          age: 28,
          active: false,
          joined: '2022-06-20',
          community: 'Arts',
          tags: ['designer'],
        },
      },
      {
        // Node with no label and no properties — exercises "missing" paths.
        id: 'n3',
        x: 0,
        y: 0,
        properties: {},
      },
    ],
    edges: [
      { source: 'n1', target: 'n2', weight: 0.8 },
      { source: 'n2', target: 'n3' },
    ],
    propertyMetas: [
      { key: 'age', type: 'number' },
      { key: 'active', type: 'boolean' },
      { key: 'joined', type: 'date' },
      { key: 'community', type: 'string' },
      { key: 'tags', type: 'string[]' },
    ],
  }
}

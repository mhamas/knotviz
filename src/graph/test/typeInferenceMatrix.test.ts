/**
 * End-to-end type inference / declaration matrix.
 *
 * For each supported input format, verify that after `parseX()` the resulting
 * NodeInput[] carries the right values AND that `detectPropertyTypes()` — the
 * pure utility that mirrors the inline inference inside `GraphBuilder` — produces
 * the expected PropertyType for every property.
 *
 * Each format is driven through the five PropertyTypes (`number`, `string`,
 * `boolean`, `date`, `string[]`) plus the edge cases that matter for real
 * files: all-null columns, leading-zero strings, mixed content, boolean
 * casings, and ISO date variants.
 *
 * The end of the file also checks cross-format consistency: the same logical
 * graph represented in JSON / CSV-pair / GraphML / GEXF should resolve to the
 * same PropertyType map.
 */
import { describe, expect, it, vi } from 'vitest'
import { detectPropertyTypes } from '../lib/detectPropertyTypes'
import { GraphBuilder } from '../lib/graphBuilder'
import { parseJSON } from '../lib/parseJSON'
import { parseNodeEdgeCSV } from '../lib/parseNodeEdgeCSV'
import { parseGraphML } from '../lib/parseGraphML'
import { parseGEXF } from '../lib/parseGEXF'
import type { GraphData, NodeInput, PropertyType } from '../types'

function typesOf(nodes: NodeInput[]): Record<string, PropertyType> {
  return Object.fromEntries(detectPropertyTypes(nodes))
}

// ─── JSON ────────────────────────────────────────────────────────────────
// Values arrive typed (JSON native types) and are passed through unchanged.
// detectPropertyTypes runs on the raw values.

describe('Type inference — JSON (no declarations; all inferred)', () => {
  it('infers every PropertyType from native JSON values', () => {
    const graph = parseJSON(
      JSON.stringify({
        version: '1',
        nodes: [
          { id: 'n1', properties: { age: 34, community: 'Tech', active: true, joined: '2021-03-15', tags: ['founder'] } },
          { id: 'n2', properties: { age: 28, community: 'Arts', active: false, joined: '2022-06-20', tags: ['designer', 'advisor'] } },
          { id: 'n3', properties: { age: 45, community: 'Tech', active: true, joined: '2020-01-05', tags: ['engineer'] } },
        ],
        edges: [],
      }),
    ) as GraphData

    expect(typesOf(graph.nodes)).toEqual({
      age: 'number',
      community: 'string',
      active: 'boolean',
      joined: 'date',
      tags: 'string[]',
    })
  })

  it('re-infers even when nodePropertiesMetadata is present (metadata is description-only, not type)', () => {
    const graph = parseJSON(
      JSON.stringify({
        version: '1',
        nodePropertiesMetadata: {
          age: { description: 'years old' },
          community: { description: 'cluster label' },
        },
        nodes: [
          { id: 'n1', properties: { age: 34, community: 'Tech' } },
          { id: 'n2', properties: { age: 28, community: 'Arts' } },
        ],
        edges: [],
      }),
    ) as GraphData
    expect(typesOf(graph.nodes)).toEqual({ age: 'number', community: 'string' })
  })

  it('treats date strings with time + timezone as date', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { ts: '2021-03-15T12:00:00Z' } },
      { id: 'n2', properties: { ts: '2021-03-16T13:30:45+02:00' } },
      { id: 'n3', properties: { ts: '2021-03-17T00:00:00.123Z' } },
    ]
    expect(typesOf(nodes)).toEqual({ ts: 'date' })
  })

  it('treats one non-ISO string among dates as string', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { ts: '2021-03-15' } },
      { id: 'n2', properties: { ts: 'March 16 2021' } },
    ]
    expect(typesOf(nodes)).toEqual({ ts: 'string' })
  })

  it('treats mixed boolean + number as string (neither pure-boolean nor pure-number)', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { x: true } },
      { id: 'n2', properties: { x: 1 } },
    ]
    expect(typesOf(nodes)).toEqual({ x: 'string' })
  })

  it('defaults an all-null column to number', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { empty: null } },
      { id: 'n2', properties: { empty: null } },
    ]
    expect(typesOf(nodes)).toEqual({ empty: 'number' })
  })

  it('treats empty-array column as string[]', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { tags: [] } },
      { id: 'n2', properties: { tags: ['a'] } },
    ]
    expect(typesOf(nodes)).toEqual({ tags: 'string[]' })
  })

  it('infers number across int, float, negative, and scientific-notation values', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { x: 42 } },
      { id: 'n2', properties: { x: -3.14 } },
      { id: 'n3', properties: { x: 1.5e3 } },
      { id: 'n4', properties: { x: 0 } },
    ]
    expect(typesOf(nodes)).toEqual({ x: 'number' })
  })

  it('ignores nulls mixed with numbers and still infers number', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { x: 42 } },
      { id: 'n2', properties: { x: null } },
      { id: 'n3', properties: { x: 28 } },
    ]
    expect(typesOf(nodes)).toEqual({ x: 'number' })
  })

  it('treats pipe-encoded string (not array) as string, even though CSV would infer the same', () => {
    // Cross-format consistency check: if a JSON author mistakenly writes a
    // pipe-delimited string instead of an array, it's still classified as a
    // plain string — NOT auto-converted to string[].
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { tags: 'founder|advisor' } },
      { id: 'n2', properties: { tags: 'designer' } },
    ]
    expect(typesOf(nodes)).toEqual({ tags: 'string' })
  })
})

// ─── CSV pair: inferred (no :type suffixes) ─────────────────────────────
// Values arrive as strings, inferColumnType + parseTypedCell coerce them.

describe('Type inference — CSV pair (no type suffixes in headers)', () => {
  const nodesCsv = [
    'id,age,community,active,joined',
    'n1,34,Tech,true,2021-03-15',
    'n2,28,Arts,false,2022-06-20',
    'n3,45,Tech,true,2020-01-05',
  ].join('\n')
  const edgesCsv = 'source,target\nn1,n2\nn2,n3'

  it('infers number / string / boolean / date from sample values', () => {
    const graph = parseNodeEdgeCSV(nodesCsv, edgesCsv)
    expect(typesOf(graph.nodes)).toEqual({
      age: 'number',
      community: 'string',
      active: 'boolean',
      joined: 'date',
    })
  })

  it('infers string[] when every non-empty cell contains a pipe', () => {
    const withPipes = [
      'id,tags',
      'n1,founder|advisor',
      'n2,designer|engineer',
    ].join('\n')
    const graph = parseNodeEdgeCSV(withPipes, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ tags: 'string[]' })
    expect(graph.nodes[0].properties?.tags).toEqual(['founder', 'advisor'])
    expect(graph.nodes[1].properties?.tags).toEqual(['designer', 'engineer'])
  })

  it('falls back to string when only some cells contain pipes (mixed is ambiguous)', () => {
    const mixed = ['id,notes', 'n1,a|b', 'n2,plain text', 'n3,c|d'].join('\n')
    const graph = parseNodeEdgeCSV(mixed, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ notes: 'string' })
    expect(graph.nodes[0].properties?.notes).toBe('a|b')
  })

  it(':string hint still forces string interpretation of a pipe column (escape hatch)', () => {
    const csv = ['id,slug:string', 'n1,a|b', 'n2,c|d'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ slug: 'string' })
    expect(graph.nodes[0].properties?.slug).toBe('a|b')
  })

  it('preserves leading-zero integers as strings (zip-code guard)', () => {
    const csv = ['id,zip', 'n1,0012', 'n2,0234', 'n3,9999'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ zip: 'string' })
    expect(graph.nodes[0].properties?.zip).toBe('0012')
  })

  it('defaults an all-empty column to number (parity with JSON all-null behaviour)', () => {
    // Empty CSV columns are preserved as `null` on every node so the column is
    // still discoverable downstream (GraphBuilder resolves the key → 'number'
    // via the empty-state default, then backfills every slot with 0). Matches
    // JSON's handling of all-null columns.
    const csv = ['id,blank', 'n1,', 'n2,', 'n3,'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ blank: 'number' })
    expect(graph.nodes[0].properties?.blank).toBeNull()
  })

  it('infers from non-empty cells when some cells are empty', () => {
    const csv = ['id,age', 'n1,34', 'n2,', 'n3,28'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ age: 'number' })
  })

  it('treats mixed numeric + string as string', () => {
    const csv = ['id,mixed', 'n1,42', 'n2,hello', 'n3,7'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ mixed: 'string' })
  })

  it('autodetects tab delimiter (TSV)', () => {
    const tsv = ['id\tage', 'n1\t34', 'n2\t28'].join('\n')
    const graph = parseNodeEdgeCSV(tsv, 'source\ttarget\nn1\tn2')
    expect(typesOf(graph.nodes)).toEqual({ age: 'number' })
  })

  // ─── `label` dual-role: structural display AND filterable property ─────

  it('exposes the structural `label` column as a filterable property too', () => {
    const csv = ['id,label,age', 'n1,Alice,34', 'n2,Bob,28'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    // Structural: still drives node display.
    expect(graph.nodes[0].label).toBe('Alice')
    expect(graph.nodes[1].label).toBe('Bob')
    // Property: also available for filter/colour/group.
    expect(graph.nodes[0].properties?.label).toBe('Alice')
    expect(graph.nodes[1].properties?.label).toBe('Bob')
    expect(typesOf(graph.nodes)).toMatchObject({ label: 'string', age: 'number' })
  })

  it('treats `Label` (mixed case) the same way — dual role', () => {
    const csv = ['ID,Label', 'n1,Alice', 'n2,Bob'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].label).toBe('Alice')
    expect(graph.nodes[0].properties?.Label).toBe('Alice')
  })

  it('honours `label:string` typed header — same dual treatment', () => {
    const csv = ['id,label:string', 'n1,Alice', 'n2,Bob'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].label).toBe('Alice')
    expect(graph.nodes[0].properties?.label).toBe('Alice')
  })

  it('`id`, `x`, `y` stay structural-only (not surfaced as properties)', () => {
    const csv = ['id,x,y,age', 'n1,10,20,34', 'n2,30,40,28'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].x).toBe(10)
    expect(graph.nodes[0].y).toBe(20)
    // `id`, `x`, `y` must NOT appear in properties — they're consumed structurally only.
    expect(graph.nodes[0].properties?.id).toBeUndefined()
    expect(graph.nodes[0].properties?.x).toBeUndefined()
    expect(graph.nodes[0].properties?.y).toBeUndefined()
    expect(typesOf(graph.nodes)).toEqual({ age: 'number' })
  })

  it('mixed empty/filled `label` cells: the property mirrors only the filled ones', () => {
    const csv = ['id,label', 'n1,Alice', 'n2,', 'n3,Carol'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].label).toBe('Alice')
    expect(graph.nodes[0].properties?.label).toBe('Alice')
    // Empty label cell — node.label absent AND property cell dropped (consistent with
    // other missing-cell behaviour; GraphBuilder.finalize() backfills downstream).
    expect(graph.nodes[1].label).toBeUndefined()
    expect(graph.nodes[1].properties?.label).toBeUndefined()
    expect(graph.nodes[2].label).toBe('Carol')
  })

  it('all-case boolean samples (TRUE / False / 1 / 0) infer as boolean', () => {
    // parseTypedCell supports mixed case + 1/0, but only when declared via :boolean.
    // Inference (coerceSampleValue) only picks up lowercase true/false, so this path
    // documents current behaviour — TRUE / FALSE stay as strings unless declared.
    const csv = ['id,active:boolean', 'n1,TRUE', 'n2,False', 'n3,1', 'n4,0'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].properties?.active).toBe(true)
    expect(graph.nodes[1].properties?.active).toBe(false)
    expect(graph.nodes[2].properties?.active).toBe(true)
    expect(graph.nodes[3].properties?.active).toBe(false)
    expect(typesOf(graph.nodes)).toEqual({ active: 'boolean' })
  })

  it('CSV (TSV) with a mix of declared and inferred columns works together', () => {
    const tsv = [
      'id\tlabel\tage:number\tjoined',
      'n1\tAlice\t34\t2021-03-15',
      'n2\tBob\t28\t2022-06-20',
    ].join('\n')
    const graph = parseNodeEdgeCSV(tsv, 'source\ttarget\nn1\tn2')
    expect(typesOf(graph.nodes)).toMatchObject({
      label: 'string',
      age: 'number',
      joined: 'date',
    })
  })
})

// ─── JSON without `properties` at all ─────────────────────────────────────

describe('JSON — nodes without a properties field', () => {
  it('nodes with no `properties` key at all contribute no type entries', () => {
    const graph = parseJSON(
      JSON.stringify({
        version: '1',
        nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        edges: [],
      }),
    ) as GraphData
    expect(typesOf(graph.nodes)).toEqual({})
  })

  it('a single node carrying properties defines the type for the whole graph', () => {
    const graph = parseJSON(
      JSON.stringify({
        version: '1',
        nodes: [
          { id: 'n1' },
          { id: 'n2', properties: { age: 34 } },
          { id: 'n3' },
        ],
        edges: [],
      }),
    ) as GraphData
    expect(typesOf(graph.nodes)).toEqual({ age: 'number' })
  })
})

// ─── GraphML / GEXF type-mismatch values ──────────────────────────────────

describe('GraphML / GEXF — declared-type coercion drops unmappable values', () => {
  it('GraphML: an `int`-typed value that does not parse as a number is dropped', () => {
    const xml = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="k_age" for="node" attr.name="age" attr.type="int"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="k_age">34</data></node>
    <node id="n2"><data key="k_age">thirty-four</data></node>
  </graph>
</graphml>`
    const graph = parseGraphML(xml)
    expect(graph.nodes[0].properties?.age).toBe(34)
    // Unparseable value is dropped silently (preserves "rest of graph loads").
    expect(graph.nodes[1].properties?.age).toBeUndefined()
  })

  it('GEXF: a `boolean`-typed value that is not `true`/`false` is dropped', () => {
    const xml = `<?xml version="1.0"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph>
    <attributes class="node">
      <attribute id="a_active" title="active" type="boolean"/>
    </attributes>
    <nodes>
      <node id="n1"><attvalues><attvalue for="a_active" value="true"/></attvalues></node>
      <node id="n2"><attvalues><attvalue for="a_active" value="maybe"/></attvalues></node>
    </nodes>
  </graph>
</gexf>`
    const graph = parseGEXF(xml)
    expect(graph.nodes[0].properties?.active).toBe(true)
    expect(graph.nodes[1].properties?.active).toBeUndefined()
  })

  it('GEXF empty liststring cell is treated as missing (consistent with other empty cells)', () => {
    // An empty raw value returns undefined from coerceByGEXFType regardless of
    // declared type, so the property is dropped for that node. GraphBuilder.finalize()
    // still fills it with [] (the string[] default) as long as at least one other
    // node carries a value and establishes the type.
    const xml = `<?xml version="1.0"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph>
    <attributes class="node">
      <attribute id="a_tags" title="tags" type="liststring"/>
    </attributes>
    <nodes>
      <node id="n1"><attvalues><attvalue for="a_tags" value=""/></attvalues></node>
      <node id="n2"><attvalues><attvalue for="a_tags" value="founder|advisor"/></attvalues></node>
    </nodes>
  </graph>
</gexf>`
    const graph = parseGEXF(xml)
    expect(graph.nodes[0].properties?.tags).toBeUndefined()
    expect(graph.nodes[1].properties?.tags).toEqual(['founder', 'advisor'])
    // detectPropertyTypes still resolves the column to string[] thanks to n2.
    expect(typesOf(graph.nodes)).toEqual({ tags: 'string[]' })
  })
})

// ─── CSV pair: declared (with :type suffixes) ──────────────────────────

describe('Type declarations — CSV pair (explicit :type suffixes)', () => {
  it('honours explicit :type hints for every PropertyType (including string[])', () => {
    const csv = [
      'id,age:number,community:string,active:boolean,joined:date,tags:string[]',
      'n1,34,Tech,true,2021-03-15,founder|advisor',
      'n2,28,Arts,false,2022-06-20,designer',
    ].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({
      age: 'number',
      community: 'string',
      active: 'boolean',
      joined: 'date',
      tags: 'string[]',
    })
    expect(graph.nodes[0].properties?.tags).toEqual(['founder', 'advisor'])
  })

  it(':string forces string even when values look like numbers (escape hatch)', () => {
    const csv = ['id,zip:string', 'n1,12345', 'n2,67890'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(typesOf(graph.nodes)).toEqual({ zip: 'string' })
    expect(graph.nodes[0].properties?.zip).toBe('12345')
  })

  it(':string[] correctly decodes escaped pipe characters', () => {
    const csv = ['id,tags:string[]', 'n1,a\\|b|c', 'n2,solo'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].properties?.tags).toEqual(['a|b', 'c'])
    expect(graph.nodes[1].properties?.tags).toEqual(['solo'])
  })

  it('invalid :date value — soft-fails (warns + drops the cell), does not throw', () => {
    const csv = ['id,joined:date', 'n1,2021-03-15', 'n2,March 15 2021'].join('\n')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].properties?.joined).toBe('2021-03-15')
    expect(graph.nodes[1].properties?.joined).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('invalid :number value — same soft-fail pattern (dropped cell, warning emitted)', () => {
    const csv = ['id,age:number', 'n1,34', 'n2,thirty-four'].join('\n')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(graph.nodes[0].properties?.age).toBe(34)
    expect(graph.nodes[1].properties?.age).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('soft-fails are reported to the onWarning callback with structured detail', () => {
    const csv = [
      'id,age:number,joined:date',
      'n1,34,2021-03-15',
      'n2,thirty-four,March 2021',
      'n3,28,2022-06-20',
    ].join('\n')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const collected: Array<{ propertyKey?: string; value?: string }> = []
    parseNodeEdgeCSV(csv, 'source,target\n', {
      onWarning: (w) => collected.push({ propertyKey: w.propertyKey, value: w.value }),
    })
    expect(collected).toEqual([
      { propertyKey: 'age', value: 'thirty-four' },
      { propertyKey: 'joined', value: 'March 2021' },
    ])
    warn.mockRestore()
  })
})

// ─── GraphML: attr.type declarations ───────────────────────────────────

describe('Type declarations — GraphML (attr.type honoured, then re-inferred downstream)', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="k_age" for="node" attr.name="age" attr.type="int"/>
  <key id="k_height" for="node" attr.name="height" attr.type="double"/>
  <key id="k_community" for="node" attr.name="community" attr.type="string"/>
  <key id="k_active" for="node" attr.name="active" attr.type="boolean"/>
  <key id="k_joined" for="node" attr.name="joined" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="k_age">34</data>
      <data key="k_height">1.75</data>
      <data key="k_community">Tech</data>
      <data key="k_active">true</data>
      <data key="k_joined">2021-03-15</data>
    </node>
    <node id="n2">
      <data key="k_age">28</data>
      <data key="k_height">1.62</data>
      <data key="k_community">Arts</data>
      <data key="k_active">false</data>
      <data key="k_joined">2022-06-20</data>
    </node>
  </graph>
</graphml>`

  it('coerces int / double to number, boolean to boolean, string to string', () => {
    const graph = parseGraphML(xml)
    expect(typeof graph.nodes[0].properties?.age).toBe('number')
    expect(typeof graph.nodes[0].properties?.height).toBe('number')
    expect(typeof graph.nodes[0].properties?.community).toBe('string')
    expect(typeof graph.nodes[0].properties?.active).toBe('boolean')
  })

  it('detectPropertyTypes re-infers string columns as date when every value is ISO 8601', () => {
    // NOTE: GraphML has no "date" attr.type — the convention is to declare
    // the column as attr.type="string" and let Knotviz detect ISO dates.
    const graph = parseGraphML(xml)
    const types = typesOf(graph.nodes)
    expect(types).toMatchObject({
      age: 'number',
      height: 'number',
      community: 'string',
      active: 'boolean',
      joined: 'date',
    })
  })

  it('GraphML does NOT support string[] natively — pipe-joined strings stay as string', () => {
    // GraphML has no list type in the spec Knotviz parses; a pipe-delimited
    // value inside an attr.type="string" column is just a string.
    const xmlArr = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="k_tags" for="node" attr.name="tags" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="k_tags">founder|advisor</data></node>
    <node id="n2"><data key="k_tags">designer</data></node>
  </graph>
</graphml>`
    const graph = parseGraphML(xmlArr)
    expect(typesOf(graph.nodes)).toEqual({ tags: 'string' })
    expect(graph.nodes[0].properties?.tags).toBe('founder|advisor')
  })
})

// ─── GEXF: attribute type declarations ─────────────────────────────────

describe('Type declarations — GEXF (attribute type honoured; liststring supports arrays)', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph defaultedgetype="directed">
    <attributes class="node">
      <attribute id="a_age" title="age" type="integer"/>
      <attribute id="a_height" title="height" type="double"/>
      <attribute id="a_community" title="community" type="string"/>
      <attribute id="a_active" title="active" type="boolean"/>
      <attribute id="a_joined" title="joined" type="string"/>
      <attribute id="a_tags" title="tags" type="liststring"/>
    </attributes>
    <nodes>
      <node id="n1">
        <attvalues>
          <attvalue for="a_age" value="34"/>
          <attvalue for="a_height" value="1.75"/>
          <attvalue for="a_community" value="Tech"/>
          <attvalue for="a_active" value="true"/>
          <attvalue for="a_joined" value="2021-03-15"/>
          <attvalue for="a_tags" value="founder|advisor"/>
        </attvalues>
      </node>
      <node id="n2">
        <attvalues>
          <attvalue for="a_age" value="28"/>
          <attvalue for="a_height" value="1.62"/>
          <attvalue for="a_community" value="Arts"/>
          <attvalue for="a_active" value="false"/>
          <attvalue for="a_joined" value="2022-06-20"/>
          <attvalue for="a_tags" value="designer"/>
        </attvalues>
      </node>
    </nodes>
  </graph>
</gexf>`

  it('coerces each declared type to its native JS type', () => {
    const graph = parseGEXF(xml)
    const p = graph.nodes[0].properties!
    expect(typeof p.age).toBe('number')
    expect(typeof p.height).toBe('number')
    expect(typeof p.community).toBe('string')
    expect(typeof p.active).toBe('boolean')
    expect(Array.isArray(p.tags)).toBe(true)
    expect(p.tags).toEqual(['founder', 'advisor'])
  })

  it('detectPropertyTypes produces the expected map, with ISO-string "joined" re-inferred as date', () => {
    const graph = parseGEXF(xml)
    expect(typesOf(graph.nodes)).toMatchObject({
      age: 'number',
      height: 'number',
      community: 'string',
      active: 'boolean',
      joined: 'date',
      tags: 'string[]',
    })
  })
})

// ─── Cross-format consistency ──────────────────────────────────────────

describe('Cross-format consistency — same logical graph → same type map', () => {
  const expected: Record<string, PropertyType> = {
    age: 'number',
    community: 'string',
    active: 'boolean',
    joined: 'date',
  }

  it('JSON + CSV-pair + GraphML + GEXF agree on the four common types', () => {
    const jsonGraph = parseJSON(
      JSON.stringify({
        version: '1',
        nodes: [
          { id: 'n1', properties: { age: 34, community: 'Tech', active: true, joined: '2021-03-15' } },
          { id: 'n2', properties: { age: 28, community: 'Arts', active: false, joined: '2022-06-20' } },
        ],
        edges: [],
      }),
    ) as GraphData

    const csvGraph = parseNodeEdgeCSV(
      [
        'id,age,community,active,joined',
        'n1,34,Tech,true,2021-03-15',
        'n2,28,Arts,false,2022-06-20',
      ].join('\n'),
      'source,target\nn1,n2',
    )

    const graphmlGraph = parseGraphML(`<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="k_age" for="node" attr.name="age" attr.type="int"/>
  <key id="k_community" for="node" attr.name="community" attr.type="string"/>
  <key id="k_active" for="node" attr.name="active" attr.type="boolean"/>
  <key id="k_joined" for="node" attr.name="joined" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="k_age">34</data>
      <data key="k_community">Tech</data>
      <data key="k_active">true</data>
      <data key="k_joined">2021-03-15</data>
    </node>
    <node id="n2">
      <data key="k_age">28</data>
      <data key="k_community">Arts</data>
      <data key="k_active">false</data>
      <data key="k_joined">2022-06-20</data>
    </node>
  </graph>
</graphml>`)

    const gexfGraph = parseGEXF(`<?xml version="1.0"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph>
    <attributes class="node">
      <attribute id="a_age" title="age" type="integer"/>
      <attribute id="a_community" title="community" type="string"/>
      <attribute id="a_active" title="active" type="boolean"/>
      <attribute id="a_joined" title="joined" type="string"/>
    </attributes>
    <nodes>
      <node id="n1">
        <attvalues>
          <attvalue for="a_age" value="34"/>
          <attvalue for="a_community" value="Tech"/>
          <attvalue for="a_active" value="true"/>
          <attvalue for="a_joined" value="2021-03-15"/>
        </attvalues>
      </node>
      <node id="n2">
        <attvalues>
          <attvalue for="a_age" value="28"/>
          <attvalue for="a_community" value="Arts"/>
          <attvalue for="a_active" value="false"/>
          <attvalue for="a_joined" value="2022-06-20"/>
        </attvalues>
      </node>
    </nodes>
  </graph>
</gexf>`)

    expect(typesOf(jsonGraph.nodes)).toEqual(expected)
    expect(typesOf(csvGraph.nodes)).toEqual(expected)
    expect(typesOf(graphmlGraph.nodes)).toEqual(expected)
    expect(typesOf(gexfGraph.nodes)).toEqual(expected)
  })
})

// ─── Full pipeline: parser → GraphBuilder → propertyMetas ────────────────
// The app builds `propertyMetas` inside GraphBuilder (not via
// detectPropertyTypes). A previous regression had the builder silently drop
// `null` values via isValidPropertyValue, which meant declared-but-all-empty
// CSV columns vanished from filters even after parseNodeEdgeCSV preserved
// them as null. These tests lock in the end-to-end behaviour.

describe('Full pipeline — GraphBuilder registers null-only columns', () => {
  function metasFor(nodes: NodeInput[]): Record<string, PropertyType> {
    const builder = new GraphBuilder()
    for (const node of nodes) builder.addNode(node as unknown as Record<string, unknown>)
    const result = builder.finalize()
    return Object.fromEntries(result.propertyMetas.map((m) => [m.key, m.type]))
  }

  it('CSV all-empty column survives into GraphBuilder.propertyMetas', () => {
    const csv = ['id,label,notes', 'n1,Alice,', 'n2,Bob,', 'n3,Carol,'].join('\n')
    const graph = parseNodeEdgeCSV(csv, 'source,target\n')
    expect(metasFor(graph.nodes)).toEqual({ label: 'string', notes: 'number' })
  })

  it('JSON all-null column survives into GraphBuilder.propertyMetas', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { age: 34, empty: null } },
      { id: 'n2', properties: { age: 28, empty: null } },
    ]
    expect(metasFor(nodes)).toEqual({ age: 'number', empty: 'number' })
  })

  it('nulls mixed with real values resolve to the real-value type', () => {
    const nodes: NodeInput[] = [
      { id: 'n1', properties: { age: 34 } },
      { id: 'n2', properties: { age: null } },
      { id: 'n3', properties: { age: 28 } },
    ]
    expect(metasFor(nodes)).toEqual({ age: 'number' })
  })
})

// ─── Drift-protection: both inference paths must agree ────────────────────
// `detectPropertyTypes` (pure utility) and `GraphBuilder.addNode → finalize`
// (the production path) both use the shared primitives from typeDetection.ts
// but operate on different input shapes (NodeInput vs. raw record). When they
// diverge, the "all-null column vanishes" bug is the kind of thing that slips
// through. This test pins them to the same output for every non-trivial fixture.

describe('Drift protection — detectPropertyTypes ≡ GraphBuilder propertyMetas', () => {
  const fixtures: Array<{ name: string; nodes: NodeInput[] }> = [
    {
      name: 'mixed natural types',
      nodes: [
        { id: 'n1', properties: { age: 34, community: 'Tech', active: true, joined: '2021-03-15', tags: ['a'] } },
        { id: 'n2', properties: { age: 28, community: 'Arts', active: false, joined: '2022-06-20', tags: ['b', 'c'] } },
      ],
    },
    { name: 'all-null column', nodes: [{ id: 'n1', properties: { empty: null } }, { id: 'n2', properties: { empty: null } }] },
    { name: 'nulls mixed with numbers', nodes: [{ id: 'n1', properties: { x: 42 } }, { id: 'n2', properties: { x: null } }, { id: 'n3', properties: { x: 7 } }] },
    { name: 'ISO dates with varying precision', nodes: [{ id: 'n1', properties: { t: '2021-03-15' } }, { id: 'n2', properties: { t: '2021-03-16T12:00:00Z' } }] },
    { name: 'mixed bool + number → string fallback', nodes: [{ id: 'n1', properties: { x: true } }, { id: 'n2', properties: { x: 1 } }] },
    { name: 'empty arrays alongside filled', nodes: [{ id: 'n1', properties: { tags: [] } }, { id: 'n2', properties: { tags: ['a', 'b'] } }] },
    { name: 'nodes without properties interleaved', nodes: [{ id: 'n1' }, { id: 'n2', properties: { k: 'v' } }, { id: 'n3' }] },
  ]

  for (const { name, nodes } of fixtures) {
    it(`agrees on "${name}"`, () => {
      const viaUtility = typesOf(nodes)

      const builder = new GraphBuilder()
      for (const n of nodes) builder.addNode(n as unknown as Record<string, unknown>)
      // finalize() throws on zero edges, but these fixtures may have no edges.
      // Add a no-op self-edge so finalize can run; it doesn't affect propertyMetas.
      if (nodes.length > 0) builder.addEdge({ source: nodes[0].id, target: nodes[0].id })
      const viaBuilder = Object.fromEntries(
        builder.finalize().propertyMetas.map((m) => [m.key, m.type]),
      )

      expect(viaBuilder).toEqual(viaUtility)
    })
  }
})

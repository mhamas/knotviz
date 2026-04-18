import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseGraphML } from '../lib/parseGraphML'

describe('parseGraphML', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses a minimal GraphML document', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <edge source="a" target="b"/>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.version).toBe('1')
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
    expect(g.nodes[0].id).toBe('a')
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
  })

  it('handles a single node (not wrapped in an array)', () => {
    const xml = `<graphml>
  <graph edgedefault="directed">
    <node id="only"/>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes).toHaveLength(1)
    expect(g.nodes[0].id).toBe('only')
  })

  it('coerces numeric attr.types (int, long, float, double)', () => {
    const xml = `<graphml>
  <key id="a" for="node" attr.name="size" attr.type="int"/>
  <key id="b" for="node" attr.name="weight" attr.type="double"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="a">42</data>
      <data key="b">0.5</data>
    </node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].properties).toEqual({ size: 42, weight: 0.5 })
  })

  it('coerces boolean attr.type', () => {
    const xml = `<graphml>
  <key id="a" for="node" attr.name="active" attr.type="boolean"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="a">true</data></node>
    <node id="n2"><data key="a">false</data></node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].properties).toEqual({ active: true })
    expect(g.nodes[1].properties).toEqual({ active: false })
  })

  it('maps the "label" node attribute to NodeInput.label', () => {
    const xml = `<graphml>
  <key id="l" for="node" attr.name="label" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="l">Alice</data></node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].label).toBe('Alice')
    expect(g.nodes[0].properties).toBeUndefined()
  })

  it('maps numeric "x" and "y" node attributes to structural positions', () => {
    const xml = `<graphml>
  <key id="x" for="node" attr.name="x" attr.type="double"/>
  <key id="y" for="node" attr.name="y" attr.type="double"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="x">10.5</data>
      <data key="y">20</data>
    </node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].x).toBe(10.5)
    expect(g.nodes[0].y).toBe(20)
    expect(g.nodes[0].properties).toBeUndefined()
  })

  it('maps edge "label" and "weight" keys to EdgeInput fields', () => {
    const xml = `<graphml>
  <key id="l" for="edge" attr.name="label" attr.type="string"/>
  <key id="w" for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <edge source="a" target="b">
      <data key="l">knows</data>
      <data key="w">0.8</data>
    </edge>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b', label: 'knows', weight: 0.8 })
  })

  it('drops non-label/weight edge data (edges only carry label + weight)', () => {
    const xml = `<graphml>
  <key id="extra" for="edge" attr.name="color" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <edge source="a" target="b">
      <data key="extra">red</data>
    </edge>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
  })

  it('uses <default> values for nodes that omit the data element', () => {
    const xml = `<graphml>
  <key id="a" for="node" attr.name="age" attr.type="int">
    <default>0</default>
  </key>
  <graph edgedefault="directed">
    <node id="n1"><data key="a">34</data></node>
    <node id="n2"/>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].properties).toEqual({ age: 34 })
    expect(g.nodes[1].properties).toEqual({ age: 0 })
  })

  it('warns and skips nodes missing an id', () => {
    const xml = `<graphml>
  <graph edgedefault="directed">
    <node id="a"/>
    <node/>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes).toHaveLength(1)
    expect(console.warn).toHaveBeenCalled()
  })

  it('warns and drops edges with unknown source or target', () => {
    const xml = `<graphml>
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <edge source="a" target="ghost"/>
    <edge source="a" target="b"/>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.edges).toHaveLength(1)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
    expect(console.warn).toHaveBeenCalled()
  })

  it('warns and ignores data entries referring to unknown keys', () => {
    const xml = `<graphml>
  <graph edgedefault="directed">
    <node id="a">
      <data key="mystery">something</data>
    </node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].properties).toBeUndefined()
    expect(console.warn).toHaveBeenCalled()
  })

  it('throws on missing <graphml> root', () => {
    expect(() => parseGraphML('<not-graphml/>')).toThrow()
  })

  it('throws on malformed XML', () => {
    expect(() => parseGraphML('<graphml><graph><node id="a"</graphml>')).toThrow()
  })

  it('parses an empty graph as valid with zero nodes and edges', () => {
    const xml = `<graphml><graph edgedefault="directed"/></graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes).toEqual([])
    expect(g.edges).toEqual([])
  })

  it('warns and uses the first graph when a file contains multiple', () => {
    const xml = `<graphml>
  <graph edgedefault="directed"><node id="a"/></graph>
  <graph edgedefault="undirected"><node id="b"/></graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes.map((n) => n.id)).toEqual(['a'])
    expect(console.warn).toHaveBeenCalled()
  })

  it('preserves ISO date strings so the downstream pipeline infers them as dates', () => {
    const xml = `<graphml>
  <key id="j" for="node" attr.name="joined" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="j">2021-03-15</data></node>
  </graph>
</graphml>`
    const g = parseGraphML(xml)
    expect(g.nodes[0].properties).toEqual({ joined: '2021-03-15' })
  })
})

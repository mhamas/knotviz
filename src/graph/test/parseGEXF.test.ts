import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseGEXF } from '../lib/parseGEXF'

describe('parseGEXF', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses a minimal GEXF document', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph mode="static" defaultedgetype="directed">
    <nodes>
      <node id="a" label="Alice"/>
      <node id="b" label="Bob"/>
    </nodes>
    <edges>
      <edge source="a" target="b"/>
    </edges>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.version).toBe('1')
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
    expect(g.nodes[0]).toEqual({ id: 'a', label: 'Alice' })
    expect(g.nodes[1]).toEqual({ id: 'b', label: 'Bob' })
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b' })
  })

  it('extracts viz:position into structural x and y (ignoring z)', () => {
    const xml = `<gexf>
  <graph>
    <nodes>
      <node id="a">
        <viz:position x="10.5" y="-20" z="0" xmlns:viz="http://gexf.net/1.3/viz"/>
      </node>
    </nodes>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes[0]).toEqual({ id: 'a', x: 10.5, y: -20 })
  })

  it('reads attvalues and coerces by declared attribute type', () => {
    const xml = `<gexf>
  <graph>
    <attributes class="node">
      <attribute id="0" title="age" type="integer"/>
      <attribute id="1" title="score" type="double"/>
      <attribute id="2" title="active" type="boolean"/>
      <attribute id="3" title="joined" type="string"/>
    </attributes>
    <nodes>
      <node id="a">
        <attvalues>
          <attvalue for="0" value="34"/>
          <attvalue for="1" value="0.75"/>
          <attvalue for="2" value="true"/>
          <attvalue for="3" value="2021-03-15"/>
        </attvalues>
      </node>
    </nodes>
    <edges/>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes[0].properties).toEqual({
      age: 34,
      score: 0.75,
      active: true,
      joined: '2021-03-15',
    })
  })

  it('reads edge weight and label from element attributes', () => {
    const xml = `<gexf>
  <graph>
    <nodes><node id="a"/><node id="b"/></nodes>
    <edges>
      <edge source="a" target="b" weight="0.8" label="knows"/>
    </edges>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b', weight: 0.8, label: 'knows' })
  })

  it('reads edge weight and label from attvalues when element attributes absent', () => {
    const xml = `<gexf>
  <graph>
    <attributes class="edge">
      <attribute id="0" title="weight" type="double"/>
      <attribute id="1" title="label" type="string"/>
    </attributes>
    <nodes><node id="a"/><node id="b"/></nodes>
    <edges>
      <edge source="a" target="b">
        <attvalues>
          <attvalue for="0" value="1.5"/>
          <attvalue for="1" value="follows"/>
        </attvalues>
      </edge>
    </edges>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.edges[0]).toEqual({ source: 'a', target: 'b', weight: 1.5, label: 'follows' })
  })

  it('uses <default> from attribute declarations when an attvalue is missing', () => {
    const xml = `<gexf>
  <graph>
    <attributes class="node">
      <attribute id="0" title="age" type="integer">
        <default>0</default>
      </attribute>
    </attributes>
    <nodes>
      <node id="a">
        <attvalues><attvalue for="0" value="34"/></attvalues>
      </node>
      <node id="b"/>
    </nodes>
    <edges/>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes[0].properties).toEqual({ age: 34 })
    expect(g.nodes[1].properties).toEqual({ age: 0 })
  })

  it('warns and skips nodes missing an id', () => {
    const xml = `<gexf>
  <graph>
    <nodes>
      <node id="a"/>
      <node label="Ghost"/>
    </nodes>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes).toHaveLength(1)
    expect(console.warn).toHaveBeenCalled()
  })

  it('warns and drops edges referencing unknown nodes', () => {
    const xml = `<gexf>
  <graph>
    <nodes><node id="a"/><node id="b"/></nodes>
    <edges>
      <edge source="a" target="ghost"/>
      <edge source="a" target="b"/>
    </edges>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.edges).toHaveLength(1)
    expect(console.warn).toHaveBeenCalled()
  })

  it('throws on missing <gexf> root', () => {
    expect(() => parseGEXF('<not-gexf/>')).toThrow()
  })

  it('throws on malformed XML', () => {
    expect(() => parseGEXF('<gexf><graph><nodes><node id="a"</gexf>')).toThrow()
  })

  it('handles an empty graph', () => {
    const xml = `<gexf><graph><nodes/><edges/></graph></gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes).toEqual([])
    expect(g.edges).toEqual([])
  })

  it('warns and uses the first graph when the file has multiple', () => {
    const xml = `<gexf>
  <graph><nodes><node id="a"/></nodes></graph>
  <graph><nodes><node id="b"/></nodes></graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes.map((n) => n.id)).toEqual(['a'])
    expect(console.warn).toHaveBeenCalled()
  })

  it('prefers the element attribute when both element attribute and attvalue are present', () => {
    const xml = `<gexf>
  <graph>
    <attributes class="edge">
      <attribute id="0" title="weight" type="double"/>
    </attributes>
    <nodes><node id="a"/><node id="b"/></nodes>
    <edges>
      <edge source="a" target="b" weight="0.8">
        <attvalues><attvalue for="0" value="9.9"/></attvalues>
      </edge>
    </edges>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.edges[0].weight).toBe(0.8)
  })

  it('maps liststring attribute type to a pipe-delimited string[]', () => {
    const xml = `<gexf>
  <graph>
    <attributes class="node">
      <attribute id="0" title="tags" type="liststring"/>
    </attributes>
    <nodes>
      <node id="a">
        <attvalues><attvalue for="0" value="red|green|blue"/></attvalues>
      </node>
    </nodes>
    <edges/>
  </graph>
</gexf>`
    const g = parseGEXF(xml)
    expect(g.nodes[0].properties).toEqual({ tags: ['red', 'green', 'blue'] })
  })
})

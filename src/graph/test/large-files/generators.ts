/**
 * Shared generators for large-file parser tests. Each function writes a file of the
 * requested size in the requested format to `outPath`, either fully valid or with a
 * known schema-level malformation.
 *
 * Kept separate from `scripts/generate-test-graphs.mjs` so the vitest project can
 * consume them directly without a TS-to-JS build step.
 */

import fs from 'node:fs'

const LABELS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi']
const TAG_POOL = ['engineer', 'designer', 'founder', 'alumnus', 'board', 'advisor']

export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface NodeProps {
  age: number
  active: boolean
  joined: string
  tags: string[]
}

function nodeProps(rng: () => number): NodeProps {
  const age = 18 + Math.floor(rng() * 60)
  const active = rng() > 0.3
  const yyyy = 2000 + Math.floor(rng() * 25)
  const mm = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
  const dd = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
  const joined = `${yyyy}-${mm}-${dd}`
  const tagCount = 1 + Math.floor(rng() * 3)
  const tags: string[] = []
  for (let t = 0; t < tagCount; t++) tags.push(TAG_POOL[Math.floor(rng() * TAG_POOL.length)])
  return { age, active, joined, tags }
}

interface StreamWriter {
  write(chunk: string): Promise<void>
  close(): Promise<void>
}

function streamWriter(filePath: string): StreamWriter {
  const ws = fs.createWriteStream(filePath, { encoding: 'utf8', highWaterMark: 1 << 20 })
  const drain = (): Promise<void> => new Promise((resolve) => ws.once('drain', resolve))
  return {
    async write(chunk: string): Promise<void> {
      if (!ws.write(chunk)) await drain()
    },
    async close(): Promise<void> {
      return new Promise((resolve, reject) => {
        ws.end((err: Error | null | undefined) => (err ? reject(err) : resolve()))
      })
    },
  }
}

export async function genJson(outPath: string, size: number, invalid: boolean): Promise<void> {
  const w = streamWriter(outPath)
  const rng = makeRng(size + (invalid ? 1 : 0))

  await w.write('{"version":"1","nodes":[\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng)
    // Invalid variant: every node has JS-style unquoted keys so JSON.parse rejects.
    // The streaming parser silently skips malformed items (by design) so breaking
    // ONE node isn't enough — breaking all of them leaves the graph with zero
    // parseable nodes, which downstream GraphBuilder then reports as an error.
    if (invalid) {
      await w.write(`{id: n${i}, broken: true}`)
    } else {
      const obj = {
        id: `n${i}`,
        label: LABELS[i % LABELS.length],
        properties: { age: p.age, active: p.active, joined: p.joined, tags: p.tags },
      }
      await w.write(JSON.stringify(obj))
    }
    if (i < size - 1) await w.write(',\n')
  }
  await w.write('\n],"edges":[\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const edge = { source: `n${src}`, target: `n${dst}`, weight: Math.round(rng() * 100) / 100 }
    await w.write(JSON.stringify(edge))
    if (e < edgeCount - 1) await w.write(',\n')
  }
  await w.write('\n]}\n')
  await w.close()
}

export async function genCsvEdgeList(
  outPath: string,
  size: number,
  invalid: boolean,
): Promise<void> {
  const w = streamWriter(outPath)
  const rng = makeRng(size + (invalid ? 2 : 0))

  await w.write(invalid ? 'src,dst,weight,label\n' : 'source,target,weight,label\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await w.write(`n${src},n${dst},${weight},${label}\n`)
  }
  await w.close()
}

export async function genCsvPair(
  nodesPath: string,
  edgesPath: string,
  size: number,
  invalid: boolean,
): Promise<void> {
  const nw = streamWriter(nodesPath)
  const ew = streamWriter(edgesPath)
  const rng = makeRng(size + (invalid ? 3 : 0))

  if (invalid) {
    await nw.write('name,label,age:number,active:boolean,joined:date,tags:string[]\n')
  } else {
    await nw.write('id,label,age:number,active:boolean,joined:date,tags:string[]\n')
  }

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng)
    const tagsStr = p.tags.join('|')
    await nw.write(`n${i},${LABELS[i % LABELS.length]},${p.age},${p.active},${p.joined},${tagsStr}\n`)
  }
  await nw.close()

  await ew.write('source,target,weight,label\n')
  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    const label = rng() > 0.5 ? 'knows' : 'follows'
    await ew.write(`n${src},n${dst},${weight},${label}\n`)
  }
  await ew.close()
}

export async function genGraphML(
  outPath: string,
  size: number,
  invalid: boolean,
): Promise<void> {
  const w = streamWriter(outPath)
  const rng = makeRng(size + (invalid ? 4 : 0))

  const rootOpen = invalid
    ? '<notgraphml>'
    : '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
  const rootClose = invalid ? '</notgraphml>' : '</graphml>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<key id="lbl" for="node" attr.name="label" attr.type="string"/>\n')
  await w.write('<key id="age" for="node" attr.name="age" attr.type="int"/>\n')
  await w.write('<key id="act" for="node" attr.name="active" attr.type="boolean"/>\n')
  await w.write('<key id="jnd" for="node" attr.name="joined" attr.type="string"/>\n')
  await w.write('<key id="w" for="edge" attr.name="weight" attr.type="double"/>\n')
  await w.write('<graph edgedefault="directed">\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng)
    await w.write(
      `<node id="n${i}"><data key="lbl">${LABELS[i % LABELS.length]}</data><data key="age">${p.age}</data><data key="act">${p.active}</data><data key="jnd">${p.joined}</data></node>\n`,
    )
  }

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    await w.write(`<edge source="n${src}" target="n${dst}"><data key="w">${weight}</data></edge>\n`)
  }
  await w.write('</graph>\n')
  await w.write(`${rootClose}\n`)
  await w.close()
}

export async function genGexf(outPath: string, size: number, invalid: boolean): Promise<void> {
  const w = streamWriter(outPath)
  const rng = makeRng(size + (invalid ? 5 : 0))

  const rootOpen = invalid ? '<notgexf>' : '<gexf xmlns="http://gexf.net/1.3" version="1.3">'
  const rootClose = invalid ? '</notgexf>' : '</gexf>'

  await w.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  await w.write(`${rootOpen}\n`)
  await w.write('<graph mode="static" defaultedgetype="directed">\n')
  await w.write('<attributes class="node">\n')
  await w.write('<attribute id="0" title="age" type="integer"/>\n')
  await w.write('<attribute id="1" title="active" type="boolean"/>\n')
  await w.write('<attribute id="2" title="joined" type="string"/>\n')
  await w.write('</attributes>\n')
  await w.write('<nodes>\n')

  for (let i = 0; i < size; i++) {
    const p = nodeProps(rng)
    await w.write(
      `<node id="n${i}" label="${LABELS[i % LABELS.length]}"><attvalues><attvalue for="0" value="${p.age}"/><attvalue for="1" value="${p.active}"/><attvalue for="2" value="${p.joined}"/></attvalues></node>\n`,
    )
  }
  await w.write('</nodes>\n')
  await w.write('<edges>\n')

  const edgeCount = Math.floor(size * 1.5)
  for (let e = 0; e < edgeCount; e++) {
    const src = Math.floor(rng() * size)
    let dst = Math.floor(rng() * size)
    if (dst === src) dst = (dst + 1) % size
    const weight = Math.round(rng() * 100) / 100
    await w.write(`<edge source="n${src}" target="n${dst}" weight="${weight}"/>\n`)
  }
  await w.write('</edges>\n')
  await w.write('</graph>\n')
  await w.write(`${rootClose}\n`)
  await w.close()
}

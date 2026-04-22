import { describe, expect, it } from 'vitest'
import { exportAsCsvPair } from '../../lib/exports/csvPair'
import { sampleSnapshot } from './fixtures'

/**
 * Read a ZIP blob and extract text contents. Handles client-zip's streaming
 * mode where local-file-header sizes are zero and the actual sizes live in
 * a data descriptor immediately after each file payload. Entries are
 * STORE (no compression) so we just decode the bytes.
 *
 * If client-zip ever switches to DEFLATE this helper will need to grow
 * decompression; the unit-test scope here is verifying CSV content, so a
 * hand-rolled reader is a cheaper choice than pulling in a full zip library.
 */
async function readZipEntries(blob: Blob): Promise<Record<string, string>> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  const decoder = new TextDecoder()
  const files: Record<string, string> = {}

  const LFH_SIG = [0x50, 0x4b, 0x03, 0x04]
  const CDIR_SIG = [0x50, 0x4b, 0x01, 0x02]
  const DD_SIG = [0x50, 0x4b, 0x07, 0x08]

  function matchesAt(pos: number, sig: number[]): boolean {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[pos + i] !== sig[i]) return false
    }
    return true
  }

  let offset = 0
  while (offset < buffer.length - 4 && matchesAt(offset, LFH_SIG)) {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset)
    const gpFlags = view.getUint16(6, true)
    const lfhCompressedSize = view.getUint32(18, true)
    const nameLen = view.getUint16(26, true)
    const extraLen = view.getUint16(28, true)
    const nameStart = offset + 30
    const name = decoder.decode(buffer.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen

    let dataEnd: number
    if ((gpFlags & 0x0008) !== 0) {
      // Data descriptor mode — the local header size is 0, actual size
      // arrives in a trailing data descriptor (with optional signature).
      let p = dataStart
      while (p < buffer.length - 4 && !matchesAt(p, DD_SIG) && !matchesAt(p, LFH_SIG) && !matchesAt(p, CDIR_SIG)) {
        p++
      }
      dataEnd = p
      const afterDataView = new DataView(buffer.buffer, buffer.byteOffset + p)
      const withSig = matchesAt(p, DD_SIG)
      const ddCompressed = withSig ? afterDataView.getUint32(8, true) : afterDataView.getUint32(4, true)
      const ddLen = (withSig ? 4 : 0) + 12
      offset = p + ddLen
      files[name] = decoder.decode(buffer.subarray(dataStart, dataStart + ddCompressed))
      continue
    }

    dataEnd = dataStart + lfhCompressedSize
    files[name] = decoder.decode(buffer.subarray(dataStart, dataEnd))
    offset = dataEnd
  }
  return files
}

describe('exportAsCsvPair', () => {
  it('produces a ZIP containing nodes.csv and edges.csv', async () => {
    const result = await exportAsCsvPair(sampleSnapshot())
    expect(result.extension).toBe('zip')
    const files = await readZipEntries(result.blob)
    expect(Object.keys(files).sort()).toEqual(['edges.csv', 'nodes.csv'])
  })

  it('nodes.csv emits typed column headers', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipEntries(blob)
    const header = files['nodes.csv'].split(/\r\n/)[0]
    expect(header).toBe('id,label,x,y,age:number,active:boolean,joined:date,community:string,tags:string[]')
  })

  it('nodes.csv encodes string[] values with pipe separator', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipEntries(blob)
    const rows = files['nodes.csv'].split(/\r\n/).filter(Boolean)
    // Row n1: ...,engineer|founder
    expect(rows[1].endsWith('engineer|founder')).toBe(true)
  })

  it('escapes pipes inside individual string[] values', async () => {
    const snap = sampleSnapshot()
    snap.nodes[0].properties.tags = ['a|b', 'c']
    const { blob } = await exportAsCsvPair(snap)
    const files = await readZipEntries(blob)
    const rows = files['nodes.csv'].split(/\r\n/).filter(Boolean)
    expect(rows[1].endsWith('a\\|b|c')).toBe(true)
  })

  it('edges.csv has source,target,weight when any edge has a weight', async () => {
    const { blob } = await exportAsCsvPair(sampleSnapshot())
    const files = await readZipEntries(blob)
    const lines = files['edges.csv'].split(/\r\n/).filter(Boolean)
    expect(lines[0]).toBe('source,target,weight')
    expect(lines[1]).toBe('n1,n2,0.8')
    expect(lines[2]).toBe('n2,n3,')
  })

  it('drops label / x / y columns when no node has them set', async () => {
    const snap = sampleSnapshot()
    for (const n of snap.nodes) {
      delete n.label
      n.x = 0
      n.y = 0
    }
    const { blob } = await exportAsCsvPair(snap)
    const files = await readZipEntries(blob)
    const header = files['nodes.csv'].split(/\r\n/)[0]
    expect(header).toBe('id,age:number,active:boolean,joined:date,community:string,tags:string[]')
  })
})

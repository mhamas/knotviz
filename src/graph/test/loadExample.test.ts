import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadExample } from '../lib/loadExample'

describe('loadExample', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob([`stub body for ${url}`], { type: 'text/plain' }),
      } as Response
    }) as typeof fetch
  })

  it('returns a single File for json example', async () => {
    const files = await loadExample('json/1k')
    expect(files).not.toBeNull()
    expect(files).toHaveLength(1)
    expect(files![0].name).toBe('1k.json')
    expect(global.fetch).toHaveBeenCalledWith('/samples/json/1k.json')
  })

  it('returns a single File for csv-edge-list example', async () => {
    const files = await loadExample('csv-edge-list/1k')
    expect(files).not.toBeNull()
    expect(files![0].name).toBe('1k.csv')
    expect(global.fetch).toHaveBeenCalledWith('/samples/csv-edge-list/1k.csv')
  })

  it('returns a single File for graphml example', async () => {
    const files = await loadExample('graphml/1k')
    expect(files![0].name).toBe('1k.graphml')
  })

  it('returns a single File for gexf example', async () => {
    const files = await loadExample('gexf/1k')
    expect(files![0].name).toBe('1k.gexf')
  })

  it('returns two Files for csv-pair example', async () => {
    const files = await loadExample('csv-pair/1k')
    expect(files).toHaveLength(2)
    expect(files![0].name).toBe('1k-nodes.csv')
    expect(files![1].name).toBe('1k-edges.csv')
  })

  it('returns null for unknown format', async () => {
    expect(await loadExample('unknown/1k')).toBeNull()
  })

  it('returns null for malformed name', async () => {
    expect(await loadExample('json')).toBeNull()
    expect(await loadExample('')).toBeNull()
  })

  it('throws when fetch returns non-ok', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 }) as Response) as typeof fetch
    await expect(loadExample('json/1k')).rejects.toThrow(/404/)
  })
})

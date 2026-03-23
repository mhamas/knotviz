/**
 * Streaming JSON parser tailored for the graph format:
 * { "version": "1", "nodes": [ {...}, {...}, ... ], "edges": [ {...}, {...}, ... ] }
 *
 * Parses one node/edge object at a time using bracket counting + JSON.parse
 * on each individual item. Never holds the full JSON string in memory.
 *
 * Memory: only the current item string buffer (~1KB) + accumulated results.
 */

export interface StreamCallbacks {
  onVersion: (version: string) => void
  onNode: (node: Record<string, unknown>) => void
  onEdge: (edge: Record<string, unknown>) => void
  onProgress: (bytesProcessed: number) => void
}

type State =
  | 'BEFORE_ROOT'
  | 'IN_ROOT'
  | 'IN_KEY'
  | 'AFTER_KEY'
  | 'IN_VERSION_VALUE'
  | 'IN_ARRAY'
  | 'IN_ITEM'
  | 'BETWEEN_ITEMS'
  | 'DONE'

/**
 * Parse a graph JSON file streamed as text chunks. Calls onNode/onEdge
 * for each complete object without holding the full file in memory.
 *
 * @param chunks - AsyncIterable of string chunks (from File.stream() + TextDecoder)
 * @param callbacks - Handlers for each parsed element
 */
export async function parseStreamingJsonGraph(
  chunks: AsyncIterable<string>,
  callbacks: StreamCallbacks,
): Promise<void> {
  let state: State = 'BEFORE_ROOT'
  let currentKey = '' // "version", "nodes", or "edges"
  let itemBuffer = '' // accumulates characters for the current node/edge object
  let braceDepth = 0
  let inString = false
  let isEscaped = false
  let bytesProcessed = 0
  let keyBuffer = ''

  const PROGRESS_INTERVAL = 500_000 // report progress every ~500KB
  let lastProgressAt = 0

  for await (const chunk of chunks) {
    bytesProcessed += chunk.length

    if (bytesProcessed - lastProgressAt > PROGRESS_INTERVAL) {
      lastProgressAt = bytesProcessed
      callbacks.onProgress(bytesProcessed)
    }

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]

      // Track string boundaries (for correct brace counting)
      if (inString) {
        if (isEscaped) {
          isEscaped = false
          if (state === 'IN_ITEM') itemBuffer += ch
          else if (state === 'IN_KEY') keyBuffer += ch
          else if (state === 'IN_VERSION_VALUE') keyBuffer += ch
          continue
        }
        if (ch === '\\') {
          isEscaped = true
          if (state === 'IN_ITEM') itemBuffer += ch
          else if (state === 'IN_KEY') keyBuffer += ch
          else if (state === 'IN_VERSION_VALUE') keyBuffer += ch
          continue
        }
        if (ch === '"') {
          inString = false
          if (state === 'IN_ITEM') {
            itemBuffer += ch
          } else if (state === 'IN_KEY') {
            currentKey = keyBuffer
            keyBuffer = ''
            state = 'AFTER_KEY'
          } else if (state === 'IN_VERSION_VALUE') {
            callbacks.onVersion(keyBuffer)
            keyBuffer = ''
            state = 'IN_ROOT'
          }
          continue
        }
        if (state === 'IN_ITEM') itemBuffer += ch
        else if (state === 'IN_KEY') keyBuffer += ch
        else if (state === 'IN_VERSION_VALUE') keyBuffer += ch
        continue
      }

      // Not inside a string
      switch (state) {
        case 'BEFORE_ROOT':
          if (ch === '{') state = 'IN_ROOT'
          break

        case 'IN_ROOT':
          if (ch === '"') { state = 'IN_KEY'; keyBuffer = '' }
          else if (ch === '}') state = 'DONE'
          break

        case 'AFTER_KEY':
          if (ch === ':') {
            if (currentKey === 'version') {
              state = 'IN_VERSION_VALUE'
            } else if (currentKey === 'nodes' || currentKey === 'edges') {
              state = 'IN_ARRAY' // wait for '['
            } else {
              // Skip unknown keys — scan until we find the next key or end
              state = 'IN_ROOT'
            }
          }
          break

        case 'IN_VERSION_VALUE':
          if (ch === '"') { inString = true; keyBuffer = '' }
          else if (ch === ',' || ch === '}') state = 'IN_ROOT'
          break

        case 'IN_ARRAY':
          if (ch === '[') state = 'BETWEEN_ITEMS'
          break

        case 'BETWEEN_ITEMS':
          if (ch === '{') {
            state = 'IN_ITEM'
            itemBuffer = '{'
            braceDepth = 1
          } else if (ch === ']') {
            state = 'IN_ROOT'
          }
          break

        case 'IN_ITEM':
          itemBuffer += ch
          if (ch === '"') {
            inString = true
          } else if (ch === '{') {
            braceDepth++
          } else if (ch === '}') {
            braceDepth--
            if (braceDepth === 0) {
              // Complete item — parse and emit
              try {
                const obj = JSON.parse(itemBuffer) as Record<string, unknown>
                if (currentKey === 'nodes') callbacks.onNode(obj)
                else if (currentKey === 'edges') callbacks.onEdge(obj)
              } catch {
                // Skip malformed items
              }
              itemBuffer = ''
              state = 'BETWEEN_ITEMS'
            }
          }
          break

        case 'DONE':
          break
      }
    }
  }
}

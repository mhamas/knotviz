/**
 * Streaming JSON parser tailored for the graph format:
 * { "version": "1", "nodes": [ {...}, {...}, ... ], "edges": [ {...}, {...}, ... ], "nodePropertiesMetadata": {...} }
 *
 * Parses one node/edge object at a time using bracket counting + JSON.parse
 * on each individual item. Never holds the full parsed JSON tree in memory.
 *
 * Memory: only the current item string buffer (~1KB) + accumulated results.
 */

export interface StreamCallbacks {
  onVersion: (version: string) => void
  onNode: (node: Record<string, unknown>) => void
  onEdge: (edge: Record<string, unknown>) => void
  onProgress: (bytesProcessed: number) => void
  onNodePropertiesMetadata?: (metadata: Record<string, { description: string }>) => void
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
  | 'SKIP_VALUE'
  | 'DONE'

/**
 * Stateful parser that can be fed text chunks incrementally.
 * Call write() with each chunk, then done() at end.
 */
class GraphJsonParser {
  private state: State = 'BEFORE_ROOT'
  private currentKey = ''
  private itemBuffer = ''
  private braceDepth = 0
  private inString = false
  private isEscaped = false
  private keyBuffer = ''
  private bytesProcessed = 0
  private lastProgressAt = 0
  private callbacks: StreamCallbacks
  /** Depth tracker for SKIP_VALUE state (braces + brackets). */
  private skipDepth = 0
  /** Buffer for the value being skipped (used for nodePropertiesMetadata). */
  private skipBuffer = ''
  /** Whether to buffer the skipped value (true for nodePropertiesMetadata). */
  private isBufferingSkip = false

  constructor(callbacks: StreamCallbacks) {
    this.callbacks = callbacks
  }

  write(chunk: string): void {
    this.bytesProcessed += chunk.length

    if (this.bytesProcessed - this.lastProgressAt > 500_000) {
      this.lastProgressAt = this.bytesProcessed
      this.callbacks.onProgress(this.bytesProcessed)
    }

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]
      this.processChar(ch)
    }
  }

  private processChar(ch: string): void {
    // Inside a string literal — accumulate until closing quote
    if (this.inString) {
      if (this.isEscaped) {
        this.isEscaped = false
        this.appendChar(ch)
        return
      }
      if (ch === '\\') {
        this.isEscaped = true
        this.appendChar(ch)
        return
      }
      if (ch === '"') {
        this.inString = false
        if (this.state === 'IN_ITEM') {
          this.itemBuffer += ch
        } else if (this.state === 'IN_KEY') {
          this.currentKey = this.keyBuffer
          this.keyBuffer = ''
          this.state = 'AFTER_KEY'
        } else if (this.state === 'IN_VERSION_VALUE') {
          this.callbacks.onVersion(this.keyBuffer)
          this.keyBuffer = ''
          this.state = 'IN_ROOT'
        } else if (this.state === 'SKIP_VALUE') {
          if (this.isBufferingSkip) this.skipBuffer += ch
        }
        return
      }
      this.appendChar(ch)
      return
    }

    // Not inside a string
    switch (this.state) {
      case 'BEFORE_ROOT':
        if (ch === '{') this.state = 'IN_ROOT'
        break

      case 'IN_ROOT':
        if (ch === '"') { this.state = 'IN_KEY'; this.keyBuffer = ''; this.inString = true }
        else if (ch === '}') this.state = 'DONE'
        break

      case 'AFTER_KEY':
        if (ch === ':') {
          if (this.currentKey === 'version') {
            this.state = 'IN_VERSION_VALUE'
          } else if (this.currentKey === 'nodes' || this.currentKey === 'edges') {
            this.state = 'IN_ARRAY'
          } else {
            // Unknown top-level key — skip its value, buffering if nodePropertiesMetadata
            this.state = 'SKIP_VALUE'
            this.skipDepth = 0
            this.isBufferingSkip = this.currentKey === 'nodePropertiesMetadata'
            this.skipBuffer = ''
          }
        }
        break

      case 'IN_VERSION_VALUE':
        if (ch === '"') { this.inString = true; this.keyBuffer = '' }
        else if (ch === ',' || ch === '}') this.state = 'IN_ROOT'
        break

      case 'IN_ARRAY':
        if (ch === '[') this.state = 'BETWEEN_ITEMS'
        break

      case 'BETWEEN_ITEMS':
        if (ch === '{') {
          this.state = 'IN_ITEM'
          this.itemBuffer = '{'
          this.braceDepth = 1
        } else if (ch === ']') {
          this.state = 'IN_ROOT'
        }
        break

      case 'IN_ITEM':
        this.itemBuffer += ch
        if (ch === '"') {
          this.inString = true
        } else if (ch === '{') {
          this.braceDepth++
        } else if (ch === '}') {
          this.braceDepth--
          if (this.braceDepth === 0) {
            this.emitItem()
            this.itemBuffer = ''
            this.state = 'BETWEEN_ITEMS'
          }
        }
        break

      case 'SKIP_VALUE':
        if (this.isBufferingSkip) this.skipBuffer += ch
        if (ch === '"') {
          this.inString = true
        } else if (ch === '{' || ch === '[') {
          this.skipDepth++
        } else if (ch === '}' || ch === ']') {
          if (this.skipDepth > 0) {
            this.skipDepth--
            if (this.skipDepth === 0) {
              this.emitSkippedValue()
              this.state = 'IN_ROOT'
            }
          } else {
            // The '}' belongs to the root object
            this.emitSkippedValue()
            this.state = 'DONE'
          }
        } else if (ch === ',' && this.skipDepth === 0) {
          // End of a primitive value (number, boolean, null)
          this.emitSkippedValue()
          this.state = 'IN_ROOT'
        }
        break

      case 'DONE':
        break
    }
  }

  private appendChar(ch: string): void {
    if (this.state === 'IN_ITEM') this.itemBuffer += ch
    else if (this.state === 'IN_KEY') this.keyBuffer += ch
    else if (this.state === 'IN_VERSION_VALUE') this.keyBuffer += ch
    else if (this.state === 'SKIP_VALUE' && this.isBufferingSkip) this.skipBuffer += ch
  }

  private emitItem(): void {
    try {
      const obj = JSON.parse(this.itemBuffer) as Record<string, unknown>
      if (this.currentKey === 'nodes') this.callbacks.onNode(obj)
      else if (this.currentKey === 'edges') this.callbacks.onEdge(obj)
    } catch {
      // Skip malformed items
    }
  }

  private emitSkippedValue(): void {
    if (!this.isBufferingSkip || !this.skipBuffer) return
    try {
      const parsed = JSON.parse(this.skipBuffer) as Record<string, { description: string }>
      this.callbacks.onNodePropertiesMetadata?.(parsed)
    } catch {
      // Skip malformed metadata
    }
    this.isBufferingSkip = false
    this.skipBuffer = ''
  }
}

/**
 * Synchronous parse — processes entire text at once. Used for testing.
 */
export function parseJsonGraphSync(text: string, callbacks: StreamCallbacks): void {
  const parser = new GraphJsonParser(callbacks)
  parser.write(text)
}

/**
 * Async streaming parse — processes text chunks from an AsyncIterable.
 * Used in the loading worker with File.stream() or chunked file.text().
 */
export async function parseStreamingJsonGraph(
  chunks: AsyncIterable<string>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const parser = new GraphJsonParser(callbacks)
  for await (const chunk of chunks) {
    parser.write(chunk)
  }
}

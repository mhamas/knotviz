/**
 * Test-only helper for reading ZIP blobs produced by `client-zip`.
 *
 * client-zip emits entries in streaming mode: the local file header has
 * zero sizes, the actual payload follows, and a trailing data descriptor
 * reports the real lengths. Entries are always STORE (no compression).
 *
 * Shared between the CSV-pair unit test and the e2e round-trip matrix.
 * A full zip library would handle more than we need; this targeted
 * reader is cheaper and self-contained. If `client-zip` ever switches
 * to DEFLATE, swap for a real decoder — the signature stays the same.
 */
export function readZipEntries(bytes: Uint8Array): Record<string, string> {
  const decoder = new TextDecoder()
  const files: Record<string, string> = {}

  const LFH_SIG = [0x50, 0x4b, 0x03, 0x04]
  const CDIR_SIG = [0x50, 0x4b, 0x01, 0x02]
  const DD_SIG = [0x50, 0x4b, 0x07, 0x08]

  function matchesAt(pos: number, sig: number[]): boolean {
    for (let i = 0; i < sig.length; i++) {
      if (bytes[pos + i] !== sig[i]) return false
    }
    return true
  }

  let offset = 0
  while (offset < bytes.length - 4 && matchesAt(offset, LFH_SIG)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
    const gpFlags = view.getUint16(6, true)
    const lfhCompressed = view.getUint32(18, true)
    const nameLen = view.getUint16(26, true)
    const extraLen = view.getUint16(28, true)
    const nameStart = offset + 30
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen

    if ((gpFlags & 0x0008) !== 0) {
      // Streaming mode: scan forward for the next signature to locate the
      // end of this entry's data, then read the trailing data descriptor
      // to recover the true compressed length.
      let p = dataStart
      while (
        p < bytes.length - 4 &&
        !matchesAt(p, DD_SIG) &&
        !matchesAt(p, LFH_SIG) &&
        !matchesAt(p, CDIR_SIG)
      ) {
        p++
      }
      const ddView = new DataView(bytes.buffer, bytes.byteOffset + p)
      const withSig = matchesAt(p, DD_SIG)
      const ddCompressed = withSig ? ddView.getUint32(8, true) : ddView.getUint32(4, true)
      const ddLen = (withSig ? 4 : 0) + 12
      files[name] = decoder.decode(bytes.subarray(dataStart, dataStart + ddCompressed))
      offset = p + ddLen
      continue
    }

    files[name] = decoder.decode(bytes.subarray(dataStart, dataStart + lfhCompressed))
    offset = dataStart + lfhCompressed
  }
  return files
}

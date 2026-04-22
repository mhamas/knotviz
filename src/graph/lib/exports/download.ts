/**
 * Triggers a browser download from an in-memory Blob. Used by every format
 * serializer — the caller passes the Blob it built and the suggested
 * filename, the browser's native download flow does the rest.
 *
 * Revoking the object URL immediately after `click()` raced the download
 * start in some browsers (the click would queue the request but revoke
 * before the browser had captured the data). Deferred revocation lets the
 * browser finish handing the blob to its download manager before the URL
 * disappears. One second is well beyond any real-world click-to-capture
 * window while still reclaiming the memory promptly.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Derive the download filename from the original source filename and the
 * target extension. Strips the source's extension so `acme.json` → `acme`
 * → `acme.graphml`. Falls back to `knotviz-export.<ext>` when there's no
 * source filename (e.g. example URLs that don't expose one).
 *
 * Only strips a trailing `.json` / `.csv` / `.tsv` / `.graphml` / `.gexf` /
 * `.xml` / `.zip` — anything else stays as-is, so a user with an unusual
 * name like `data.2024-04-22` doesn't lose the date suffix.
 */
const KNOWN_STEMS = /\.(json|csv|tsv|graphml|gexf|xml|zip)$/i

export function filenameFor(sourceFilename: string | undefined, extension: string): string {
  const base = (sourceFilename ?? '').trim()
  if (base === '') return `knotviz-export.${extension}`
  const stem = base.replace(KNOWN_STEMS, '')
  return `${stem}.${extension}`
}

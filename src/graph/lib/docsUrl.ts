/**
 * Docs site URL helper. In dev, docs run on a separate Astro server at
 * http://localhost:4321; in production they live under the same origin
 * (knotviz.com) so absolute paths like /docs/foo resolve natively.
 *
 * @param path - Absolute docs path (e.g. "/docs/input-formats/json").
 * @returns Path prefixed with the dev origin in dev mode, unchanged in prod.
 *
 * @example
 * docsUrl('/docs')                  // dev: 'http://localhost:4321/docs', prod: '/docs'
 * docsUrl('/docs/input-formats')    // dev: 'http://localhost:4321/docs/input-formats', prod: '/docs/input-formats'
 */
const DOCS_ORIGIN = import.meta.env.DEV ? 'http://localhost:4321' : ''

export function docsUrl(path: string): string {
  return `${DOCS_ORIGIN}${path}`
}

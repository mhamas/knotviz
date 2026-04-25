import '@fontsource-variable/geist'
import '../styles/globals.css'

// Reveal body after Tailwind CSS is loaded (prevents FOUC)
document.body.style.opacity = '1'

// Dev-only: docs run on :4321 while the homepage runs on :5173. In production
// both live under the same origin so /docs resolves natively. Mirror the
// rewrite that docs/src/components/Header.astro applies in the other direction.
if (import.meta.env.DEV) {
  const DOCS_ORIGIN = 'http://localhost:4321'
  const rewrite = (): void => {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href')
      if (!href) return
      if (href === '/docs' || href.startsWith('/docs/') || href.startsWith('/docs?')) {
        a.setAttribute('href', DOCS_ORIGIN + href)
      }
    })
  }
  rewrite()
}

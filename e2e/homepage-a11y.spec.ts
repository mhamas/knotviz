import { test, expect } from '@playwright/test'

/**
 * Regression tests for homepage Lighthouse audits that have failed in the
 * past. Each block guards a specific accessibility / best-practices issue
 * surfaced by Lighthouse — see the matching audit IDs in comments.
 */
test.describe('Homepage — Lighthouse regression guards', () => {
  test('every asset returns a 2xx (no font 404, no missing images)', async ({ page }) => {
    const failures: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.status() >= 400) failures.push({ url: res.url(), status: res.status() })
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(failures).toEqual([])
  })

  test('document has a <main> landmark (axe: landmark-one-main)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toHaveCount(1)
  })

  test('logo images carry width and height attributes (axe: unsized-images)', async ({ page }) => {
    await page.goto('/')
    const logos = page.locator('img[src="/logo.webp"]')
    const count = await logos.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const img = logos.nth(i)
      await expect(img).toHaveAttribute('width', /^\d+$/)
      await expect(img).toHaveAttribute('height', /^\d+$/)
    }
  })

  test('comparison table uses <th scope="row"> for row labels (axe: td-has-header)', async ({ page }) => {
    await page.goto('/')
    // Six features compared (Setup, Data location, GPU rendering, Practical
    // size, Filter & search, Cost) — each row's first cell must be a header.
    await expect(page.locator('table th[scope="row"]')).toHaveCount(6)
    await expect(page.locator('table th[scope="col"]').first()).toBeVisible()
  })

  test('CTA paragraph on blue-600 is readable (axe: color-contrast)', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('section.bg-blue-600 p').first()
    // text-blue-100 (used to be) → text-blue-50 (after fix). Either token
    // can be expressed in many forms after Tailwind+oklch normalisation, so
    // the simplest invariant is "doesn't contain blue-100".
    await expect(cta).not.toHaveClass(/text-blue-100\b/)
    await expect(cta).toHaveClass(/text-blue-50\b/)
  })

  test('inline <code> chips on bg-gray-100 specify their own text colour', async ({ page }) => {
    await page.goto('/')
    // Without an explicit text colour, the chips inherit text-gray-500 from
    // their parent paragraph and fail 4.5:1 contrast on bg-gray-100.
    const chips = page.locator('code.bg-gray-100')
    const count = await chips.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(chips.nth(i)).toHaveClass(/text-gray-700\b/)
    }
  })
})

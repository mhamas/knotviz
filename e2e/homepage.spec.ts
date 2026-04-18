import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('has correct title and meta description', async ({ page }) => {
    await expect(page).toHaveTitle(/Knotviz/)
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /million nodes/)
  })

  test('renders hero section with logo and CTA', async ({ page }) => {
    await expect(page.locator('img[alt*="Knotviz"]').first()).toBeVisible()
    const cta = page.locator('a[href="/graph"]').first()
    await expect(cta).toBeVisible()
    await expect(cta).toContainText(/Open Knotviz/i)
  })

  test('renders all major sections', async ({ page }) => {
    await expect(page.getByText(/What you get/i).first()).toBeVisible()
    await expect(page.getByText(/What people visualize/i).first()).toBeVisible()
    await expect(page.getByText(/How it works/i).first()).toBeVisible()
    await expect(page.getByText(/Drop in whatever you have/i).first()).toBeVisible()
  })

  test('CTA navigates to graph app', async ({ page }) => {
    const cta = page.locator('a[href="/graph"]').first()
    await cta.click()
    await expect(page).toHaveURL(/\/graph/)
    await expect(page.getByTestId('drop-zone')).toBeVisible()
  })

  test('is responsive — renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('img[alt*="Knotviz"]').first()).toBeVisible()
    const cta = page.locator('a[href="/graph"]').first()
    await expect(cta).toBeVisible()
  })

  test('SEO: content is in the HTML source without JS', async ({ page }) => {
    const response = await page.request.get('/')
    const html = await response.text()
    expect(html).toContain('hiding in your graph')
    expect(html).toContain('million nodes')
    expect(html).toContain('og:title')
  })
})

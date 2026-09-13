import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of ['prep', 'game', 'sandbox'] as const) {
  test(`${route} has no WCAG A or AA violations in light and dark`, async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`#/${route}`)
      await expect(page.locator('h1')).toBeAttached()
      await page.waitForTimeout(300)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(results.violations, results.violations.map(({ id, help }) => `${id}: ${help}`).join('\n')).toEqual([])
    }
  })
}

test('keyboard users can skip to content and dismiss settings', async ({ page }) => {
  await page.goto('#/game')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  await page.getByRole('button', { name: 'Settings' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('radio', { name: 'System' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('radio', { name: 'System' })).not.toBeVisible()
})

for (const viewport of [
  { name: 'small phone', width: 320, height: 568 },
  { name: 'landscape phone', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
] as const) {
  for (const route of ['game', 'sandbox'] as const) {
    test(`${route} fits a ${viewport.name} without horizontal scrolling`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`#/${route}`)
      await expect(page.locator('h1')).toBeVisible()
      const widths = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      expect(widths.content).toBeLessThanOrEqual(widths.viewport)
    })
  }
}

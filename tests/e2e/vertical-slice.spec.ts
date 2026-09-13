import { expect, test } from '@playwright/test'

test('section 41 game loop replans at phone width and survives offline', async ({ context, page }) => {
  await page.goto('#/game')
  await expect(page.getByText('Deathshroud Terminators')).toBeVisible()
  await page.getByRole('button', { name: 'Find best commitment' }).click()
  const recommendation = page.locator('.result h1')
  await expect(recommendation).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.result .probability')).toContainText(/\d+(?:\.\d+)?%/)
  await page.getByRole('button', { name: 'Resolve attack' }).click()
  await expect(page.getByRole('heading', { name: 'What happened?' })).toBeVisible()
  await page.getByRole('button', { name: '1 killed' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('.result h1')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('6 wounds remaining', { exact: true })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({
    path: 'reports/2026-09-13-m0/section-41.png',
    fullPage: true,
  })

  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Deathshroud Terminators')).toBeVisible()
})

test('game calculations accept a damage goal and label the answer honestly', async ({ page }) => {
  await page.goto('#/game')
  await page.getByRole('radio', { name: 'Deal ≥ 6 wounds' }).check()
  await page.getByRole('button', { name: 'Find best commitment' }).click()
  await expect(page.locator('.result h1')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.result .probability')).toContainText('success chance')
  await page.getByText('Details', { exact: true }).click()
  await expect(page.locator('.metric-list')).toContainText('Deal ≥ 6 wounds')
})

import { expect, test } from '@playwright/test'

test('section 41 flow works at phone width and after going offline', async ({ context, page }) => {
  await page.goto('#/game')
  await expect(page.getByText('Deathshroud Terminators')).toBeVisible()
  await page.getByRole('button', { name: 'Find best commitment' }).click()
  await expect(page.getByRole('heading', { name: 'Eradicators first' })).toBeVisible()
  await expect(page.getByText('93% total')).toBeVisible()
  await page.screenshot({
    path: 'reports/2026-09-13-m0/section-41.png',
    fullPage: true,
  })

  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Deathshroud Terminators')).toBeVisible()
})

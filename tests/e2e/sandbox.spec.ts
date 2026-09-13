import { expect, test } from '@playwright/test'

test('sandbox updates, shares and imports an exact matchup', async ({ browser, page }) => {
  await page.goto('#/sandbox')
  await expect(page.getByRole('heading', { name: 'Test the matchup you actually have.' })).toBeVisible()
  await expect(page.getByText(/kill chance, /).locator('..')).toContainText(/\d+\.\d+%/)
  await expect(page.getByRole('region', { name: 'Damage probability distribution' })).toBeVisible()

  const damageFigure = page.locator('.headline-metrics p').nth(1).locator('strong')
  const initialDamage = await damageFigure.textContent()
  await page.getByLabel('Re-roll hits').selectOption('failed')
  await expect(damageFigure).not.toHaveText(initialDamage ?? '')
  await page.getByRole('button', { name: 'Save on this device' }).click()
  await expect(page.getByText('Matchup saved on this device.')).toBeVisible()
  await expect(page.getByLabel('Saved matchups')).toContainText('Eradicators → Deathshroud Terminators')
  const rerolledDamage = await damageFigure.textContent()
  await page.getByText('Edit attacker stats').click()
  await page.getByLabel('Attacks').fill('12')
  await expect(damageFigure).not.toHaveText(rerolledDamage ?? '')

  await page.getByRole('button', { name: 'Copy share link' }).click()
  const shareLink = page.getByLabel('Share link')
  await expect(shareLink).toHaveValue(/#\/sandbox\?s=[A-Za-z0-9_-]+/)
  const sharedUrl = await shareLink.inputValue()

  const sharedPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await sharedPage.goto(sharedUrl)
  await expect(sharedPage.getByText('Shared matchup loaded.')).toBeVisible()
  await expect(sharedPage.getByLabel('Re-roll hits')).toHaveValue('failed')
  await sharedPage.close()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export .commit.json' }).click(),
  ])
  const path = await download.path()
  if (path === null) throw new Error('Downloaded matchup has no local path')
  await page.getByLabel('Import .commit.json').setInputFiles(path)
  await expect(page.getByText('Matchup imported.')).toBeVisible()
})

import { expect, test } from '@playwright/test'

const opponentRoster = `Roster: Test opposition
Faction: Test faction

2x Armoured Targets (120 points)
T 7, Sv 3+, W 4
Defensive gun: A 2, BS 4+, S 5, AP -1, D 1`

test('a pasted roster can be checked, saved and used in the planner', async ({ page }) => {
  await page.goto('#/prep')
  await expect(page.getByRole('heading', { name: 'Know the matchup before the first roll.' })).toBeVisible()
  await expect(page.getByText('Best into Deathshroud Terminators')).toBeVisible()

  await page.getByLabel('Paste roster').fill(opponentRoster)
  await page.getByRole('button', { name: 'Check roster' }).click()
  await expect(page.getByRole('heading', { name: 'Check the profiles' })).toBeVisible()
  await expect(page.getByText('Everything needed was recognised.')).toBeVisible()
  await page.getByLabel('Use as').selectOption('opponent')
  await page.getByRole('button', { name: 'Save roster' }).click()
  await expect(page.getByText('Test opposition saved on this device.')).toBeVisible()

  await expect(page.getByLabel('Opponent')).toHaveValue(/paste-test-opposition-/)
  await page.getByRole('button', { name: 'Use these rosters' }).click()
  await expect(page).toHaveURL(/#\/game$/)
  await expect(page.getByRole('radio', { name: /Armoured Targets/ })).toBeVisible()
  await expect(page.getByLabel('Models in target')).toHaveValue('2')
})

test('incomplete input remains available for correction', async ({ page }) => {
  await page.goto('#/prep')
  await page.getByLabel('Paste roster').fill('Mystery unit (90 points)')
  await page.getByRole('button', { name: 'Check roster' }).click()

  await expect(page.getByText(/fields need a quick check/)).toBeVisible()
  await expect(page.getByLabel('Fields to check for Mystery unit')).toContainText('add Toughness')
  await expect(page.getByLabel('Unit name')).toHaveValue('Mystery unit')
  await expect(page.getByRole('button', { name: 'Add weapon' })).toBeVisible()
})

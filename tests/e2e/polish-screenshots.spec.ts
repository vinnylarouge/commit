import { test } from '@playwright/test'

// Phone-width evidence for the polish lane: SHOT_PREFIX=before|after (default after).
const prefix = process.env.SHOT_PREFIX ?? 'after'
const dir = 'reports/2026-09-13-polish/assets'

for (const scheme of ['light', 'dark'] as const) {
  test(`section 41 screenshots, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('#/game')
    await page.getByText('Deathshroud Terminators').waitFor()
    await page.screenshot({ path: `${dir}/${prefix}-${scheme}-setup.png` })

    await page.getByRole('button', { name: 'Find best commitment' }).click()
    const heading = page.getByRole('heading', { name: 'Eradicators first' })
    await heading.waitFor()
    await heading.evaluate((el) => el.closest('section')?.scrollIntoView({ behavior: 'instant', block: 'start' }))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${dir}/${prefix}-${scheme}-result.png` })

    // The appearance sheet exists only after the polish; skip it for the before shots.
    if (prefix === 'before') return
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('radio', { name: 'Dark' }).waitFor()
    await page.screenshot({ path: `${dir}/${prefix}-${scheme}-settings.png` })
  })
}

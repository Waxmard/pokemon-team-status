import { expect, test } from '@playwright/test'

const autocompleteOption = (page, name) =>
  page.locator('.n-base-select-option__content').getByText(name, { exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('gym types are displayed on load', async ({ page }) => {
  const gymSection = page.getByLabel('Gym types')
  await expect(gymSection).toBeVisible()

  // Should have gym cards visible
  const gymCards = page.locator('[aria-label$="gym"]')
  await expect(gymCards.first()).toBeVisible()
})

test('defeat and undefeat a gym', async ({ page }) => {
  // Target a specific gym by label
  const fireGym = page.getByLabel('fire gym')
  await expect(fireGym).toBeVisible()

  // Click to defeat
  await fireGym.click()

  // Verify it has defeated class
  await expect(fireGym).toHaveClass(/defeated/)

  // Click again to undefeat
  await fireGym.click()
  await expect(fireGym).not.toHaveClass(/defeated/)
})

test('gym scores update when Pokemon is added', async ({ page }) => {
  // Capture initial scores
  const scoresBefore = await page.locator('.score-corner').allTextContents()

  // Add a Pokemon
  await page.getByText('Empty Slot').click()
  await page.getByPlaceholder('Search Pokemon...').fill('Charizard')
  await autocompleteOption(page, 'Charizard').click()
  await page.getByLabel('Save').click()

  // Scores should change
  const scoresAfter = await page.locator('.score-corner').allTextContents()
  expect(scoresAfter).not.toEqual(scoresBefore)
})

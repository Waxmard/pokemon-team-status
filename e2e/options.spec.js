import { expect, test } from '@playwright/test'

const autocompleteOption = (page, name) =>
  page.locator('.n-base-select-option__content').getByText(name, { exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('open and close options dialog', async ({ page }) => {
  await page.getByLabel('Options').click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()

  // Close by clicking overlay background
  await page.locator('.reset-overlay').click({ position: { x: 10, y: 10 } })
  await expect(page.getByRole('heading', { name: 'Options' })).not.toBeVisible()
})

test('toggle generation rules', async ({ page }) => {
  await page.getByLabel('Options').click()

  const genButton = page.getByText(/Using (Pre|Post)-Gen 6 Rules/)
  const initialText = await genButton.textContent()
  await genButton.click()

  // The button text changes in-place (dialog stays open)
  const newText = await page.getByText(/Using (Pre|Post)-Gen 6 Rules/).textContent()
  expect(newText).not.toBe(initialText)
})

test('reset team and box', async ({ page }) => {
  // Add a Pokemon first
  await page.getByText('Empty Slot').click()
  await page.getByPlaceholder('Search Pokemon...').fill('Eevee')
  await autocompleteOption(page, 'Eevee').click()
  await page.getByLabel('Save').click()
  await expect(page.getByAltText('Eevee')).toBeVisible()

  // Reset via options
  await page.getByLabel('Options').click()
  await page.getByText('Reset Team & Box').click()

  // Verify empty
  await expect(page.getByAltText('Eevee')).not.toBeVisible()
  await expect(page.getByText('Empty Slot')).toBeVisible()
})

test('start a new solo run', async ({ page }) => {
  await page.getByLabel('Options').click()
  await page.getByText('New Solo Run').click()

  await expect(page.getByText('Weakness Calculator')).toBeVisible()
  await expect(page.getByText('Empty Slot')).toBeVisible()
})

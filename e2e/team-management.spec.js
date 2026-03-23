import { expect, test } from '@playwright/test'

// Naive UI autocomplete renders dropdown options with this class
const autocompleteOption = (page, name) =>
  page.locator('.n-base-select-option__content').getByText(name, { exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('add a Pokemon to the team', async ({ page }) => {
  await page.getByText('Empty Slot').click()

  // Search and select a Pokemon
  await page.getByPlaceholder('Search Pokemon...').fill('Charizard')
  await autocompleteOption(page, 'Charizard').click()

  // Confirm (skipping optional steps)
  await page.getByLabel('Save').click()

  // Verify Pokemon appears in team
  await expect(page.getByAltText('Charizard')).toBeVisible()
})

test('add a Pokemon with ability', async ({ page }) => {
  await page.getByText('Empty Slot').click()
  await page.getByPlaceholder('Search Pokemon...').fill('Pikachu')
  await autocompleteOption(page, 'Pikachu').click()

  // Navigate: pokemon → moves → berry → ability
  await page.getByLabel('Next step').click()
  await page.getByLabel('Next step').click()
  await page.getByLabel('Next step').click()

  // Select ability (pressSequentially triggers Naive UI dropdown; fill() doesn't)
  const abilityInput1 = page.getByPlaceholder('Search ability...')
  await abilityInput1.click()
  await abilityInput1.pressSequentially('Lightning')
  await autocompleteOption(page, 'Lightning Rod').click()

  await page.getByLabel('Save').click()

  // Verify Pokemon and ability badge
  await expect(page.getByAltText('Pikachu')).toBeVisible()
  await expect(page.getByText('Lightning Rod')).toBeVisible()
})

test('edit a team Pokemon', async ({ page }) => {
  // Add a Pokemon first
  await page.getByText('Empty Slot').click()
  await page.getByPlaceholder('Search Pokemon...').fill('Bulbasaur')
  await autocompleteOption(page, 'Bulbasaur').click()
  await page.getByLabel('Save').click()
  await expect(page.getByAltText('Bulbasaur')).toBeVisible()

  // Wait for grid transition to fully complete before clicking to edit
  await expect(page.getByText('Choose Pokemon')).not.toBeVisible()

  // Click to edit and wait for DraftPanel to be fully mounted
  await page.getByAltText('Bulbasaur').click()
  await expect(page.getByText('Choose Pokemon')).toBeVisible()
  await expect(page.getByLabel('Next step')).toBeEnabled()

  // Navigate to ability step and set one
  await page.getByLabel('Next step').click()
  await page.getByLabel('Next step').click()
  await page.getByLabel('Next step').click()

  // pressSequentially triggers Naive UI dropdown; fill() doesn't
  const abilityInput = page.getByPlaceholder('Search ability...')
  await abilityInput.click()
  await abilityInput.clear()
  await abilityInput.pressSequentially('Overgr')
  await autocompleteOption(page, 'Overgrow').click()
  await page.getByLabel('Save').click()

  // Verify ability persisted
  await expect(page.getByText('Overgrow')).toBeVisible()
})

test('delete a team Pokemon', async ({ page }) => {
  // Add a Pokemon
  await page.getByText('Empty Slot').click()
  await page.getByPlaceholder('Search Pokemon...').fill('Eevee')
  await autocompleteOption(page, 'Eevee').click()
  await page.getByLabel('Save').click()
  await expect(page.getByAltText('Eevee')).toBeVisible()

  // Edit then delete
  await page.getByAltText('Eevee').click()
  await page.getByLabel('Delete').click()

  // Verify removed
  await expect(page.getByAltText('Eevee')).not.toBeVisible()
  await expect(page.getByText('Empty Slot')).toBeVisible()
})

test('cancel adding a Pokemon', async ({ page }) => {
  await page.getByText('Empty Slot').click()
  await expect(page.getByText('Choose Pokemon')).toBeVisible()

  await page.getByLabel('Cancel').click()

  // Draft panel should close, empty slot returns
  await expect(page.getByText('Empty Slot')).toBeVisible()
})

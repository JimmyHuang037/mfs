import { test, expect } from '@playwright/test';

test('student list page loads', async ({ page }) => {
  await page.goto('/students');
  await expect(page).toHaveURL(/students/);
});
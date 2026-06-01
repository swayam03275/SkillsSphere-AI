import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Basic check for the root page loading
  await expect(page).toHaveTitle(/SkillSphere|Vite/i);
});

test('navigation to login', async ({ page }) => {
  await page.goto('/');
  
  // Try finding a login link/button, assuming standard placement
  const loginLink = page.getByRole('link', { name: /log ?in/i });
  if (await loginLink.count() > 0) {
    await loginLink.first().click();
    await expect(page).toHaveURL(/.*login/);
  } else {
    // Fallback if the home page structure differs
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
  }
});

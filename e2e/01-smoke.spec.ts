import { test, expect } from '@grafana/plugin-e2e';

test('Smoke test', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome to Grafana')).toBeVisible();
});

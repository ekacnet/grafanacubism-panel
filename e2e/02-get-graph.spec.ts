import { test, expect } from '@grafana/plugin-e2e';

const dashboardUID = 'b6610ab3-816b-4649-9909-a6bf32605b8b';

test('Get cubism graph', async ({ page, gotoDashboardPage }) => {
  await gotoDashboardPage({ uid: dashboardUID });
  await expect(page.getByText('Panel Title').first()).toBeVisible();

  const horizons = page.locator('div[class$="-horizon"]');
  await expect(horizons).toHaveCount(20);
  await expect(page.locator('span.titleCubism').first()).toContainText(/A-series$/);
  await expect(horizons.first().locator('canvas')).toBeVisible();
});

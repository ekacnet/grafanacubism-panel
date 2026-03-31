import { test, expect } from '@grafana/plugin-e2e';

const dashboardUID = 'b6610ab3-816b-4649-9909-a6bf32605b8b';

test('Get cubism graph', async ({ page, gotoDashboardPage }) => {
  await gotoDashboardPage({ uid: dashboardUID });
  await expect(page.getByText('Panel Title').first()).toBeVisible();

  const horizons = page.locator('div[class$="-horizon"]');
  await expect(horizons).toHaveCount(30);
  await expect(page.locator('span.titleCubism').first()).toContainText(/A-series$/);
  await expect(horizons.first().locator('canvas')).toBeVisible();
});

test('Provisioned log-scale panel uses log value scale', async ({ page, gotoDashboardPage }) => {
  await gotoDashboardPage({ uid: dashboardUID });
  await expect(page.getByText('Log Scale Demo').first()).toBeVisible();

  const response = await page.request.get(`/api/dashboards/uid/${dashboardUID}`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();

  const logScalePanel = payload.dashboard.panels.find((panel: any) => panel.title === 'Log Scale Demo');
  expect(logScalePanel).toBeDefined();
  expect(logScalePanel.options.valueScale).toBe('log');
  expect(logScalePanel.targets[0].min).toBe(1);
  expect(logScalePanel.targets[0].max).toBe(10000);
});

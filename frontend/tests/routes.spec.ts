import { expect, test } from '@playwright/test';

test('original UI renders, map selection works and simulated GPS updates stop correctly', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 12.97, longitude: 77.59, accuracy: 20 });
  await page.goto('/');
  await expect(page.getByText('Routing API connected')).toBeVisible();
  const map = page.getByTestId('route-map').first();
  await expect(map.locator('.leaflet-container')).toBeVisible();
  const previous = await page.getByLabel('Dropoff latitude', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Set dropoff on map', exact: true }).click();
  await map.click({ position: { x: 200, y: 140 } });
  await expect(page.getByLabel('Dropoff latitude', { exact: true })).not.toHaveValue(previous);
  const oldPickup = await page.getByLabel('Pickup latitude', { exact: true }).inputValue();
  const marker = map.locator('.leaflet-marker-icon').filter({ hasText: 'P' });
  await marker.scrollIntoViewIfNeeded();
  const box = await marker.boundingBox();
  if (!box) throw new Error('Pickup marker is missing');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByLabel('Pickup latitude', { exact: true })).not.toHaveValue(oldPickup);
  await page.getByRole('button', { name: 'Use my live location', exact: true }).click();
  await expect(page.getByLabel('Pickup latitude', { exact: true })).toHaveValue('12.97');
  await expect(page.getByText(/accuracy ±20 m/)).toBeVisible();
  await context.setGeolocation({ latitude: 12.98, longitude: 77.60, accuracy: 15 });
  await expect(page.getByText(/accuracy ±15 m/)).toBeVisible();
  await page.getByRole('button', { name: 'Set pickup to latest position' }).click();
  await expect(page.getByLabel('Pickup latitude', { exact: true })).toHaveValue('12.98');
  await page.getByRole('button', { name: 'Stop live location' }).click();
  await expect(page.getByText('Location tracking stopped.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Dijkstra, A*, and background multi-stop optimization show actual results and route lines', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Routing data', { exact: true }).selectOption('demo');
  for (const algorithm of ['dijkstra', 'astar']) {
    await page.getByLabel('Algorithm', { exact: true }).selectOption(algorithm);
    await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
    await expect(page.getByTestId('route-result')).toBeVisible();
    await expect(page.getByTestId('route-distance')).toContainText('km');
    await expect(page.getByTestId('route-result').locator('.leaflet-overlay-pane path')).toBeVisible();
    await page.getByRole('button', { name: 'Algorithm comparison', exact: true }).click();
    await expect(page.getByText('Measured DSA comparison')).toBeVisible();
    await page.getByRole('button', { name: 'CLOSE PANEL' }).click();
  }
  await page.getByRole('button', { name: '+ Add Stop', exact: true }).click();
  await page.getByLabel('Stop 1 latitude', { exact: true }).fill('12.95');
  await page.getByLabel('Stop 1 longitude', { exact: true }).fill('77.60');
  await page.getByLabel('Algorithm', { exact: true }).selectOption('nn+2opt');
  await page.getByLabel('Background job with live progress').check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByTestId('route-result')).toBeVisible();
  await expect(page.getByText('Nearest Neighbor cost:', { exact: false })).toBeVisible();
  await expect(page.getByText('Stop order: Pickup → Stop 1 → Dropoff')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download route JSON' }).click();
  expect((await download).suggestedFilename()).toBe('cab-route.json');
});

test('live road route and explicit address search use the running API', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search pickup address or landmark', { exact: true }).fill('Bengaluru');
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await expect(page.getByRole('list', { name: 'Search results' })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 55000 });
  await expect(page.getByText('OSRM road network', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('route-result').locator('.leaflet-overlay-pane path')).toBeVisible();
});

test('provider errors are visible and are not replaced by demo results', async ({ page }) => {
  await page.route('**/api/v1/routes/estimate', route => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ detail: 'Road provider unavailable. Please retry.' }) }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Road provider unavailable' })).toBeVisible();
  await expect(page.getByTestId('route-result')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Calculate route', exact: true })).toBeEnabled();
});

test('duplicate inputs and GPS permission denial produce clear messages', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (_success, fail) => { setTimeout(() => fail?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }), 20); return 1; };
    navigator.geolocation.clearWatch = () => {};
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use my live location', exact: true }).click();
  await expect(page.getByText(/Location permission denied/)).toBeVisible();
  await page.getByLabel('Dropoff latitude', { exact: true }).fill('12.9716');
  await page.getByLabel('Dropoff longitude', { exact: true }).fill('77.5946');
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'distinct coordinates' })).toBeVisible();
});

test('mobile map and route calculation remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Routing data', { exact: true }).selectOption('demo');
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByTestId('route-result')).toBeVisible();
  await expect(page.getByTestId('route-result').locator('.leaflet-container')).toBeVisible();
  await expect(page.getByRole('button', { name: 'CLOSE PANEL' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('opt-in live route refresh recalculates after simulated movement', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 12.97, longitude: 77.59, accuracy: 10 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use my live location', exact: true }).click();
  await expect(page.getByLabel('Pickup latitude', { exact: true })).toHaveValue('12.97');
  await page.getByLabel('Routing data', { exact: true }).selectOption('demo');
  await page.getByLabel('Refresh route from live position', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByTestId('route-result')).toBeVisible();
  await page.getByRole('button', { name: 'CLOSE PANEL' }).click();
  await context.setGeolocation({ latitude: 12.98, longitude: 77.60, accuracy: 10 });
  await expect(page.getByLabel('Pickup latitude', { exact: true })).toHaveValue('12.98', { timeout: 45000 });
  await expect(page.getByTestId('route-result')).toBeVisible();
  await page.getByRole('button', { name: 'CLOSE PANEL' }).click();
  await page.getByRole('button', { name: 'Stop live location' }).click();
});

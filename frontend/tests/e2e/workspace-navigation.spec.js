import { test, expect } from '@playwright/test';
import {
  connectToWorkspace,
  getTab,
  installOneDbApiMock,
  openSidebarTable,
} from './helpers/onedb-e2e-harness.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('opens command palette via keyboard event and navigates to selected table', async ({
  page,
}) => {
  await installOneDbApiMock(page);
  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });

  await expect(page.getByTestId('sidebar-open-command-palette')).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.getByTestId('command-palette')).toBeVisible();

  await page.getByTestId('command-palette-input').fill('client_deals');
  const targetItem = page.locator(
    '[data-testid="command-palette-item"][data-db-name="nefix"][data-table-name="client_deals"]',
  );
  await expect(targetItem).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('command-palette')).toBeHidden();
  await expect(page.getByTestId('table-browser-view')).toBeVisible();
  await expect(
    page.locator('[data-testid="table-cell"][data-column-name="client_name"]').first(),
  ).toContainText('Client 1');
});

test('activating a tab auto-expands its database in sidebar', async ({ page }) => {
  await installOneDbApiMock(page);
  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });

  await openSidebarTable(page, 'call_trend_analyzer', 'sessions', 'permanent');
  await openSidebarTable(page, 'nefix', 'client_deals', 'permanent');

  await expect(page.getByTestId('table-tabs-list')).toBeVisible();
  await expect(getTab(page, 'call_trend_analyzer', 'sessions')).toBeVisible();
  await expect(getTab(page, 'nefix', 'client_deals')).toBeVisible();

  await page
    .locator('[data-testid="sidebar-db-expand-toggle"][data-db-name="call_trend_analyzer"]')
    .first()
    .click();
  await expect(
    page.locator('[data-testid="sidebar-db-panel"][data-db-name="call_trend_analyzer"]'),
  ).toHaveCount(0);

  await getTab(page, 'call_trend_analyzer', 'sessions').click();

  await expect(
    page.locator('[data-testid="sidebar-db-panel"][data-db-name="call_trend_analyzer"]'),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-testid="sidebar-table-entry"][data-db-name="call_trend_analyzer"][data-table-name="sessions"]',
    ),
  ).toBeVisible();
});

test('database label colorization is off by default and enabled from settings', async ({
  page,
}) => {
  await installOneDbApiMock(page);
  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });

  await openSidebarTable(page, 'call_trend_analyzer', 'sessions', 'permanent');
  await openSidebarTable(page, 'nefix', 'client_deals', 'permanent');

  const callTrendLabel = getTab(page, 'call_trend_analyzer', 'sessions').locator(
    '[data-testid="table-tab-db-label"]',
  );
  const nefixLabel = getTab(page, 'nefix', 'client_deals').locator(
    '[data-testid="table-tab-db-label"]',
  );

  await expect(callTrendLabel).toHaveClass(/text-zinc-/);
  await expect(nefixLabel).toHaveClass(/text-zinc-/);

  await page.getByTestId('header-open-settings').click();
  await expect(page.getByTestId('settings-modal')).toBeVisible();
  await page.getByTestId('settings-tabs-colorize-db-toggle').click();
  await page.getByTestId('settings-modal-close').click();
  await expect(page.getByTestId('settings-modal')).toBeHidden();

  await expect(callTrendLabel).toHaveClass(/text-rose-100/);
  await expect(nefixLabel).toHaveClass(/text-indigo-100/);
});

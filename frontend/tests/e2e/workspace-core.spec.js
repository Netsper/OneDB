import { test, expect } from '@playwright/test';
import {
  connectToWorkspace,
  installOneDbApiMock,
  openSidebarTable,
} from './helpers/onedb-e2e-harness.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('connects and renders workspace database tree', async ({ page }) => {
  const mockState = await installOneDbApiMock(page);

  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });

  const dbEntries = page.locator(
    '[data-testid="sidebar-db-entry"][data-entry-source="database-list"]',
  );
  await expect(dbEntries).toHaveCount(2);
  await expect(
    page.locator(
      '[data-testid="sidebar-db-entry"][data-entry-source="database-list"][data-db-name="call_trend_analyzer"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-testid="sidebar-db-entry"][data-entry-source="database-list"][data-db-name="nefix"]',
    ),
  ).toBeVisible();

  expect(mockState.calls.actions.some((entry) => entry.action === 'list_databases')).toBeTruthy();
  expect(mockState.calls.actions.some((entry) => entry.action === 'list_tables')).toBeTruthy();
});

test('keeps pagination total accurate when API rowCount is stale and hasMore is false', async ({
  page,
}) => {
  await installOneDbApiMock(page, {
    browseOverrides: {
      'call_trend_analyzer.sessions': ({ payload, response }) => {
        if (Number(payload?.page || 1) === 1) {
          return {
            ...response,
            rowCount: 84224,
            hasMore: false,
          };
        }
        return response;
      },
    },
  });

  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });
  await openSidebarTable(page, 'call_trend_analyzer', 'sessions');

  await expect(page.getByTestId('table-pagination-range')).toHaveText('1 - 15 / 15');
  await expect(page.getByTestId('table-pagination-range')).not.toContainText('84224');
  await expect(page.getByTestId('table-pagination-next')).toBeDisabled();
  await expect(page.getByTestId('table-pagination-last')).toBeDisabled();
});

test('navigates across pages and sends includeRowCount=false after first page', async ({
  page,
}) => {
  const mockState = await installOneDbApiMock(page);

  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });
  await openSidebarTable(page, 'nefix', 'users');

  await expect(page.getByTestId('table-pagination-range')).toHaveText('1 - 15 / 40');

  await page.getByTestId('table-pagination-next').click();
  await expect(page.getByTestId('table-pagination-range')).toHaveText('16 - 30 / 40');

  await page.getByTestId('table-pagination-last').click();
  await expect(page.getByTestId('table-pagination-range')).toHaveText('31 - 40 / 40');
  await expect(page.getByTestId('table-pagination-next')).toBeDisabled();

  const browseCalls = mockState.calls.browseTable.filter(
    (entry) => entry.databaseName === 'nefix' && entry.tableName === 'users',
  );
  const pageTwoCall = browseCalls.find((entry) => Number(entry.payload?.page || 0) === 2);

  expect(pageTwoCall).toBeTruthy();
  expect(pageTwoCall?.payload?.includeRowCount).toBe(false);
});

test('supports inline edit and persists row update through refresh', async ({ page }) => {
  const mockState = await installOneDbApiMock(page);

  await connectToWorkspace(page, {
    host: '127.0.0.1',
    user: 'root',
    pass: 'secret',
  });
  await openSidebarTable(page, 'call_trend_analyzer', 'sessions');

  const statusCell = page.locator(
    '[data-testid="table-cell"][data-row-index="0"][data-column-name="status"]',
  );
  await expect(statusCell).toContainText('ready');
  await statusCell.dblclick();

  const inlineInput = page.getByTestId('inline-edit-input');
  await expect(inlineInput).toBeVisible();
  await inlineInput.fill('archived');
  await inlineInput.press('Enter');
  await expect(inlineInput).toBeHidden();

  await expect(statusCell).toContainText('archived');

  const updateCall = mockState.calls.query.find((entry) => /^\s*update\s+/i.test(entry.sql));
  expect(updateCall).toBeTruthy();
  expect(updateCall?.databaseName).toBe('call_trend_analyzer');
});

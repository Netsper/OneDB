import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenDatabaseTables,
  filterCommandEntries,
} from '../../../../../src/hooks/workspace/state/useWorkspaceCommandPalette.js';

test('flattenDatabaseTables builds list from db/table map', () => {
  const tables = flattenDatabaseTables({
    appdb: {
      users: { type: 'table' },
      view_orders: { type: 'view' },
    },
    analytics: {
      events: {},
    },
  });

  assert.deepEqual(tables, [
    { dbName: 'appdb', tableName: 'users', type: 'table' },
    { dbName: 'appdb', tableName: 'view_orders', type: 'view' },
    { dbName: 'analytics', tableName: 'events', type: 'table' },
  ]);
});

test('filterCommandEntries applies query and respects max limit', () => {
  const source = Array.from({ length: 120 }, (_, idx) => ({
    dbName: idx % 2 === 0 ? 'main' : 'analytics',
    tableName: `table_${idx}`,
    type: 'table',
  }));

  const noQuery = filterCommandEntries(source, '');
  assert.equal(noQuery.length, 10);

  const filtered = filterCommandEntries(source, 'analytics', 15);
  assert.equal(filtered.length, 15);
  assert.equal(filtered.every((entry) => entry.dbName === 'analytics'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DB_PIN_PREFIX,
  TABLE_PIN_PREFIX,
  makeDatabasePinKey,
  makeTablePinKey,
  isDatabasePinKey,
  isTablePinKey,
  parseTablePinKey,
  parseDatabasePinKey,
  normalizePinnedItems,
} from '../../../src/utils/pins.js';

test('pin key builders create prefixed keys', () => {
  assert.equal(makeDatabasePinKey('analytics'), `${DB_PIN_PREFIX}analytics`);
  assert.equal(makeTablePinKey('analytics', 'events'), `${TABLE_PIN_PREFIX}analytics.events`);
});

test('pin key parsers and type guards behave correctly', () => {
  assert.equal(isDatabasePinKey('db:main'), true);
  assert.equal(isTablePinKey('table:main.users'), true);
  assert.deepEqual(parseTablePinKey('table:main.users'), { dbName: 'main', tableName: 'users' });
  assert.equal(parseDatabasePinKey('db:main'), 'main');
});

test('normalizePinnedItems deduplicates and normalizes legacy shapes', () => {
  const normalized = normalizePinnedItems([
    'main',
    'main.users',
    'db:main',
    'table:main.users',
    '  ',
    null,
  ]);
  assert.deepEqual(normalized, ['db:main', 'table:main.users']);
});

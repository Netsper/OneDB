import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldIncludeBrowseRowCount,
  resolveBrowseRowCount,
} from '../../../../src/hooks/api/useOneDbApi.js';

test('shouldIncludeBrowseRowCount defaults to first page only', () => {
  assert.equal(shouldIncludeBrowseRowCount(1), true);
  assert.equal(shouldIncludeBrowseRowCount(2), false);
  assert.equal(shouldIncludeBrowseRowCount(undefined), true);
});

test('shouldIncludeBrowseRowCount respects explicit override', () => {
  assert.equal(shouldIncludeBrowseRowCount(3, true), true);
  assert.equal(shouldIncludeBrowseRowCount(1, false), false);
});

test('resolveBrowseRowCount uses API value when count is included', () => {
  assert.equal(
    resolveBrowseRowCount({ includeRowCount: true, apiRowCount: 42, fallbackRowCount: 9 }),
    42,
  );
  assert.equal(
    resolveBrowseRowCount({ includeRowCount: true, apiRowCount: null, fallbackRowCount: 9 }),
    0,
  );
});

test('resolveBrowseRowCount estimates row count when count query is skipped', () => {
  assert.equal(
    resolveBrowseRowCount({
      includeRowCount: false,
      apiRowCount: 42,
      fallbackRowCount: 9,
      hasMore: true,
      page: 2,
      perPage: 15,
      pageRowsLength: 15,
    }),
    31,
  );
  assert.equal(
    resolveBrowseRowCount({
      includeRowCount: false,
      apiRowCount: 42,
      fallbackRowCount: null,
      hasMore: false,
      page: 3,
      perPage: 10,
      pageRowsLength: 4,
    }),
    24,
  );
});

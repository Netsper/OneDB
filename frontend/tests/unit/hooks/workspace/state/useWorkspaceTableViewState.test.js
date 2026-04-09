import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBrowseTotalPages } from '../../../../../src/hooks/workspace/state/useWorkspaceTableViewState.js';

test('computeBrowseTotalPages uses known rows when hasMore is false', () => {
  const totalPages = computeBrowseTotalPages({
    currentTableData: { page: 1, rowCount: 84224, hasMore: false },
    processedData: Array.from({ length: 15 }),
    rowsPerPage: 15,
  });

  assert.equal(totalPages, 1);
});

test('computeBrowseTotalPages includes one extra row minimum when hasMore is true', () => {
  const totalPages = computeBrowseTotalPages({
    currentTableData: { page: 2, rowCount: 10, hasMore: true },
    processedData: Array.from({ length: 15 }),
    rowsPerPage: 15,
  });

  assert.equal(totalPages, 3);
});

test('computeBrowseTotalPages clamps invalid numeric inputs safely', () => {
  const totalPages = computeBrowseTotalPages({
    currentTableData: { page: -3, rowCount: -100, hasMore: false },
    processedData: [],
    rowsPerPage: 0,
  });

  assert.equal(totalPages, 1);
});

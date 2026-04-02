import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNumericColumnType,
  isTemporalColumnType,
  buildFilterOperatorOptions,
  normalizeFilterRuleDraftsList,
} from '../../../../../src/hooks/workspace/state/useWorkspaceFilters.js';

test('isNumericColumnType detects numeric SQL types', () => {
  assert.equal(isNumericColumnType({ type: 'int(11)' }), true);
  assert.equal(isNumericColumnType({ type: 'DECIMAL(10,2)' }), true);
  assert.equal(isNumericColumnType({ type: 'varchar(255)' }), false);
});

test('isTemporalColumnType detects temporal SQL types', () => {
  assert.equal(isTemporalColumnType({ type: 'datetime' }), true);
  assert.equal(isTemporalColumnType({ type: 'timestamp' }), true);
  assert.equal(isTemporalColumnType({ type: 'text' }), false);
});

test('buildFilterOperatorOptions returns numeric operators for numeric columns', () => {
  const t = (key) => key;
  const options = buildFilterOperatorOptions({ type: 'bigint' }, t);
  assert.deepEqual(
    options.map((item) => item.value),
    ['eq', 'neq', 'gt', 'lt'],
  );
});

test('normalizeFilterRuleDraftsList filters invalid drafts and generates id', () => {
  const drafts = [
    { column: 'name', operator: 'contains', value: 'alice' },
    { column: '', operator: 'contains', value: 'x' },
    { column: 'age', operator: 'gt', value: '' },
  ];

  const normalized = normalizeFilterRuleDraftsList(drafts, () => 'generated-id');
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, 'generated-id');
  assert.equal(normalized[0].column, 'name');
  assert.equal(normalized[0].operator, 'contains');
  assert.equal(normalized[0].value, 'alice');
});

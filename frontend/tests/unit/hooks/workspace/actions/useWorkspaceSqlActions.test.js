import test from 'node:test';
import assert from 'node:assert/strict';
import { mapExplainRowToPlanItem } from '../../../../../src/hooks/workspace/actions/useWorkspaceSqlActions.js';

test('mapExplainRowToPlanItem parses PostgreSQL style EXPLAIN line', () => {
  const row = {
    'QUERY PLAN': 'Seq Scan on users  (cost=0.00..35.50 rows=2550 width=8)',
  };

  const item = mapExplainRowToPlanItem(row, (entry) => entry['QUERY PLAN']);

  assert.equal(item.node, 'Seq Scan');
  assert.equal(item.entity, 'users');
  assert.equal(item.cost, '0.00..35.50');
  assert.equal(item.rows, '2550');
  assert.equal(item.time, '-');
});

test('mapExplainRowToPlanItem maps MySQL style EXPLAIN row fields', () => {
  const row = {
    select_type: 'SIMPLE',
    table: 'users',
    rows: 120,
    cost_info: {
      query_cost: '20.10',
    },
  };

  const item = mapExplainRowToPlanItem(row, () => 'ignored');

  assert.equal(item.node, 'SIMPLE');
  assert.equal(item.entity, 'users');
  assert.equal(item.rows, '120');
  assert.equal(item.cost, '20.10');
  assert.equal(item.time, '-');
});

test('mapExplainRowToPlanItem returns stable fallback for invalid input', () => {
  const item = mapExplainRowToPlanItem(null, () => null);

  assert.equal(item.node, '-');
  assert.equal(item.entity, '-');
  assert.equal(item.cost, '-');
  assert.equal(item.rows, '-');
  assert.equal(item.time, '-');
});

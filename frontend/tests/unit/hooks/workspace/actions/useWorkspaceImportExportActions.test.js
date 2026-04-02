import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeImportedValue,
  buildImportMeta,
} from '../../../../../src/hooks/workspace/actions/useWorkspaceImportExportActions.js';

test('normalizeImportedValue maps booleans to 1/0', () => {
  const helpers = {
    isBooleanColumn: () => true,
    isNumericColumnType: () => false,
  };
  assert.equal(normalizeImportedValue('true', {}, helpers), 1);
  assert.equal(normalizeImportedValue('No', {}, helpers), 0);
});

test('normalizeImportedValue maps numeric strings to numbers', () => {
  const helpers = {
    isBooleanColumn: () => false,
    isNumericColumnType: () => true,
  };
  assert.equal(normalizeImportedValue('42', {}, helpers), 42);
  assert.equal(normalizeImportedValue('3.14', {}, helpers), 3.14);
});

test('normalizeImportedValue returns null for empty values', () => {
  const helpers = {
    isBooleanColumn: () => false,
    isNumericColumnType: () => false,
  };
  assert.equal(normalizeImportedValue('', {}, helpers), null);
  assert.equal(normalizeImportedValue('   ', {}, helpers), null);
  assert.equal(normalizeImportedValue(null, {}, helpers), null);
});

test('buildImportMeta returns correct accept pattern by modal type', () => {
  const t = (key) => key;
  const dbMeta = buildImportMeta('import_db', t);
  const tableMeta = buildImportMeta('import', t);

  assert.equal(dbMeta.accept, '.sql,.zip,.sql.zip');
  assert.equal(dbMeta.dropLabel, 'dropSqlZipHere');
  assert.equal(tableMeta.accept, '.csv,.xlsx,.xls,.sql,.zip,.sql.zip');
  assert.equal(tableMeta.dropLabel, 'dropImportHere');
});

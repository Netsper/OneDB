import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapColumnTypeForDriver,
  buildColumnDefaultSql,
} from '../../../../../src/hooks/workspace/actions/useWorkspaceDataActions.js';

test('mapColumnTypeForDriver maps MySQL-like aliases for pgsql', () => {
  assert.equal(mapColumnTypeForDriver('int(11)', 'pgsql'), 'INTEGER');
  assert.equal(mapColumnTypeForDriver('tinyint(1)', 'pgsql'), 'BOOLEAN');
  assert.equal(mapColumnTypeForDriver('datetime', 'pgsql'), 'TIMESTAMP');
  assert.equal(mapColumnTypeForDriver('varchar(255)', 'pgsql'), 'varchar(255)');
});

test('mapColumnTypeForDriver leaves type unchanged for mysql', () => {
  assert.equal(mapColumnTypeForDriver('int(11)', 'mysql'), 'int(11)');
});

test('buildColumnDefaultSql keeps known raw defaults', () => {
  const escaped = (value) => `'${value}'`;
  assert.equal(buildColumnDefaultSql('CURRENT_TIMESTAMP', escaped), ' DEFAULT CURRENT_TIMESTAMP');
  assert.equal(buildColumnDefaultSql('NOW()', escaped), ' DEFAULT NOW()');
  assert.equal(buildColumnDefaultSql('15', escaped), ' DEFAULT 15');
});

test('buildColumnDefaultSql escapes string defaults', () => {
  const escaped = (value) => `__${value}__`;
  assert.equal(buildColumnDefaultSql('active', escaped), ' DEFAULT __active__');
  assert.equal(buildColumnDefaultSql('', escaped), '');
});

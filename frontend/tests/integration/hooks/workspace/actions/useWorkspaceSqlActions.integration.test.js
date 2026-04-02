import test from 'node:test';
import assert from 'node:assert/strict';
import createWorkspaceSqlActions from '../../../../../src/hooks/workspace/actions/useWorkspaceSqlActions.js';

function createDependencies(overrides = {}) {
  const calls = {
    setIsQueryRunning: [],
    setSqlResult: [],
    executeSql: [],
    refreshSchemas: 0,
    ensureDatabaseTablesLoaded: [],
    refreshActiveTable: 0,
    setActiveTable: [],
    showToast: [],
  };

  let qps = 0;
  let history = [];

  const deps = {
    sqlQuery: 'SELECT * FROM users',
    setIsQueryRunning: (value) => calls.setIsQueryRunning.push(value),
    sqlHistory: history,
    setSqlHistory: (updater) => {
      history = typeof updater === 'function' ? updater(history) : updater;
    },
    executeSql: async (sql) => {
      calls.executeSql.push(sql);
      return {
        kind: 'result_set',
        columns: ['id', 'email'],
        rows: [{ id: 1, email: 'alpha@example.com' }],
      };
    },
    activeDb: 'appdb',
    getFirstValue: (row) => row['QUERY PLAN'],
    setSqlResult: (value) => calls.setSqlResult.push(value),
    setQps: (updater) => {
      qps = typeof updater === 'function' ? updater(qps) : updater;
    },
    refreshSchemas: async () => {
      calls.refreshSchemas += 1;
    },
    ensureDatabaseTablesLoaded: async (dbName, options) => {
      calls.ensureDatabaseTablesLoaded.push({ dbName, options });
    },
    activeTable: 'users',
    refreshActiveTable: async () => {
      calls.refreshActiveTable += 1;
    },
    setActiveTable: (value) => calls.setActiveTable.push(value),
    showToast: (message, type) => calls.showToast.push({ message, type }),
    t: (key) => key,
    setSqlQuery: () => {},
    setSqlSnippets: () => {},
    ...overrides,
  };

  return { deps, calls, getQps: () => qps, getHistory: () => history };
}

test('runSql stores result set and explain plan for SELECT queries', async () => {
  const { deps, calls, getQps, getHistory } = createDependencies({
    executeSql: async (sql) => {
      calls.executeSql.push(sql);
      if (/^EXPLAIN /i.test(sql)) {
        return {
          kind: 'result_set',
          rows: [
            {
              'QUERY PLAN': 'Seq Scan on users  (cost=0.00..35.50 rows=2550 width=8)',
            },
          ],
        };
      }

      return {
        kind: 'result_set',
        columns: ['id', 'email'],
        rows: [{ id: 1, email: 'alpha@example.com' }],
      };
    },
  });

  const actions = createWorkspaceSqlActions(deps);
  await actions.runSql();

  assert.deepEqual(calls.setIsQueryRunning, [true, false]);
  assert.deepEqual(calls.executeSql, ['SELECT * FROM users', 'EXPLAIN SELECT * FROM users']);
  assert.equal(getQps(), 1);
  assert.deepEqual(getHistory(), ['SELECT * FROM users']);
  assert.equal(calls.setSqlResult.length, 1);
  assert.equal(calls.setSqlResult[0].data.length, 1);
  assert.equal(calls.setSqlResult[0].plan.length, 1);
  assert.equal(calls.setSqlResult[0].plan[0].node, 'Seq Scan');
  assert.deepEqual(calls.showToast.at(-1), { message: 'sqlExecuted', type: 'success' });
  assert.equal(calls.refreshSchemas, 0);
});

test('runSql refreshes schema and table cache after mutation queries', async () => {
  const { deps, calls, getQps, getHistory } = createDependencies({
    sqlQuery: 'UPDATE users SET email = \'beta@example.com\' WHERE id = 1',
    executeSql: async (sql) => {
      calls.executeSql.push(sql);
      return {
        kind: 'mutation',
        affectedRows: 1,
      };
    },
  });

  const actions = createWorkspaceSqlActions(deps);
  await actions.runSql();

  assert.deepEqual(calls.setIsQueryRunning, [true, false]);
  assert.deepEqual(calls.executeSql, ["UPDATE users SET email = 'beta@example.com' WHERE id = 1"]);
  assert.equal(getQps(), 1);
  assert.deepEqual(getHistory(), ["UPDATE users SET email = 'beta@example.com' WHERE id = 1"]);
  assert.deepEqual(calls.setSqlResult, [null]);
  assert.equal(calls.refreshSchemas, 1);
  assert.deepEqual(calls.ensureDatabaseTablesLoaded, [{ dbName: 'appdb', options: { force: true } }]);
  assert.equal(calls.refreshActiveTable, 1);
  assert.deepEqual(calls.showToast.at(-1), { message: 'sqlExecuted', type: 'success' });
});

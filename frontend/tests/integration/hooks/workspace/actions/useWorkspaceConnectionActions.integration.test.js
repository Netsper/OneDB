import test from 'node:test';
import assert from 'node:assert/strict';
import createWorkspaceConnectionActions from '../../../../../src/hooks/workspace/actions/useWorkspaceConnectionActions.js';

function createDependencies(overrides = {}) {
  const calls = {
    setIsConnecting: [],
    setLoginError: [],
    setIsConnected: [],
    setQps: [],
    setActiveDb: [],
    setActiveTable: [],
    setExpandedDbs: [],
    setExpandedGroups: [],
    showToast: [],
    callApi: [],
  };

  const deps = {
    t: (key) => key,
    connForm: { host: '127.0.0.1', user: 'root', pass: 'secret', port: '3306', driver: 'mysql' },
    setConnForm: () => {},
    setIsConnecting: (value) => calls.setIsConnecting.push(value),
    setLoginError: (value) => calls.setLoginError.push(value),
    setIsConnected: (value) => calls.setIsConnected.push(value),
    setQps: (value) => calls.setQps.push(value),
    setActiveDb: (value) => calls.setActiveDb.push(value),
    setActiveTable: (value) => calls.setActiveTable.push(value),
    setExpandedDbs: (value) => calls.setExpandedDbs.push(value),
    setExpandedGroups: (value) => calls.setExpandedGroups.push(value),
    setSavedConnections: () => {},
    setProfileNameDraft: () => {},
    setIsSaveProfileModalOpen: () => {},
    csrfTokenRef: { current: 'stale' },
    getCsrfToken: async () => {},
    callApi: async (action, payload) => {
      calls.callApi.push({ action, payload });
      return { ok: true };
    },
    buildConnectionPayload: (database) => ({ database }),
    refreshSchemas: async () => ['appdb'],
    showToast: (message, type) => calls.showToast.push({ message, type }),
    ...overrides,
  };

  return { deps, calls };
}

test('handleConnect completes happy path and initializes active database state', async () => {
  const { deps, calls } = createDependencies();
  const actions = createWorkspaceConnectionActions(deps);

  let preventDefaultCalled = false;
  await actions.handleConnect({
    preventDefault: () => {
      preventDefaultCalled = true;
    },
  });

  assert.equal(preventDefaultCalled, true);
  assert.deepEqual(calls.setIsConnecting, [true, false]);
  assert.deepEqual(calls.setLoginError, ['']);
  assert.deepEqual(calls.callApi.map((entry) => entry.action), ['test_connection']);
  assert.deepEqual(calls.setIsConnected, [true]);
  assert.deepEqual(calls.setQps, [0]);
  assert.deepEqual(calls.setActiveDb, ['appdb']);
  assert.deepEqual(calls.setExpandedDbs, [{ appdb: true }]);
  assert.deepEqual(calls.setExpandedGroups, [{ appdb_tables: true, appdb_views: true }]);
  assert.deepEqual(calls.showToast.at(-1), { message: 'connSuccess', type: 'success' });
});

test('handleConnect reports failure and resets connecting flag', async () => {
  const { deps, calls } = createDependencies({
    callApi: async () => {
      throw new Error('Connection refused');
    },
  });
  const actions = createWorkspaceConnectionActions(deps);

  await actions.handleConnect();

  assert.deepEqual(calls.setIsConnecting, [true, false]);
  assert.deepEqual(calls.setLoginError, ['', 'Connection refused']);
  assert.deepEqual(calls.setIsConnected, []);
  assert.deepEqual(calls.showToast.at(-1), { message: 'Connection refused', type: 'error' });
});

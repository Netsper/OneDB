import test from 'node:test';
import assert from 'node:assert/strict';
import createWorkspaceNavigationActions from '../../../../../src/hooks/workspace/actions/useWorkspaceNavigationActions.js';

function createHarness(overrides = {}) {
  const calls = {
    showToast: [],
    ensureDatabaseTablesLoaded: [],
    refreshActiveTable: 0,
    refreshSchemas: 0,
    refreshPing: 0,
    executeSql: [],
  };

  const state = {
    isConnected: true,
    activeDb: null,
    activeTable: null,
    activeTab: 'browse',
    databases: {
      appdb: {
        users: { type: 'table' },
        logs: { type: 'table' },
        audit: { type: 'table' },
        v_users: { type: 'view' },
      },
    },
    currentTableData: {
      type: 'table',
      columns: [
        { name: 'id', isPrimary: true },
        { name: 'name', isPrimary: false },
      ],
      data: [{ id: 1, name: 'Alice' }],
    },
    cellContextMenu: {
      visible: false,
      rowIndex: 0,
      colName: null,
      value: null,
    },
    openTableTabs: [],
    activeTableTabId: null,
    expandedDbs: {},
    expandedGroups: {},
    searchTerm: 'seed',
    filterRuleDrafts: [{ id: 'x' }],
    filterRules: [{ id: 'x' }],
    hiddenColumns: new Set(['name']),
    sortConfig: { key: 'id', direction: 'desc' },
    serverColumnFilters: { id: { operator: 'eq', value: '1' } },
    columnMenu: { columnName: 'id', draft: { operator: 'eq', value: '1' } },
    selectedRows: new Set([0]),
    page: 7,
    editingCell: { rowIndex: 0, colName: 'name', value: 'Alice' },
    contextMenu: { visible: true, dbName: 'appdb', tableName: 'users' },
    schemaViewMode: 'json',
    isCommandOpen: true,
    sqlQuery: 'SELECT 1',
    sqlResult: { ok: true },
    modalConfig: { isOpen: false, type: null },
    pinnedItems: [],
    ...overrides.state,
  };

  const deps = {
    t: (key) => key,
    showToast: (message, type) => calls.showToast.push({ message, type }),
    isConnected: state.isConnected,
    activeDb: state.activeDb,
    activeTable: state.activeTable,
    activeTab: state.activeTab,
    databases: state.databases,
    currentTableData: state.currentTableData,
    cellContextMenu: state.cellContextMenu,
    refreshActiveTable: async () => {
      calls.refreshActiveTable += 1;
    },
    refreshSchemas: async () => {
      calls.refreshSchemas += 1;
    },
    ensureDatabaseTablesLoaded: async (dbName, options) => {
      calls.ensureDatabaseTablesLoaded.push({ dbName, options });
      if (overrides.ensureDatabaseTablesLoaded) {
        return overrides.ensureDatabaseTablesLoaded(dbName, options);
      }
      return Object.entries(state.databases[dbName] || {}).map(([name, meta]) => ({
        name,
        type: meta.type || 'table',
      }));
    },
    refreshPing: async () => {
      calls.refreshPing += 1;
    },
    executeSql: async (sql) => {
      calls.executeSql.push(sql);
    },
    quoteIdentifier: (name) => `\`${name}\``,
    escapeLiteral: (value) => {
      if (value === null || value === undefined) return 'NULL';
      return `'${String(value).replace(/'/g, "''")}'`;
    },
    parseJsonCellValue: (value) => {
      try {
        return JSON.parse(String(value));
      } catch {
        return null;
      }
    },
    isJsonColumn: (column) => column?.type === 'json',
    setIsRefreshing: (value) => {
      state.isRefreshing = value;
    },
    setActiveDb: (value) => {
      state.activeDb = value;
    },
    setActiveTable: (value) => {
      state.activeTable = value;
    },
    setExpandedDbs: (value) => {
      state.expandedDbs = typeof value === 'function' ? value(state.expandedDbs) : value;
    },
    setExpandedGroups: (value) => {
      state.expandedGroups = typeof value === 'function' ? value(state.expandedGroups) : value;
    },
    openTableTabs: state.openTableTabs,
    setOpenTableTabs: (value) => {
      state.openTableTabs = typeof value === 'function' ? value(state.openTableTabs) : value;
    },
    activeTableTabId: state.activeTableTabId,
    setActiveTableTabId: (value) => {
      state.activeTableTabId = value;
    },
    setActiveTab: (value) => {
      state.activeTab = value;
    },
    setSearchTerm: (value) => {
      state.searchTerm = value;
    },
    setFilterRuleDrafts: (value) => {
      state.filterRuleDrafts = value;
    },
    setFilterRules: (value) => {
      state.filterRules = value;
    },
    setHiddenColumns: (value) => {
      state.hiddenColumns = value;
    },
    setSortConfig: (value) => {
      state.sortConfig = value;
    },
    setServerColumnFilters: (value) => {
      state.serverColumnFilters = value;
    },
    setColumnMenu: (value) => {
      state.columnMenu = value;
    },
    setSelectedRows: (value) => {
      state.selectedRows = typeof value === 'function' ? value(state.selectedRows) : value;
    },
    setPage: (value) => {
      state.page = value;
    },
    setEditingCell: (value) => {
      state.editingCell = value;
    },
    setCellContextMenu: (value) => {
      state.cellContextMenu = typeof value === 'function' ? value(state.cellContextMenu) : value;
    },
    setSchemaViewMode: (value) => {
      state.schemaViewMode = value;
    },
    setIsCommandOpen: (value) => {
      state.isCommandOpen = value;
    },
    setSqlQuery: (value) => {
      state.sqlQuery = value;
    },
    setSqlResult: (value) => {
      state.sqlResult = value;
    },
    setContextMenu: (value) => {
      state.contextMenu = typeof value === 'function' ? value(state.contextMenu) : value;
    },
    setModalConfig: (value) => {
      state.modalConfig = value;
    },
    setPinnedItems: (value) => {
      state.pinnedItems = typeof value === 'function' ? value(state.pinnedItems) : value;
    },
    selectDbAndTable: async () => {},
    ...overrides.deps,
  };

  const makeActions = () =>
    createWorkspaceNavigationActions({
      ...deps,
      activeDb: state.activeDb,
      activeTable: state.activeTable,
      activeTab: state.activeTab,
      databases: state.databases,
      currentTableData: state.currentTableData,
      cellContextMenu: state.cellContextMenu,
      openTableTabs: state.openTableTabs,
      activeTableTabId: state.activeTableTabId,
    });

  return { state, calls, makeActions };
}

test('selectDbAndTable expands correct group for views and resets view state', async () => {
  const { state, makeActions } = createHarness({
    ensureDatabaseTablesLoaded: async () => [{ name: 'v_users', type: 'view' }],
  });

  await makeActions().selectDbAndTable('appdb', 'v_users');

  assert.equal(state.activeDb, 'appdb');
  assert.equal(state.activeTable, 'v_users');
  assert.equal(state.expandedDbs.appdb, true);
  assert.equal(state.expandedGroups.appdb_views, true);
  assert.equal(state.openTableTabs.length, 1);
  assert.deepEqual(state.openTableTabs[0], {
    id: 'appdb::v_users',
    dbName: 'appdb',
    tableName: 'v_users',
    pinned: false,
    isTransient: false,
  });
  assert.equal(state.page, 1);
  assert.equal(state.searchTerm, '');
  assert.deepEqual(state.filterRules, []);
  assert.deepEqual(state.filterRuleDrafts, []);
  assert.deepEqual(state.sortConfig, { key: null, direction: 'asc' });
});

test('transient tab flow keeps only latest preview tab and supports promotion', async () => {
  const { state, makeActions } = createHarness();
  let actions = makeActions();

  await actions.selectDbAndTable('appdb', 'users', null, false);
  actions = makeActions();
  await actions.selectDbAndTable('appdb', 'logs', null, true);
  actions = makeActions();
  await actions.selectDbAndTable('appdb', 'audit', null, true);

  assert.deepEqual(
    state.openTableTabs.map((tab) => ({ id: tab.id, isTransient: tab.isTransient })),
    [
      { id: 'appdb::users', isTransient: false },
      { id: 'appdb::audit', isTransient: true },
    ],
  );

  actions = makeActions();
  await actions.selectDbAndTable('appdb', 'audit', null, false);
  assert.deepEqual(
    state.openTableTabs.map((tab) => ({ id: tab.id, isTransient: tab.isTransient })),
    [
      { id: 'appdb::users', isTransient: false },
      { id: 'appdb::audit', isTransient: false },
    ],
  );
});

test('close tab actions preserve pinned tabs and keep active tab consistent', async () => {
  const { state, makeActions } = createHarness({
    state: {
      openTableTabs: [
        { id: 'appdb::pinned', dbName: 'appdb', tableName: 'pinned', pinned: true },
        { id: 'appdb::users', dbName: 'appdb', tableName: 'users', pinned: false },
        { id: 'appdb::logs', dbName: 'appdb', tableName: 'logs', pinned: false },
        { id: 'appdb::audit', dbName: 'appdb', tableName: 'audit', pinned: false },
      ],
      activeTableTabId: 'appdb::audit',
      activeDb: 'appdb',
      activeTable: 'audit',
    },
  });

  let actions = makeActions();
  actions.closeTableTabsToRight('appdb::users');
  assert.deepEqual(
    state.openTableTabs.map((tab) => tab.id),
    ['appdb::pinned', 'appdb::users'],
  );
  assert.equal(state.activeTableTabId, 'appdb::users');

  state.openTableTabs = [
    { id: 'appdb::pinned', dbName: 'appdb', tableName: 'pinned', pinned: true },
    { id: 'appdb::users', dbName: 'appdb', tableName: 'users', pinned: false },
    { id: 'appdb::logs', dbName: 'appdb', tableName: 'logs', pinned: false },
  ];
  state.activeTableTabId = 'appdb::users';

  actions = makeActions();
  actions.closeOtherTableTabs('appdb::logs');
  assert.deepEqual(
    state.openTableTabs.map((tab) => tab.id),
    ['appdb::pinned', 'appdb::logs'],
  );
  assert.equal(state.activeTableTabId, 'appdb::logs');
});

test('setCellNullFromMenu updates selected cell to NULL using primary key', async () => {
  const { state, calls, makeActions } = createHarness({
    state: {
      activeDb: 'appdb',
      activeTable: 'users',
      cellContextMenu: {
        visible: true,
        rowIndex: 0,
        colName: 'name',
        value: 'Alice',
      },
    },
  });

  await makeActions().setCellNullFromMenu();

  assert.equal(calls.executeSql.length, 1);
  assert.match(calls.executeSql[0], /^UPDATE `users` SET `name` = NULL WHERE `id` = '1';$/);
  assert.equal(calls.refreshActiveTable, 1);
  assert.deepEqual(calls.showToast.at(-1), { message: 'recordUpdated', type: 'success' });
  assert.equal(state.cellContextMenu.visible, false);
});

test('pin toggles add and remove database/table keys', () => {
  const { state, makeActions } = createHarness({
    state: {
      contextMenu: { visible: true, dbName: 'appdb', tableName: 'users' },
    },
  });
  const actions = makeActions();

  actions.togglePinDatabase('appdb');
  assert.deepEqual(state.pinnedItems, ['db:appdb']);
  actions.togglePinDatabase('appdb');
  assert.deepEqual(state.pinnedItems, []);

  actions.togglePinTable('appdb', 'users');
  assert.deepEqual(state.pinnedItems, ['table:appdb.users']);
  assert.equal(state.contextMenu.visible, false);
});

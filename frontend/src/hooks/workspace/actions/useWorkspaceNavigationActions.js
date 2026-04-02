import { makeDatabasePinKey, makeTablePinKey } from '../../../utils/pins.js';

export default function useWorkspaceNavigationActions({
  t,
  showToast,
  isConnected,
  activeDb,
  activeTable,
  activeTab,
  currentTableData,
  cellContextMenu,
  refreshActiveTable,
  refreshSchemas,
  ensureDatabaseTablesLoaded,
  refreshPing,
  executeSql,
  quoteIdentifier,
  escapeLiteral,
  parseJsonCellValue,
  isJsonColumn,
  setIsRefreshing,
  setActiveDb,
  setActiveTable,
  setActiveTab,
  setSearchTerm,
  setFilterRuleDrafts,
  setFilterRules,
  setHiddenColumns,
  setSortConfig,
  setServerColumnFilters,
  setColumnMenu,
  setSelectedRows,
  setPage,
  setEditingCell,
  setCellContextMenu,
  setSchemaViewMode,
  setIsCommandOpen,
  setSqlQuery,
  setSqlResult,
  setContextMenu,
  setModalConfig,
  setPinnedItems,
}) {
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeDb && activeTable) {
        await refreshActiveTable();
      } else if (isConnected) {
        await refreshSchemas();
        if (activeDb) {
          await ensureDatabaseTablesLoaded(activeDb, { force: true });
        }
      }
      await refreshPing();
      setIsRefreshing(false);
      showToast(t('dataUpdated'), 'success');
    } catch (error) {
      setIsRefreshing(false);
      showToast(error.message || 'Refresh failed.', 'error');
    }
  };

  const selectDbAndTable = async (dbName, tableName, forceTab = null) => {
    try {
      await ensureDatabaseTablesLoaded(dbName);
    } catch (error) {
      showToast(error.message || 'Failed to load table list.', 'error');
      return;
    }
    setActiveDb(dbName);
    setActiveTable(tableName);
    if (forceTab) setActiveTab(forceTab);
    else if (activeTab !== 'browse' && activeTab !== 'schema' && activeTab !== 'sql')
      setActiveTab('browse');

    setSearchTerm('');
    setFilterRuleDrafts([]);
    setFilterRules([]);
    setHiddenColumns(new Set());
    setSortConfig({ key: null, direction: 'asc' });
    setServerColumnFilters({});
    setColumnMenu({ columnName: null, draft: null });
    setSelectedRows(new Set());
    setPage(1);
    setEditingCell(null);
    setCellContextMenu((prev) => ({ ...prev, visible: false }));
    setSchemaViewMode('table');
    setIsCommandOpen(false);
    setSqlQuery(`SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 50;`);
    setSqlResult(null);
  };

  const handleContextMenu = (e, dbName, tableName) => {
    e.preventDefault();
    setCellContextMenu((prev) => ({ ...prev, visible: false }));
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, dbName, tableName });
  };

  const openCellContextMenu = (event, rowIndex, column, rawValue) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu((prev) => ({ ...prev, visible: false }));

    const parsed = parseJsonCellValue(rawValue);
    setCellContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      rowIndex,
      colName: column.name,
      value: rawValue,
      canShowJson: isJsonColumn(column) || parsed !== null,
    });
  };

  const closeCellContextMenu = () => {
    setCellContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const openCellJsonViewerFromMenu = () => {
    if (!cellContextMenu.visible) return;
    setModalConfig({
      isOpen: true,
      type: 'json_viewer',
      data: {
        columnName: cellContextMenu.colName,
        value: cellContextMenu.value,
      },
    });
    closeCellContextMenu();
  };

  const setCellNullFromMenu = async () => {
    if (!currentTableData || !activeTable || currentTableData.type === 'view') {
      closeCellContextMenu();
      return;
    }

    const targetRow = currentTableData.data[cellContextMenu.rowIndex];
    if (!targetRow || !cellContextMenu.colName) {
      closeCellContextMenu();
      return;
    }

    const pkCol = currentTableData.columns.find((c) => c.isPrimary);
    if (!pkCol) {
      showToast('Primary key is required for update.', 'error');
      closeCellContextMenu();
      return;
    }

    if (targetRow[cellContextMenu.colName] === null) {
      closeCellContextMenu();
      return;
    }

    try {
      const sql = `UPDATE ${quoteIdentifier(activeTable)} SET ${quoteIdentifier(cellContextMenu.colName)} = NULL WHERE ${quoteIdentifier(pkCol.name)} = ${escapeLiteral(targetRow[pkCol.name])};`;
      await executeSql(sql);
      await refreshActiveTable();
      showToast(t('recordUpdated'), 'success');
    } catch (error) {
      showToast(error.message || 'Update failed.', 'error');
    } finally {
      closeCellContextMenu();
    }
  };

  const togglePinDatabase = (dbName) => {
    const pinKey = makeDatabasePinKey(dbName);
    setPinnedItems((prev) => {
      if (prev.includes(pinKey)) return prev.filter((key) => key !== pinKey);
      return [...prev, pinKey];
    });
  };

  const togglePinTable = (dbName, tableName) => {
    const pinKey = makeTablePinKey(dbName, tableName);
    setPinnedItems((prev) => {
      if (prev.includes(pinKey)) return prev.filter((key) => key !== pinKey);
      return [...prev, pinKey];
    });
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  return {
    handleRefresh,
    selectDbAndTable,
    handleContextMenu,
    openCellContextMenu,
    closeCellContextMenu,
    openCellJsonViewerFromMenu,
    setCellNullFromMenu,
    togglePinDatabase,
    togglePinTable,
  };
}

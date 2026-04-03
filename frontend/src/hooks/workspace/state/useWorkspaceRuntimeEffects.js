import { useEffect, useRef } from 'react';

export default function useWorkspaceRuntimeEffects({
  autoRefreshInt,
  isConnected,
  activeDb,
  activeTable,
  refreshActiveTable,
  setIsRefreshing,
  refreshPing,
  setCpuUsage,
  connForm,
  setDbSizeLabel,
  refreshDatabaseSize,
  loadedTableDbs,
  loadingTableDbs,
  ensureDatabaseTablesLoaded,
  modalConfig,
  setIsImportLimitsLoading,
  setImportLimitsError,
  callApi,
  setImportLimits,
  t,
  loadTableDetails,
  showToast,
  filterRules,
  page,
  rowsPerPage,
  serverColumnFilters,
  sortConfig,
  setSelectedRows,
  isCommandOpen,
  isVisibilityMenuOpen,
  databases,
}) {
  const loadTableDetailsRef = useRef(loadTableDetails);

  useEffect(() => {
    loadTableDetailsRef.current = loadTableDetails;
  }, [loadTableDetails]);

  useEffect(() => {
    let intervalId;
    if (autoRefreshInt > 0 && isConnected && activeDb && activeTable) {
      intervalId = setInterval(async () => {
        setIsRefreshing(true);
        try {
          await refreshActiveTable();
        } finally {
          setIsRefreshing(false);
        }
      }, autoRefreshInt * 1000);
    }
    return () => clearInterval(intervalId);
  }, [autoRefreshInt, isConnected, activeDb, activeTable, refreshActiveTable, setIsRefreshing]);

  useEffect(() => {
    if (!isConnected) return undefined;
    let isDisposed = false;
    const tick = async () => {
      try {
        const elapsed = await refreshPing();
        if (!isDisposed) {
          setCpuUsage(Math.min(99, Math.max(1, Math.round(elapsed / 2))));
        }
      } catch {
        // Keep previous value if ping fails.
      }
    };

    tick();
    const id = setInterval(tick, 10000);
    return () => {
      isDisposed = true;
      clearInterval(id);
    };
  }, [
    connForm.driver,
    connForm.host,
    connForm.port,
    connForm.user,
    isConnected,
    refreshPing,
    setCpuUsage,
  ]);

  useEffect(() => {
    if (!isConnected || !activeDb) {
      setDbSizeLabel('--');
      return;
    }
    refreshDatabaseSize(activeDb);
  }, [activeDb, connForm.driver, isConnected, refreshDatabaseSize, setDbSizeLabel]);

  useEffect(() => {
    if (!isConnected || !activeDb || loadedTableDbs[activeDb] || loadingTableDbs[activeDb]) return;
    ensureDatabaseTablesLoaded(activeDb).catch(() => {});
  }, [isConnected, activeDb, loadedTableDbs, loadingTableDbs, ensureDatabaseTablesLoaded]);

  useEffect(() => {
    const isImportOpen =
      modalConfig.isOpen && (modalConfig.type === 'import' || modalConfig.type === 'import_db');
    if (!isImportOpen) {
      setIsImportLimitsLoading(false);
      setImportLimitsError('');
      return undefined;
    }

    let isDisposed = false;
    setIsImportLimitsLoading(true);
    setImportLimitsError('');

    callApi('upload_limits', null, { method: 'GET' })
      .then((result) => {
        if (isDisposed) return;
        setImportLimits(result.limits || null);
      })
      .catch((error) => {
        if (isDisposed) return;
        setImportLimits(null);
        setImportLimitsError(error.message || t('importLimitsLoadError'));
      })
      .finally(() => {
        if (!isDisposed) setIsImportLimitsLoading(false);
      });

    return () => {
      isDisposed = true;
    };
  }, [
    callApi,
    modalConfig.isOpen,
    modalConfig.type,
    setImportLimits,
    setImportLimitsError,
    setIsImportLimitsLoading,
    t,
  ]);

  useEffect(() => {
    if (!activeDb || !activeTable) return undefined;
    let isDisposed = false;

    setIsRefreshing(true);
    loadTableDetailsRef.current(activeDb, activeTable)
      .catch((error) => {
        if (!isDisposed) {
          showToast(error.message || 'Failed to load table data.', 'error');
        }
      })
      .finally(() => {
        if (!isDisposed) {
          setIsRefreshing(false);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [
    activeDb,
    activeTable,
    filterRules,
    page,
    rowsPerPage,
    serverColumnFilters,
    setIsRefreshing,
    showToast,
    sortConfig,
  ]);

  useEffect(() => {
    setSelectedRows(new Set());
  }, [
    activeDb,
    activeTable,
    page,
    rowsPerPage,
    sortConfig,
    serverColumnFilters,
    filterRules,
    setSelectedRows,
  ]);

  useEffect(() => {
    if (!isCommandOpen && !isVisibilityMenuOpen) return;
    Promise.all(Object.keys(databases).map((dbName) => ensureDatabaseTablesLoaded(dbName))).catch(
      () => {},
    );
  }, [isCommandOpen, isVisibilityMenuOpen, databases, ensureDatabaseTablesLoaded]);
}

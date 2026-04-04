export default function useWorkspaceLayoutViewModel(params) {
  const {
    t,
    tc,
    connForm,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarWidth,
    handleSidebarResizeStart,
    visibilityMenuRef,
    visibilityButtonRef,
    isVisibilityMenuOpen,
    setIsVisibilityMenuOpen,
    visibilityQuery,
    setVisibilityQuery,
    visibilityDatabases,
    toggleDatabaseVisibility,
    areAllVisibilityDatabasesVisible,
    toggleAllVisibilityDatabases,
    isDatabaseVisible,
    sidebarQuery,
    setSidebarQuery,
    setInputVal,
    setModalConfig,
    filteredPinnedDatabases,
    sidebarDatabases,
    activeDb,
    activeTable,
    expandedDbs,
    expandedGroups,
    setActiveDb,
    setActiveTable,
    setActiveTableTabId,
    setExpandedDbs,
    setExpandedGroups,
    ensureDatabaseTablesLoaded,
    selectDbAndTable,
    handleDeleteDB,
    togglePinDatabase,
    isDatabasePinned,
    togglePinTable,
    isTablePinned,
    loadingTableDbs,
    hasSidebarFilters,
    handleContextMenu,
    handleRefresh,
    isRefreshing,
    setIsSettingsOpen,
    setIsConnected,
    ping,
    lang,
    isCommandOpen,
    setIsCommandOpen,
    searchInputRef,
    commandQuery,
    setCommandQuery,
    filteredCommands,
  } = params;

  return {
    sidebar: {
      t,
      tc,
      isSidebarOpen,
      sidebarWidth,
      onResizeStart: handleSidebarResizeStart,
      visibilityMenuRef,
      visibilityButtonRef,
      isVisibilityMenuOpen,
      setIsVisibilityMenuOpen,
      visibilityQuery,
      setVisibilityQuery,
      visibilityDatabases,
      toggleDatabaseVisibility,
      areAllVisibilityDatabasesVisible,
      toggleAllVisibilityDatabases,
      isDatabaseVisible,
      sidebarQuery,
      setSidebarQuery,
      openCommandPalette: () => setIsCommandOpen(true),
      openCreateDatabase: () => {
        setInputVal('');
        setModalConfig({ isOpen: true, type: 'create_db' });
      },
      openDatabaseAdminModal: (type) => {
        setModalConfig({ isOpen: true, type });
      },
      pinnedDatabases: filteredPinnedDatabases,
      sidebarDatabases,
      activeDb,
      activeTable,
      expandedDbs,
      expandedGroups,
      openDatabase: async (dbName) => {
        setActiveDb(dbName);
        setActiveTable(null);
        setActiveTableTabId(null);
        setExpandedDbs((prev) => ({ ...prev, [dbName]: true }));
        setExpandedGroups((prev) => ({ ...prev, [`${dbName}_tables`]: true }));
        await ensureDatabaseTablesLoaded(dbName);
      },
      toggleDatabaseExpanded: async (dbName, nextExpanded) => {
        setExpandedDbs((prev) => ({ ...prev, [dbName]: nextExpanded }));
        if (nextExpanded) {
          setExpandedGroups((prev) => ({ ...prev, [`${dbName}_tables`]: true }));
          await ensureDatabaseTablesLoaded(dbName);
        }
      },
      toggleGroup: (groupKey) =>
        setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] })),
      openCreateTable: (dbName) => {
        setInputVal('');
        setModalConfig({ isOpen: true, type: 'create_table', data: { dbName } });
      },
      selectDbAndTable,
      handleDeleteDB,
      togglePinDatabase,
      isDatabasePinned,
      togglePinTable,
      isTablePinned,
      loadingTableDbs,
      hasSidebarFilters,
      handleContextMenu,
    },
    header: {
      t,
      tc,
      isSidebarOpen,
      onToggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
      host: connForm.host,
      activeDb,
      activeTable,
      onClearSelection: () => {
        setActiveDb(null);
        setActiveTable(null);
        setActiveTableTabId(null);
      },
      onSelectDatabase: () => {
        setActiveTable(null);
        setActiveTableTabId(null);
      },
      onOpenCommandPalette: () => setIsCommandOpen(true),
      onRefresh: handleRefresh,
      isRefreshing,
      onOpenSettings: () => setIsSettingsOpen(true),
      onLogout: () => {
        localStorage.removeItem('dbm_last_connection');
        try {
          if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.removeItem === 'function') {
            sessionStorage.removeItem('dbm_last_connection_pass');
          }
        } catch {
          // Ignore storage access failures.
        }
        setIsConnected(false);
      },
    },
    statusBar: {
      t,
      tc,
      connForm,
      activeDb,
      ping,
      lang,
      onOpenShortcuts: () => setModalConfig({ isOpen: true, type: 'shortcuts' }),
    },
    commandPalette: {
      t,
      tc,
      isOpen: isCommandOpen,
      searchInputRef,
      commandQuery,
      setCommandQuery,
      filteredCommands,
      selectDbAndTable,
    },
  };
}

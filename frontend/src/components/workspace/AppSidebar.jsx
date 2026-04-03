import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Command,
  Database,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Search,
  Star,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import MenuSurface from '../shared/MenuSurface.jsx';

function SidebarEntry({ icon, label, active, accentBg, lightBg, textLight, onClick, trailing }) {
  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors group cursor-pointer relative ${active ? `${lightBg} ${textLight} font-medium` : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#232323]'}`}
      onClick={onClick}
    >
      {active && (
        <div
          className={`absolute left-[-1px] top-1/2 -translate-y-1/2 w-[2px] h-4 ${accentBg} rounded-r-full`}
        />
      )}
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {trailing}
    </div>
  );
}

export default function AppSidebar({
  t,
  tc,
  isSidebarOpen,
  sidebarWidth,
  onResizeStart,
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
  openCommandPalette,
  openCreateDatabase,
  openDatabaseAdminModal,
  pinnedDatabases,
  sidebarDatabases,
  activeDb,
  activeTable,
  expandedDbs,
  expandedGroups,
  openDatabase,
  toggleDatabaseExpanded,
  toggleGroup,
  openCreateTable,
  selectDbAndTable,
  handleDeleteDB,
  togglePinDatabase,
  isDatabasePinned,
  togglePinTable,
  isTablePinned,
  loadingTableDbs,
  hasSidebarFilters,
  handleContextMenu,
}) {
  const [databaseQueries, setDatabaseQueries] = useState({});
  const [isDbToolsMenuOpen, setIsDbToolsMenuOpen] = useState(false);
  const dbToolsMenuRef = useRef(null);
  const dbToolsButtonRef = useRef(null);

  useEffect(() => {
    if (!isDbToolsMenuOpen) return;
    const onPointerDown = (event) => {
      const target = event.target;
      if (
        dbToolsMenuRef.current &&
        !dbToolsMenuRef.current.contains(target) &&
        dbToolsButtonRef.current &&
        !dbToolsButtonRef.current.contains(target)
      ) {
        setIsDbToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isDbToolsMenuOpen]);

  return (
    <div
      className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden bg-[#1c1c1c] z-20 flex"
      style={{
        width: isSidebarOpen ? `${sidebarWidth}px` : '0px',
        borderRightWidth: isSidebarOpen ? '1px' : '0px',
        borderColor: '#2e2e32',
      }}
    >
      <div className="flex-1 flex flex-col h-full relative overflow-hidden min-w-[200px]">
        <div className="h-14 border-b border-[#2e2e32] flex items-center px-4 shrink-0 bg-[#18181b]">
          <div className="flex items-center gap-2 w-full">
            <Database className={`w-5 h-5 ${tc.text}`} />
            <span className="font-bold text-lg tracking-tight text-white flex-1">
              One<span className={tc.text}>DB</span>
            </span>
          </div>
        </div>

        <div className="p-3 shrink-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t('databases')}
            </span>
            <div className="flex items-center gap-1 relative" ref={visibilityMenuRef}>
              <button
                ref={visibilityButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisibilityMenuOpen((prev) => !prev);
                }}
                className={`transition-colors p-1 rounded hover:bg-[#2e2e32] ${isVisibilityMenuOpen ? `${tc.textLight} ${tc.lightBg}` : 'text-zinc-500 hover:text-zinc-200'}`}
                title={t('manageVisibleTables')}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <MenuSurface
                open={isVisibilityMenuOpen}
                anchor={visibilityButtonRef}
                placement="bottom-end"
                onClick={(e) => e.stopPropagation()}
                className="p-3 z-[140] flex flex-col w-80"
              >
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {t('databases')}
                </div>
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={visibilityQuery}
                    onChange={(e) => setVisibilityQuery(e.target.value)}
                    placeholder={t('search')}
                    className={`w-full bg-[#18181b] border border-[#333] rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-200 ${tc.focusRing}`}
                  />
                </div>
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={toggleAllVisibilityDatabases}
                    disabled={visibilityDatabases.length === 0}
                    className="px-2 py-1 rounded text-[11px] border border-[#333] text-zinc-300 hover:bg-[#2e2e32] disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {areAllVisibilityDatabasesVisible ? t('deselectAll') : t('selectAll')}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  {visibilityDatabases.map((dbName) => {
                    const visible = isDatabaseVisible(dbName);
                    return (
                      <div
                        key={dbName}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#232323]"
                      >
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => toggleDatabaseVisibility(dbName)}
                          className={`rounded-sm bg-[#18181b] border-[#444] ${tc.accent}`}
                        />
                        <button
                          type="button"
                          onClick={() => openDatabase(dbName)}
                          className="flex-1 text-left min-w-0"
                        >
                          <span className="block text-xs text-zinc-200 truncate">{dbName}</span>
                        </button>
                      </div>
                    );
                  })}
                  {visibilityDatabases.length === 0 && (
                    <div className="px-2 py-6 text-xs text-zinc-500 text-center">
                      {t('noRecords')}
                    </div>
                  )}
                </div>
              </MenuSurface>
              <button
                onClick={openCreateDatabase}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-[#2e2e32]"
                title={t('newDatabase')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="relative" ref={dbToolsMenuRef}>
                <button
                  ref={dbToolsButtonRef}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDbToolsMenuOpen((prev) => !prev);
                  }}
                  className={`transition-colors p-1 rounded hover:bg-[#2e2e32] ${isDbToolsMenuOpen ? `${tc.textLight} ${tc.lightBg}` : 'text-zinc-500 hover:text-zinc-200'}`}
                  title={t('databaseTools') || 'Database tools'}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                <MenuSurface
                  open={isDbToolsMenuOpen}
                  anchor={dbToolsButtonRef}
                  placement="bottom-end"
                  onClick={(event) => event.stopPropagation()}
                  className="p-1.5 z-[140] flex flex-col min-w-[220px]"
                >
                  {[
                    { key: 'db_privileges', label: t('privilegesTab') || 'Privileges' },
                    { key: 'db_process_list', label: t('processListTab') || 'Process list' },
                    { key: 'db_variables', label: t('variablesTab') || 'Variables' },
                    { key: 'db_status', label: t('statusTab') || 'Status' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setIsDbToolsMenuOpen(false);
                        openDatabaseAdminModal(item.key);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs text-zinc-300 hover:bg-[#2a2a2f] rounded transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </MenuSurface>
              </div>
            </div>
          </div>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder={t('searchDbTable')}
              className={`w-full bg-[#232323] border border-[#333] hover:border-[#444] rounded-md py-1.5 pl-8 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 transition-colors ${tc.focusRing}`}
            />
            {sidebarQuery && (
              <button
                onClick={() => setSidebarQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={openCommandPalette}
            className="w-full bg-[#232323] border border-[#333] hover:border-[#444] rounded-md py-1.5 px-3 text-xs text-zinc-400 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5" /> {t('openCmd')}
            </div>
            <kbd className="font-mono text-[9px] bg-[#18181b] px-1.5 py-0.5 rounded text-zinc-500">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {pinnedDatabases.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 px-3 py-1 mb-1">
                <Star className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {t('favorites')}
                </span>
              </div>
              {pinnedDatabases.map(({ dbName, tableCount }) => (
                <SidebarEntry
                  key={dbName}
                  icon={<Database className="w-3.5 h-3.5 shrink-0" />}
                  label={dbName}
                  active={activeDb === dbName && !activeTable}
                  accentBg={tc.accentBg}
                  lightBg={tc.lightBg}
                  textLight={tc.textLight}
                  onClick={() => openDatabase(dbName)}
                  trailing={
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {tableCount !== null && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tc.badgeBg} ${tc.badgeText}`}
                        >
                          {tableCount}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinDatabase(dbName);
                        }}
                        className="p-1 text-amber-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}

          {sidebarDatabases.map(({ dbName, tables, views, pinnedEntries, tableCount }) => {
            const dbLocalQuery = String(databaseQueries[dbName] || '')
              .trim()
              .toLowerCase();
            const filteredPinnedEntries = dbLocalQuery
              ? pinnedEntries.filter((entry) => entry.name.toLowerCase().includes(dbLocalQuery))
              : pinnedEntries;
            const filteredTables = dbLocalQuery
              ? tables.filter((entry) => entry.name.toLowerCase().includes(dbLocalQuery))
              : tables;
            const filteredViews = dbLocalQuery
              ? views.filter((entry) => entry.name.toLowerCase().includes(dbLocalQuery))
              : views;

            return (
              <div key={dbName} className="mb-1">
                <div
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#232323] transition-colors group cursor-pointer ${activeDb === dbName && !activeTable ? `${tc.lightBg} ${tc.textLight}` : ''}`}
                  onClick={() => openDatabase(dbName)}
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {expandedDbs[dbName] ? (
                      <ChevronDown
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDatabaseExpanded(dbName, false);
                        }}
                        className="w-3.5 h-3.5 shrink-0 text-zinc-500 hover:text-white"
                      />
                    ) : (
                      <ChevronRight
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDatabaseExpanded(dbName, true);
                        }}
                        className="w-3.5 h-3.5 shrink-0 text-zinc-500 hover:text-white"
                      />
                    )}
                    <Database className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    <span className="truncate text-sm text-zinc-300 font-medium flex-1 text-left">
                      {dbName}
                    </span>
                    {loadingTableDbs[dbName] && (
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {tableCount !== null && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tc.badgeBg} ${tc.badgeText}`}
                      >
                        {tableCount}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinDatabase(dbName);
                      }}
                      className={`p-1 transition-colors ${isDatabasePinned(dbName) ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-400'}`}
                      title={isDatabasePinned(dbName) ? t('removeFromFav') : t('addToFav')}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteDB(e, dbName)}
                      className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                      title={t('drop')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expandedDbs[dbName] && (
                  <div className="ml-6 mt-0.5 space-y-1 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-[#333]">
                    <div className="px-1 py-1">
                      <div className="relative">
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={databaseQueries[dbName] || ''}
                          onChange={(e) =>
                            setDatabaseQueries((prev) => ({ ...prev, [dbName]: e.target.value }))
                          }
                          placeholder={t('search')}
                          className={`w-full bg-[#232323] border border-[#333] rounded-md py-1 pl-7 pr-6 text-[11px] text-zinc-200 placeholder:text-zinc-500 ${tc.focusRing}`}
                        />
                        {!!databaseQueries[dbName] && (
                          <button
                            type="button"
                            onClick={() =>
                              setDatabaseQueries((prev) => ({ ...prev, [dbName]: '' }))
                            }
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredPinnedEntries.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 px-1 py-1">
                          <Star className="w-3 h-3 text-amber-500" />
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            {t('favorites')}
                          </span>
                        </div>
                        {filteredPinnedEntries.map((entry) => (
                          <SidebarEntry
                            key={`${dbName}.${entry.name}`}
                            icon={
                              entry.type === 'view' ? (
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Table2 className="w-3.5 h-3.5 shrink-0" />
                              )
                            }
                            label={entry.name}
                            active={activeDb === dbName && activeTable === entry.name}
                            accentBg={tc.accentBg}
                            lightBg={tc.lightBg}
                            textLight={tc.textLight}
                            onClick={() => selectDbAndTable(dbName, entry.name)}
                            trailing={
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinTable(dbName, entry.name);
                                }}
                                className="p-1 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            }
                          />
                        ))}
                      </div>
                    )}

                    <div>
                      <div
                        className="flex items-center gap-1 px-1 py-1 cursor-pointer group/folder"
                        onClick={() => toggleGroup(`${dbName}_tables`)}
                      >
                        {expandedGroups[`${dbName}_tables`] ? (
                          <ChevronDown className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-zinc-500" />
                        )}
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex-1">
                          {t('tables')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateTable(dbName);
                          }}
                          className="p-0.5 text-zinc-500 hover:text-zinc-200 opacity-0 group-hover/folder:opacity-100 transition-opacity"
                        >
                          <PlusCircle className="w-3 h-3" />
                        </button>
                      </div>
                      {expandedGroups[`${dbName}_tables`] &&
                        filteredTables.map((tableEntry) => (
                          <div
                            key={tableEntry.name}
                            onContextMenu={(e) => handleContextMenu(e, dbName, tableEntry.name)}
                          >
                            <SidebarEntry
                              icon={<Table2 className="w-3.5 h-3.5 shrink-0" />}
                              label={tableEntry.name}
                              active={activeDb === dbName && activeTable === tableEntry.name}
                              accentBg={tc.accentBg}
                              lightBg={tc.lightBg}
                              textLight={tc.textLight}
                              onClick={() => selectDbAndTable(dbName, tableEntry.name)}
                              trailing={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePinTable(dbName, tableEntry.name);
                                  }}
                                  className={`p-1 transition-opacity shrink-0 ${isTablePinned(dbName, tableEntry.name) ? 'text-amber-500 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                                  title={
                                    isTablePinned(dbName, tableEntry.name)
                                      ? t('removeFromFav')
                                      : t('addToFav')
                                  }
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              }
                            />
                          </div>
                        ))}
                    </div>

                    <div>
                      <div
                        className="flex items-center gap-1 px-1 py-1 cursor-pointer"
                        onClick={() => toggleGroup(`${dbName}_views`)}
                      >
                        {expandedGroups[`${dbName}_views`] ? (
                          <ChevronDown className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-zinc-500" />
                        )}
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {t('views')}
                        </span>
                      </div>
                      {expandedGroups[`${dbName}_views`] &&
                        filteredViews.map((viewEntry) => (
                          <SidebarEntry
                            key={viewEntry.name}
                            icon={<Eye className="w-3.5 h-3.5 shrink-0" />}
                            label={viewEntry.name}
                            active={activeDb === dbName && activeTable === viewEntry.name}
                            accentBg={tc.accentBg}
                            lightBg={tc.lightBg}
                            textLight={tc.textLight}
                            onClick={() => selectDbAndTable(dbName, viewEntry.name)}
                            trailing={
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinTable(dbName, viewEntry.name);
                                }}
                                className={`p-1 transition-opacity shrink-0 ${isTablePinned(dbName, viewEntry.name) ? 'text-amber-500 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                                title={
                                  isTablePinned(dbName, viewEntry.name)
                                    ? t('removeFromFav')
                                    : t('addToFav')
                                }
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            }
                          />
                        ))}
                    </div>

                    {dbLocalQuery &&
                      filteredPinnedEntries.length === 0 &&
                      filteredTables.length === 0 &&
                      filteredViews.length === 0 && (
                        <div className="px-2 py-3 text-[11px] text-zinc-500 text-center">
                          {t('noFilterResults')}
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}

          {sidebarDatabases.length === 0 && pinnedDatabases.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-zinc-500">
              {hasSidebarFilters ? t('noFilterResults') : t('noRecords')}
            </div>
          )}
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="w-1.5 hover:bg-[#333] cursor-col-resize h-full absolute right-0 z-50 transition-colors"
          onMouseDown={onResizeStart}
        />
      )}
    </div>
  );
}

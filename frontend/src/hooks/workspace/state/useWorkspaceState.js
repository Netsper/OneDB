import { useRef, useState } from 'react';
import { normalizePinnedItems } from '../../../utils/pins.js';

const DEFAULT_WORKSPACE_SETTINGS = Object.freeze({
  showCellTooltipOnHover: true,
  sqlEditor: {
    syntaxHighlight: true,
    autocomplete: true,
    wordWrap: true,
    lineNumbers: true,
    fontSize: 13,
  },
  jsonViewer: {
    defaultMode: 'tree',
  },
});

const DEFAULT_CONNECTION_FORM = Object.freeze({
  name: '',
  host: 'localhost',
  user: 'root',
  pass: '',
  port: '3306',
  driver: 'mysql',
});

function sanitizeSavedConnectionProfiles(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      host: String(item.host || ''),
      user: String(item.user || ''),
      pass: '',
      port: String(item.port || ''),
      driver: item.driver === 'pgsql' ? 'pgsql' : 'mysql',
    }))
    .filter((item) => item.name !== '' || item.host !== '' || item.user !== '');
}

function parseBooleanSetting(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function parseEnumSetting(value, allowedValues, fallback) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : fallback;
}

function parseNumberSetting(value, fallback, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function loadWorkspaceSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('dbm_settings') || 'null');
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_WORKSPACE_SETTINGS;
    }

    return {
      showCellTooltipOnHover: parseBooleanSetting(
        parsed.showCellTooltipOnHover,
        DEFAULT_WORKSPACE_SETTINGS.showCellTooltipOnHover,
      ),
      sqlEditor: {
        syntaxHighlight: parseBooleanSetting(
          parsed.sqlEditor?.syntaxHighlight,
          DEFAULT_WORKSPACE_SETTINGS.sqlEditor.syntaxHighlight,
        ),
        autocomplete: parseBooleanSetting(
          parsed.sqlEditor?.autocomplete,
          DEFAULT_WORKSPACE_SETTINGS.sqlEditor.autocomplete,
        ),
        wordWrap: parseBooleanSetting(
          parsed.sqlEditor?.wordWrap,
          DEFAULT_WORKSPACE_SETTINGS.sqlEditor.wordWrap,
        ),
        lineNumbers: parseBooleanSetting(
          parsed.sqlEditor?.lineNumbers,
          DEFAULT_WORKSPACE_SETTINGS.sqlEditor.lineNumbers,
        ),
        fontSize: parseNumberSetting(
          parsed.sqlEditor?.fontSize,
          DEFAULT_WORKSPACE_SETTINGS.sqlEditor.fontSize,
          11,
          20,
        ),
      },
      jsonViewer: {
        defaultMode: parseEnumSetting(
          parsed.jsonViewer?.defaultMode,
          ['tree', 'raw'],
          DEFAULT_WORKSPACE_SETTINGS.jsonViewer.defaultMode,
        ),
      },
    };
  } catch {
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}

function loadPersistedConnectionForm() {
  try {
    const parsed = JSON.parse(localStorage.getItem('dbm_last_connection') || 'null');
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CONNECTION_FORM };
    }

    return {
      name: String(parsed.name || '').trim(),
      host: String(parsed.host || DEFAULT_CONNECTION_FORM.host),
      user: String(parsed.user || DEFAULT_CONNECTION_FORM.user),
      pass: String(parsed.pass || ''),
      port: String(parsed.port || DEFAULT_CONNECTION_FORM.port),
      driver: parsed.driver === 'pgsql' ? 'pgsql' : 'mysql',
    };
  } catch {
    return { ...DEFAULT_CONNECTION_FORM };
  }
}

function sanitizeOpenTableTabs(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const seen = new Set();
  const tabs = [];

  rawValue.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const dbName = String(item.dbName || '').trim();
    const tableName = String(item.tableName || '').trim();
    if (!dbName || !tableName) return;
    const id = `${dbName}::${tableName}`;
    if (seen.has(id)) return;
    seen.add(id);
    tabs.push({
      id,
      dbName,
      tableName,
      pinned: Boolean(item.pinned),
    });
  });

  const pinnedTabs = tabs.filter((tab) => tab.pinned);
  const normalTabs = tabs.filter((tab) => !tab.pinned);
  return [...pinnedTabs, ...normalTabs];
}

function sanitizePinnedColumnsByTable(rawValue) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  return Object.entries(rawValue).reduce((acc, [tableKey, value]) => {
    if (typeof tableKey !== 'string' || tableKey.trim() === '') {
      return acc;
    }
    if (!Array.isArray(value)) {
      return acc;
    }

    const deduped = [];
    const seen = new Set();
    value.forEach((columnName) => {
      const normalized = String(columnName || '').trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      deduped.push(normalized);
    });

    if (deduped.length > 0) {
      acc[tableKey] = deduped;
    }
    return acc;
  }, {});
}

export default function useWorkspaceState() {
  const [lang, setLang] = useState(() => localStorage.getItem('dbm_lang') || 'en');

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ping, setPing] = useState(12);
  const [connForm, setConnForm] = useState(loadPersistedConnectionForm);
  const [savedConnections, setSavedConnections] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('dbm_connections')) || [];
      return sanitizeSavedConnectionProfiles(parsed);
    } catch {
      return [];
    }
  });
  const csrfTokenRef = useRef('');

  const [databases, setDatabases] = useState({});
  const [activeDb, setActiveDb] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [openTableTabs, setOpenTableTabs] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('dbm_open_table_tabs') || '[]');
      return sanitizeOpenTableTabs(parsed);
    } catch {
      return [];
    }
  });
  const [activeTableTabId, setActiveTableTabId] = useState(() => {
    const value = String(localStorage.getItem('dbm_active_table_tab') || '').trim();
    return value || null;
  });
  const [expandedDbs, setExpandedDbs] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeTab, setActiveTab] = useState('browse');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedItems, setPinnedItems] = useState(() => {
    try {
      return normalizePinnedItems(JSON.parse(localStorage.getItem('dbm_pinned')) || []);
    } catch {
      return [];
    }
  });

  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlHistory, setSqlHistory] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('dbm_sql_history')) || ['SELECT * FROM users LIMIT 10;']
      );
    } catch {
      return [];
    }
  });
  const [sqlSnippets, setSqlSnippets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dbm_sql_snippets')) || [];
    } catch {
      return [];
    }
  });
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlResultTab, setSqlResultTab] = useState('data');
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [sqlEditorHeight, setSqlEditorHeight] = useState(50);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('dbm_theme') || 'emerald');
  const [settings, setSettings] = useState(loadWorkspaceSettings);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(
    () => Number(localStorage.getItem('dbm_sidebar_w')) || 256,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
  const [visibilityQuery, setVisibilityQuery] = useState('');
  const [databaseVisibility, setDatabaseVisibility] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dbm_database_visibility')) || {};
    } catch {
      return {};
    }
  });
  const [loadedTableDbs, setLoadedTableDbs] = useState({});
  const [loadingTableDbs, setLoadingTableDbs] = useState({});
  const searchInputRef = useRef(null);
  const visibilityMenuRef = useRef(null);
  const visibilityButtonRef = useRef(null);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState({});
  const [inputVal, setInputVal] = useState('');
  const [dbCharset, setDbCharset] = useState('utf8mb4');
  const [dbCollation, setDbCollation] = useState('utf8mb4_general_ci');
  const [newColForm, setNewColForm] = useState({
    name: '',
    type: 'varchar(255)',
    nullable: 'Yes',
    default: '',
  });
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    dbName: null,
    tableName: null,
  });
  const [cellContextMenu, setCellContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    rowIndex: null,
    colName: null,
    value: null,
    canShowJson: false,
  });
  const importFileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDragActive, setIsImportDragActive] = useState(false);
  const [importLimits, setImportLimits] = useState(null);
  const [isImportLimitsLoading, setIsImportLimitsLoading] = useState(false);
  const [importLimitsError, setImportLimitsError] = useState('');
  const [isSaveProfileModalOpen, setIsSaveProfileModalOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');

  const [, setSearchTerm] = useState('');
  const [filterRules, setFilterRules] = useState([]);
  const [filterRuleDrafts, setFilterRuleDrafts] = useState([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [isColsPanelOpen, setIsColsPanelOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [serverColumnFilters, setServerColumnFilters] = useState({});
  const [columnMenu, setColumnMenu] = useState({ columnName: null, draft: null });
  const [pinnedColumnsByTable, setPinnedColumnsByTable] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('dbm_pinned_columns') || '{}');
      return sanitizePinnedColumnsByTable(parsed);
    } catch {
      return {};
    }
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [editingCell, setEditingCell] = useState(null);
  const [historyTab, setHistoryTab] = useState('history');
  const [rowDetailsTab, setRowDetailsTab] = useState('details');
  const [schemaViewMode, setSchemaViewMode] = useState('table');

  const [autoRefreshInt, setAutoRefreshInt] = useState(0);
  const [isAutoRefreshMenuOpen, setIsAutoRefreshMenuOpen] = useState(false);
  const tableFilterButtonRef = useRef(null);
  const tableColumnsButtonRef = useRef(null);
  const autoRefreshButtonRef = useRef(null);

  const [cpuUsage, setCpuUsage] = useState(0);
  const [qps, setQps] = useState(0);
  const [dbSizeLabel, setDbSizeLabel] = useState('--');
  const [loginError, setLoginError] = useState('');

  const sqlContainerRef = useRef(null);

  return {
    lang,
    setLang,
    isConnected,
    setIsConnected,
    isConnecting,
    setIsConnecting,
    ping,
    setPing,
    connForm,
    setConnForm,
    savedConnections,
    setSavedConnections,
    csrfTokenRef,
    databases,
    setDatabases,
    activeDb,
    setActiveDb,
    activeTable,
    setActiveTable,
    openTableTabs,
    setOpenTableTabs,
    activeTableTabId,
    setActiveTableTabId,
    expandedDbs,
    setExpandedDbs,
    expandedGroups,
    setExpandedGroups,
    activeTab,
    setActiveTab,
    isRefreshing,
    setIsRefreshing,
    pinnedItems,
    setPinnedItems,
    sqlQuery,
    setSqlQuery,
    sqlHistory,
    setSqlHistory,
    sqlSnippets,
    setSqlSnippets,
    sqlResult,
    setSqlResult,
    sqlResultTab,
    setSqlResultTab,
    isQueryRunning,
    setIsQueryRunning,
    sqlEditorHeight,
    setSqlEditorHeight,
    aiPrompt,
    setAiPrompt,
    isAiLoading,
    setIsAiLoading,
    theme,
    setTheme,
    settings,
    setSettings,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    isSettingsOpen,
    setIsSettingsOpen,
    toasts,
    setToasts,
    isCommandOpen,
    setIsCommandOpen,
    commandQuery,
    setCommandQuery,
    sidebarQuery,
    setSidebarQuery,
    isVisibilityMenuOpen,
    setIsVisibilityMenuOpen,
    visibilityQuery,
    setVisibilityQuery,
    databaseVisibility,
    setDatabaseVisibility,
    loadedTableDbs,
    setLoadedTableDbs,
    loadingTableDbs,
    setLoadingTableDbs,
    searchInputRef,
    visibilityMenuRef,
    visibilityButtonRef,
    modalConfig,
    setModalConfig,
    formData,
    setFormData,
    inputVal,
    setInputVal,
    dbCharset,
    setDbCharset,
    dbCollation,
    setDbCollation,
    newColForm,
    setNewColForm,
    contextMenu,
    setContextMenu,
    cellContextMenu,
    setCellContextMenu,
    importFileInputRef,
    isImporting,
    setIsImporting,
    isImportDragActive,
    setIsImportDragActive,
    importLimits,
    setImportLimits,
    isImportLimitsLoading,
    setIsImportLimitsLoading,
    importLimitsError,
    setImportLimitsError,
    isSaveProfileModalOpen,
    setIsSaveProfileModalOpen,
    profileNameDraft,
    setProfileNameDraft,
    setSearchTerm,
    filterRules,
    setFilterRules,
    filterRuleDrafts,
    setFilterRuleDrafts,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    hiddenColumns,
    setHiddenColumns,
    isColsPanelOpen,
    setIsColsPanelOpen,
    sortConfig,
    setSortConfig,
    serverColumnFilters,
    setServerColumnFilters,
    columnMenu,
    setColumnMenu,
    pinnedColumnsByTable,
    setPinnedColumnsByTable,
    selectedRows,
    setSelectedRows,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    editingCell,
    setEditingCell,
    historyTab,
    setHistoryTab,
    rowDetailsTab,
    setRowDetailsTab,
    schemaViewMode,
    setSchemaViewMode,
    autoRefreshInt,
    setAutoRefreshInt,
    isAutoRefreshMenuOpen,
    setIsAutoRefreshMenuOpen,
    tableFilterButtonRef,
    tableColumnsButtonRef,
    autoRefreshButtonRef,
    cpuUsage,
    setCpuUsage,
    qps,
    setQps,
    dbSizeLabel,
    setDbSizeLabel,
    loginError,
    setLoginError,
    sqlContainerRef,
  };
}

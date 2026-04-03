import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Database,
  FileDown,
  History,
  Loader2,
  ListChecks,
  ListTree,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import SelectField from '../shared/SelectField.jsx';

export default function DatabaseActionModals({
  modalConfig,
  setModalConfig,
  t,
  tc,
  inputVal,
  setInputVal,
  activeDb,
  currentDriver,
  executeSql,
  dbCharset,
  setDbCharset,
  dbCollation,
  setDbCollation,
  baseSelectClass,
  handleCreateDB,
  handleCreateTable,
  newColForm,
  setNewColForm,
  handleAddColumn,
  historyTab,
  setHistoryTab,
  sqlHistory,
  sqlSnippets,
  setSqlSnippets,
  setSqlQuery,
  isImportModalOpen,
  closeImportModal,
  importFileInputRef,
  importAccept,
  handleImportFileInputChange,
  openImportFilePicker,
  handleImportDragOver,
  handleImportDragLeave,
  handleImportDrop,
  isImporting,
  isImportDragActive,
  importDropLabel,
  importFormatHint,
  isImportLimitsLoading,
  importLimitsError,
  importLimitsRows,
  handleExportTable,
  handleExportDatabaseSql,
}) {
  const isCreateDbModalOpen = modalConfig.isOpen && modalConfig.type === 'create_db';
  const isMysql = currentDriver === 'mysql';
  const [createDbTab, setCreateDbTab] = useState('create');
  const [isCharsetLoading, setIsCharsetLoading] = useState(false);
  const [isCollationLoading, setIsCollationLoading] = useState(false);
  const [charsetOptions, setCharsetOptions] = useState([
    { value: 'utf8mb4', label: 'utf8mb4' },
    { value: 'utf8', label: 'utf8' },
  ]);
  const [collationOptions, setCollationOptions] = useState([
    { value: 'utf8mb4_general_ci', label: 'utf8mb4_general_ci' },
    { value: 'utf8mb4_unicode_ci', label: 'utf8mb4_unicode_ci' },
  ]);
  const [adminPanels, setAdminPanels] = useState({
    privileges: { loading: false, loaded: false, error: '', rows: [] },
    process: { loading: false, loaded: false, error: '', rows: [] },
    variables: { loading: false, loaded: false, error: '', rows: [] },
    status: { loading: false, loaded: false, error: '', rows: [] },
  });

  const createDbTabs = useMemo(
    () => [
      { key: 'create', label: t('createDatabaseTab') || 'Create database', icon: Database },
      { key: 'privileges', label: t('privilegesTab') || 'Privileges', icon: ShieldCheck },
      { key: 'process', label: t('processListTab') || 'Process list', icon: ListChecks },
      { key: 'variables', label: t('variablesTab') || 'Variables', icon: SlidersHorizontal },
      { key: 'status', label: t('statusTab') || 'Status', icon: ListTree },
    ],
    [t],
  );

  const fallbackCharsetList = useMemo(
    () => [
      'armscii8',
      'ascii',
      'big5',
      'binary',
      'cp1250',
      'cp1251',
      'cp1256',
      'cp1257',
      'cp850',
      'cp852',
      'cp866',
      'cp932',
      'dec8',
      'eucjpms',
      'euckr',
      'gb18030',
      'gb2312',
      'gbk',
      'geostd8',
      'greek',
      'hebrew',
      'hp8',
      'keybcs2',
      'koi8r',
      'koi8u',
      'latin1',
      'latin2',
      'latin5',
      'latin7',
      'macce',
      'macroman',
      'sjis',
      'swe7',
      'tis620',
      'ucs2',
      'ujis',
      'utf16',
      'utf16le',
      'utf32',
      'utf8',
      'utf8mb3',
      'utf8mb4',
    ],
    [],
  );

  const fallbackCollationByCharset = useMemo(
    () => ({
      utf8mb4: ['utf8mb4_0900_ai_ci', 'utf8mb4_unicode_ci', 'utf8mb4_general_ci'],
      utf8: ['utf8_unicode_ci', 'utf8_general_ci'],
      utf8mb3: ['utf8mb3_unicode_ci', 'utf8mb3_general_ci'],
      latin1: ['latin1_swedish_ci', 'latin1_general_ci'],
    }),
    [],
  );

  const getFirstPresentValue = (row, keys) => {
    if (!row || typeof row !== 'object') return '';
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const normalizeResultRows = (result) => {
    if (!result) return [];
    if (Array.isArray(result.rows)) return result.rows;
    if (Array.isArray(result.data)) return result.data;
    return [];
  };

  const resetAdminPanels = () => {
    setAdminPanels({
      privileges: { loading: false, loaded: false, error: '', rows: [] },
      process: { loading: false, loaded: false, error: '', rows: [] },
      variables: { loading: false, loaded: false, error: '', rows: [] },
      status: { loading: false, loaded: false, error: '', rows: [] },
    });
  };

  const loadAvailableCharsets = async () => {
    if (!isMysql) return;
    setIsCharsetLoading(true);
    try {
      const result = await executeSql('SHOW CHARACTER SET;', activeDb || '');
      const rows = normalizeResultRows(result);
      const options = rows
        .map((row) => ({
          value: getFirstPresentValue(row, ['Charset', 'charset']),
          label: getFirstPresentValue(row, ['Charset', 'charset']),
        }))
        .filter((entry) => entry.value !== '');
      const uniqueOptions =
        options.length > 0
          ? Array.from(new Map(options.map((entry) => [entry.value, entry])).values())
          : fallbackCharsetList.map((name) => ({ value: name, label: name }));
      setCharsetOptions(uniqueOptions);
      if (!uniqueOptions.some((entry) => entry.value === dbCharset)) {
        setDbCharset(uniqueOptions[0]?.value || 'utf8mb4');
      }
    } catch {
      const options = fallbackCharsetList.map((name) => ({ value: name, label: name }));
      setCharsetOptions(options);
      if (!options.some((entry) => entry.value === dbCharset)) {
        setDbCharset(options[0]?.value || 'utf8mb4');
      }
    } finally {
      setIsCharsetLoading(false);
    }
  };

  const loadCollationsForCharset = async (charset) => {
    if (!isMysql || !charset) return;
    setIsCollationLoading(true);
    try {
      const safeCharset = String(charset).replace(/'/g, "''");
      const result = await executeSql(`SHOW COLLATION WHERE Charset = '${safeCharset}';`, activeDb || '');
      const rows = normalizeResultRows(result);
      const options = rows
        .map((row) => {
          const name = getFirstPresentValue(row, ['Collation', 'collation']);
          if (!name) return null;
          const isDefault = String(row.Default ?? row.default ?? '').toLowerCase();
          return {
            value: name,
            label: isDefault === 'yes' ? `${name} (default)` : name,
          };
        })
        .filter(Boolean);
      const uniqueOptions =
        options.length > 0
          ? Array.from(new Map(options.map((entry) => [entry.value, entry])).values())
          : (fallbackCollationByCharset[charset] || [`${charset}_general_ci`]).map((name) => ({
              value: name,
              label: name,
            }));
      setCollationOptions(uniqueOptions);
      if (!uniqueOptions.some((entry) => entry.value === dbCollation)) {
        setDbCollation(uniqueOptions[0]?.value || '');
      }
    } catch {
      const fallbackOptions = (fallbackCollationByCharset[charset] || [`${charset}_general_ci`]).map(
        (name) => ({ value: name, label: name }),
      );
      setCollationOptions(fallbackOptions);
      if (!fallbackOptions.some((entry) => entry.value === dbCollation)) {
        setDbCollation(fallbackOptions[0]?.value || '');
      }
    } finally {
      setIsCollationLoading(false);
    }
  };

  const loadAdminTabData = async (tabKey) => {
    if (!isMysql) return;
    const queryMap = {
      privileges: 'SHOW GRANTS FOR CURRENT_USER;',
      process: 'SHOW FULL PROCESSLIST;',
      variables: 'SHOW VARIABLES;',
      status: 'SHOW STATUS;',
    };
    const sql = queryMap[tabKey];
    if (!sql) return;

    setAdminPanels((prev) => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], loading: true, error: '' },
    }));

    try {
      const result = await executeSql(sql, activeDb || '');
      const rows = normalizeResultRows(result);
      setAdminPanels((prev) => ({
        ...prev,
        [tabKey]: { loading: false, loaded: true, error: '', rows },
      }));
    } catch (error) {
      setAdminPanels((prev) => ({
        ...prev,
        [tabKey]: {
          ...prev[tabKey],
          loading: false,
          loaded: true,
          error: error?.message || t('loadFailed') || 'Failed to load data.',
          rows: [],
        },
      }));
    }
  };

  const activeAdminPanel =
    createDbTab !== 'create' ? adminPanels[createDbTab] : { loading: false, error: '', rows: [] };
  const activeAdminRows = Array.isArray(activeAdminPanel.rows) ? activeAdminPanel.rows : [];

  useEffect(() => {
    if (!isCreateDbModalOpen) return;
    setCreateDbTab('create');
    resetAdminPanels();
    if (isMysql) {
      loadAvailableCharsets();
    }
  }, [isCreateDbModalOpen, isMysql]);

  useEffect(() => {
    if (!isCreateDbModalOpen || !isMysql) return;
    loadCollationsForCharset(dbCharset);
  }, [isCreateDbModalOpen, isMysql, dbCharset]);

  useEffect(() => {
    if (!isCreateDbModalOpen || !isMysql || createDbTab === 'create') return;
    const currentPanel = adminPanels[createDbTab];
    if (!currentPanel || currentPanel.loading || currentPanel.loaded) return;
    loadAdminTabData(createDbTab);
  }, [isCreateDbModalOpen, isMysql, createDbTab, adminPanels]);

  const adminColumns = useMemo(
    () => (activeAdminRows[0] && typeof activeAdminRows[0] === 'object' ? Object.keys(activeAdminRows[0]) : []),
    [activeAdminRows],
  );

  return (
    <>
      {isCreateDbModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-5xl flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[88vh]">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">{t('newDatabase')}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {t('newDatabasePanelDesc') ||
                    'Create databases and inspect runtime metadata from a single panel.'}
                </p>
              </div>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-4 border-b border-[#2e2e32] bg-[#18181b] shrink-0">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3">
                {createDbTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = createDbTab === tab.key;
                  const isDisabled = !isMysql && tab.key !== 'create';
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setCreateDbTab(tab.key)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? `${tc.border} ${tc.bgSoft} ${tc.textLight}`
                          : 'border-[#333] text-zinc-400 hover:text-zinc-200 hover:border-[#4a4a4f]'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed hover:text-zinc-400 hover:border-[#333]' : ''}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 overflow-auto custom-scrollbar">
              {createDbTab === 'create' ? (
                <form onSubmit={handleCreateDB} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        {t('dbNamePlaceholder')}
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                      />
                    </div>
                    {isMysql ? (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                          {t('charset') || 'Charset'}
                        </label>
                        <SelectField
                          value={dbCharset}
                          onChange={(e) => setDbCharset(e.target.value)}
                          className={baseSelectClass}
                        >
                          {charsetOptions.map((charset) => (
                            <option key={charset.value} value={charset.value}>
                              {charset.label}
                            </option>
                          ))}
                        </SelectField>
                        {isCharsetLoading ? (
                          <p className="text-[11px] text-zinc-500 mt-2">
                            {t('loadingCharsets') || 'Loading charsets...'}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="md:col-span-1 bg-[#151518] border border-[#333] rounded-lg p-3">
                        <p className="text-xs text-zinc-400">
                          {t('charsetDriverNotice') ||
                            'Charset and collation options are available for MySQL connections.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {isMysql ? (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        {t('collation')}
                      </label>
                      <SelectField
                        value={dbCollation}
                        onChange={(e) => setDbCollation(e.target.value)}
                        className={baseSelectClass}
                      >
                        {collationOptions.map((collation) => (
                          <option key={collation.value} value={collation.value}>
                            {collation.label}
                          </option>
                        ))}
                      </SelectField>
                      {isCollationLoading ? (
                        <p className="text-[11px] text-zinc-500 mt-2">
                          {t('loadingCollations') || 'Loading collations...'}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="bg-[#151518] border border-[#333] rounded-lg p-3">
                    <p className="text-xs text-zinc-400">
                      {t('createDbHint') ||
                        'Choose a charset/collation pair compatible with your application before creating the database.'}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setModalConfig({ isOpen: false })}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                    >
                      {t('create')}
                    </button>
                  </div>
                </form>
              ) : !isMysql ? (
                <div className="bg-[#151518] border border-[#333] rounded-lg p-4">
                  <p className="text-sm text-zinc-400">
                    {t('mysqlOnlyAdminTabNotice') ||
                      'This section is currently available for MySQL-compatible drivers.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAdminPanel.loading ? (
                    <div className="bg-[#151518] border border-[#333] rounded-lg p-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('loading') || 'Loading...'}</span>
                    </div>
                  ) : activeAdminPanel.error ? (
                    <div className="bg-[#151518] border border-red-500/40 rounded-lg p-4 text-sm text-red-300">
                      {activeAdminPanel.error}
                    </div>
                  ) : activeAdminRows.length === 0 ? (
                    <div className="bg-[#151518] border border-[#333] rounded-lg p-4 text-sm text-zinc-400">
                      {t('noRecords')}
                    </div>
                  ) : (
                    <div className="bg-[#151518] border border-[#333] rounded-lg overflow-hidden">
                      <div className="overflow-auto custom-scrollbar max-h-[56vh]">
                        <table className="w-full min-w-[780px] text-xs">
                          <thead className="bg-[#18181b] sticky top-0 z-10">
                            <tr>
                              {adminColumns.map((column) => (
                                <th
                                  key={column}
                                  className="text-left px-3 py-2 text-zinc-300 border-b border-[#2e2e32] whitespace-nowrap"
                                >
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeAdminRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b border-[#242428]">
                                {adminColumns.map((column) => {
                                  const value = row?.[column];
                                  const rendered =
                                    value == null
                                      ? 'NULL'
                                      : typeof value === 'object'
                                        ? JSON.stringify(value, null, 2)
                                        : String(value);
                                  return (
                                    <td
                                      key={`${rowIndex}-${column}`}
                                      className="px-3 py-2 align-top text-zinc-200"
                                    >
                                      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px]">
                                        {rendered}
                                      </pre>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'create_table' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
              <h3 className="text-base font-medium text-zinc-100">{t('addNewTable')}</h3>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="p-6">
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                {t('tableNamePlaceholder')}
              </label>
              <input
                type="text"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
              />
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'add_column' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
              <h3 className="text-base font-medium text-zinc-100">{t('addColumn')}</h3>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddColumn} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('colName')}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newColForm.name}
                  onChange={(e) => setNewColForm({ ...newColForm, name: e.target.value })}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('dataType')}
                  </label>
                  <SelectField
                    value={newColForm.type}
                    onChange={(e) => setNewColForm({ ...newColForm, type: e.target.value })}
                    className={baseSelectClass}
                  >
                    <option value="varchar(255)">VARCHAR</option>
                    <option value="int(11)">INT</option>
                    <option value="text">TEXT</option>
                    <option value="datetime">DATETIME</option>
                    <option value="tinyint(1)">BOOLEAN</option>
                  </SelectField>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('colNullable')}
                  </label>
                  <SelectField
                    value={newColForm.nullable}
                    onChange={(e) => setNewColForm({ ...newColForm, nullable: e.target.value })}
                    className={baseSelectClass}
                  >
                    <option value="Yes">{t('yes')}</option>
                    <option value="No">{t('no')}</option>
                  </SelectField>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('defaultValue')}
                </label>
                <input
                  type="text"
                  value={newColForm.default}
                  onChange={(e) => setNewColForm({ ...newColForm, default: e.target.value })}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'sql_history' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[80vh]">
            <div className="px-6 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => setHistoryTab('history')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${historyTab === 'history' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  <History className="w-4 h-4" /> {t('historySaved').split('&')[0].trim()}
                </button>
                <button
                  onClick={() => setHistoryTab('snippets')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${historyTab === 'snippets' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  <Bookmark className="w-4 h-4" />{' '}
                  {t('historySaved').split('&')[1]?.trim() || t('saveSnippet')}
                </button>
              </div>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-2 bg-[#18181b] rounded-b-xl">
              {historyTab === 'history' ? (
                <>
                  {sqlHistory.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">{t('noRecords')}</p>
                  ) : null}
                  {sqlHistory.map((hq, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1c1c1c] border border-[#333] rounded p-3 group hover:border-[#444] transition-colors"
                    >
                      <code className="text-xs text-zinc-300 font-mono block mb-2 whitespace-pre-wrap">
                        {hq}
                      </code>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => {
                            setSqlQuery(hq);
                            setModalConfig({ isOpen: false });
                          }}
                          className={`text-[10px] uppercase font-bold ${tc.text} hover:${tc.textLight}`}
                        >
                          {t('add')}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {sqlSnippets.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">{t('noRecords')}</p>
                  ) : null}
                  {sqlSnippets.map((snip) => (
                    <div
                      key={snip.id}
                      className="bg-[#1c1c1c] border border-[#333] rounded p-3 group hover:border-[#444] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-zinc-300">{snip.title}</span>
                        <button
                          onClick={() =>
                            setSqlSnippets((prev) => prev.filter((s) => s.id !== snip.id))
                          }
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <code className="text-xs text-zinc-400 font-mono block mb-3 bg-[#18181b] p-2 rounded border border-[#2e2e32] whitespace-pre-wrap">
                        {snip.query}
                      </code>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setSqlQuery(snip.query);
                            setModalConfig({ isOpen: false });
                          }}
                          className={`text-[10px] uppercase font-bold ${tc.text} hover:${tc.textLight}`}
                        >
                          {t('add')}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen &&
        (modalConfig.type === 'import' ||
          modalConfig.type === 'export' ||
          modalConfig.type === 'import_db' ||
          modalConfig.type === 'export_db') && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
                <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                  {modalConfig.type.includes('import') ? (
                    <UploadCloud className="w-4 h-4" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  {modalConfig.type.includes('import') ? t('import') : t('export')}
                </h3>
                <button
                  onClick={() =>
                    isImportModalOpen ? closeImportModal() : setModalConfig({ isOpen: false })
                  }
                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                {modalConfig.type.includes('import') ? (
                  <>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept={importAccept}
                      className="hidden"
                      onChange={handleImportFileInputChange}
                    />
                    <div
                      onClick={openImportFilePicker}
                      onDragOver={handleImportDragOver}
                      onDragLeave={handleImportDragLeave}
                      onDrop={handleImportDrop}
                      className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors bg-[#18181b] ${isImporting ? 'cursor-wait border-[#4a4a4f]' : 'cursor-pointer'} ${isImportDragActive ? `${tc.border}` : 'border-[#333] hover:border-[#555]'}`}
                    >
                      {isImporting ? (
                        <Loader2 className="w-8 h-8 text-zinc-400 mb-3 animate-spin" />
                      ) : (
                        <UploadCloud className="w-8 h-8 text-zinc-500 mb-3" />
                      )}
                      <p className="text-sm text-zinc-300 font-medium">{importDropLabel}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {isImporting ? t('importing') : t('clickToSelect')}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-3">{importFormatHint}</p>
                    </div>
                    <div className="mt-3 border border-[#2e2e32] bg-[#18181b] rounded-lg p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {t('importServerLimits')}
                      </p>
                      {isImportLimitsLoading ? (
                        <p className="text-xs text-zinc-500 mt-2">{t('importLimitsLoading')}</p>
                      ) : importLimitsError ? (
                        <p className="text-xs text-red-400 mt-2">{importLimitsError}</p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {importLimitsRows.map((row) => (
                            <div key={row.label} className="contents">
                              <p className="text-[11px] text-zinc-500">{row.label}</p>
                              <p className="text-[11px] text-zinc-300 text-right font-mono">
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">{t('exportFormat')}</p>
                    <div className="flex gap-2">
                      {modalConfig.type === 'export_db' ? (
                        <button
                          onClick={handleExportDatabaseSql}
                          className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                        >
                          {t('downloadSql')}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleExportTable('csv')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadCsv')}
                          </button>
                          <button
                            onClick={() => handleExportTable('json')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadJson')}
                          </button>
                          <button
                            onClick={() => handleExportTable('sql')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadSql')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}

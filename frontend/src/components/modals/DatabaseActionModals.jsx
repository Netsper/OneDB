import { Bookmark, FileDown, History, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import SelectField from '../shared/SelectField.jsx';

export default function DatabaseActionModals({
  modalConfig,
  setModalConfig,
  t,
  tc,
  inputVal,
  setInputVal,
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
  activeDb,
  databases,
  exportToSQL,
  handleExportTable,
}) {
  return (
    <>
      {modalConfig.isOpen &&
        (modalConfig.type === 'create_db' || modalConfig.type === 'create_table') && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
                <h3 className="text-base font-medium text-zinc-100">
                  {modalConfig.type === 'create_db' ? t('newDatabase') : t('addNewTable')}
                </h3>
                <button
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={modalConfig.type === 'create_db' ? handleCreateDB : handleCreateTable}
                className="p-6"
              >
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  {modalConfig.type === 'create_db'
                    ? t('dbNamePlaceholder')
                    : t('tableNamePlaceholder')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />

                {modalConfig.type === 'create_db' && (
                  <>
                    <label className="block text-xs font-medium text-zinc-400 mt-4 mb-2">
                      {t('collation')}
                    </label>
                    <SelectField
                      value={dbCollation}
                      onChange={(e) => setDbCollation(e.target.value)}
                      className={baseSelectClass}
                    >
                      <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                      <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
                      <option value="utf8_general_ci">utf8_general_ci</option>
                    </SelectField>
                  </>
                )}
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
                    <option value="Evet">{t('yes')}</option>
                    <option value="Hayır">{t('no')}</option>
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
                          onClick={() => {
                            const dbData = databases[activeDb];
                            let allData = [];
                            Object.keys(dbData).forEach((tableName) =>
                              allData.push(...dbData[tableName].data),
                            );
                            exportToSQL(allData, activeDb, 'full_dump');
                          }}
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

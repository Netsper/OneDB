import React from 'react';
import {
  BarChart2,
  Cpu,
  Database,
  Eye,
  FileDown,
  HardDrive,
  Loader2,
  Plus,
  Table2,
  UploadCloud,
} from 'lucide-react';

export default function DatabaseOverview({
  t,
  tc,
  activeDb,
  cpuUsage,
  dbSizeLabel,
  qps,
  loadingTableDbs,
  databases,
  selectDbAndTable,
  openImportDb,
  openExportDb,
  openCreateTable,
}) {
  return (
    <div className="flex-1 p-8 bg-[#18181b] overflow-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-medium text-zinc-100 flex items-center gap-2">
            <Database className={`w-6 h-6 ${tc.text}`} /> {activeDb}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{t('dbOverview')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openImportDb}
            className="bg-[#232323] border border-[#333] hover:bg-[#2e2e32] text-zinc-200 px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <UploadCloud className="w-4 h-4" /> {t('importSqlBtn')}
          </button>
          <button
            onClick={openExportDb}
            className="bg-[#232323] border border-[#333] hover:bg-[#2e2e32] text-zinc-200 px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <FileDown className="w-4 h-4" /> {t('exportSqlBtn')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1c1c1c] border border-[#2e2e32] p-4 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
            <Cpu className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">
              {t('cpuUsage')}
            </p>
            <p className="text-2xl font-medium text-zinc-200">{cpuUsage}%</p>
          </div>
        </div>
        <div className="bg-[#1c1c1c] border border-[#2e2e32] p-4 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
            <HardDrive className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">
              {t('diskSize')}
            </p>
            <p className="text-2xl font-medium text-zinc-200">{dbSizeLabel}</p>
          </div>
        </div>
        <div className="bg-[#1c1c1c] border border-[#2e2e32] p-4 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <BarChart2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">
              {t('qps')}
            </p>
            <p className="text-2xl font-medium text-zinc-200">{qps}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingTableDbs[activeDb] && Object.keys(databases[activeDb] || {}).length === 0 && (
          <div className="col-span-full bg-[#1c1c1c] border border-[#2e2e32] rounded-lg p-6 text-sm text-zinc-500 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('loadingTables')}
          </div>
        )}
        {Object.keys(databases[activeDb] || {}).map((tableName) => {
          const tableEntry = databases[activeDb][tableName];
          const hasRowCount = Number.isFinite(Number(tableEntry?.rowCount));
          const rowCountLabel = hasRowCount ? Number(tableEntry.rowCount) : '...';
          return (
            <div
              key={tableName}
              onClick={() => selectDbAndTable(activeDb, tableName)}
              className="bg-[#1c1c1c] border border-[#2e2e32] p-4 rounded-lg hover:border-[#444] cursor-pointer transition-colors group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-zinc-200 font-medium flex items-center gap-2">
                  {tableEntry.type === 'view' ? (
                    <Eye className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  ) : (
                    <Table2 className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  )}
                  {tableName}
                </h3>
                <span className="text-xs text-zinc-400 bg-[#232323] border border-[#333] px-2 py-0.5 rounded-full">
                  {rowCountLabel} {t('records')}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {tableEntry.columnCount ?? tableEntry.columns.length} {t('colsFound')}{' '}
                {tableEntry.type === 'view' && `(${t('views')})`}
              </p>
            </div>
          );
        })}
        <div
          onClick={openCreateTable}
          className={`border-2 border-dashed border-[#333] hover:${tc.border} p-4 rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center text-zinc-500 hover:${tc.text} min-h-[100px]`}
        >
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-sm font-medium">{t('addNewTable')}</span>
        </div>
      </div>
    </div>
  );
}

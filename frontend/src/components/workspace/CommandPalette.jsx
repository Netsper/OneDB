import React from 'react';
import { ArrowRight, Eye, Search, Table2 } from 'lucide-react';

export default function CommandPalette({
  t,
  tc,
  isOpen,
  searchInputRef,
  commandQuery,
  setCommandQuery,
  filteredCommands,
  selectDbAndTable,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center pt-[15vh]">
      <div
        className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[#2e2e32] bg-[#18181b]">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('searchDbTable')}
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-zinc-200 text-lg placeholder:text-zinc-600"
          />
          <kbd className="font-mono text-[10px] bg-[#232323] px-1.5 py-0.5 rounded text-zinc-500 border border-[#333]">
            ESC
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              {commandQuery ? t('noFilterResults') : t('noRecords')}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {t('tables')} & {t('views')}
              </div>
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => selectDbAndTable(cmd.dbName, cmd.tableName)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg hover:${tc.bg} hover:text-white text-zinc-300 transition-colors group text-left`}
                >
                  <div className="flex items-center gap-3">
                    {cmd.type === 'view' ? (
                      <Eye className="w-4 h-4 text-zinc-500 group-hover:text-white/70" />
                    ) : (
                      <Table2 className="w-4 h-4 text-zinc-500 group-hover:text-white/70" />
                    )}
                    <div>
                      <span className="font-medium text-sm block">{cmd.tableName}</span>
                      <span className="text-xs text-zinc-500 group-hover:text-white/50">
                        {cmd.dbName}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-white/50" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

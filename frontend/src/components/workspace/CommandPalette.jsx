import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, Search, Table2 } from 'lucide-react';

export default function CommandPalette({
  t,
  tc,
  isOpen,
  setIsCommandOpen,
  searchInputRef,
  commandQuery,
  setCommandQuery,
  filteredCommands,
  selectDbAndTable,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!isOpen && commandQuery !== '') {
      setCommandQuery('');
    }
  }, [commandQuery, isOpen, setCommandQuery]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      return;
    }
    if (filteredCommands.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0 || prev >= filteredCommands.length) return 0;
      return prev;
    });
  }, [filteredCommands, isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const activeCommand = filteredCommands[activeIndex];
    if (!activeCommand) return;
    const key = `${activeCommand.dbName}::${activeCommand.tableName}`;
    itemRefs.current[key]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, filteredCommands, isOpen]);

  if (!isOpen) return null;

  const closePalette = () => {
    setIsCommandOpen?.(false);
    setCommandQuery('');
  };

  const handleSelect = (dbName, tableName) => {
    selectDbAndTable(dbName, tableName);
    closePalette();
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredCommands.length === 0) return;
      setActiveIndex((prev) => {
        const current = prev < 0 ? 0 : prev;
        return (current + 1) % filteredCommands.length;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredCommands.length === 0) return;
      setActiveIndex((prev) => {
        if (prev <= 0) return filteredCommands.length - 1;
        return prev - 1;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (activeIndex < 0 || activeIndex >= filteredCommands.length) return;
      event.preventDefault();
      const selected = filteredCommands[activeIndex];
      handleSelect(selected.dbName, selected.tableName);
    }
  };

  return (
    <div
      data-testid="command-palette-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center pt-[10vh] px-4"
      onClick={closePalette}
    >
      <div
        data-testid="command-palette"
        className="bg-[#18181b] border border-[#303038] rounded-2xl w-full max-w-xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#2a2a31] bg-[#151518]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {t('openCmd')}
            </div>
            <div className="text-[11px] text-zinc-500">
              {filteredCommands.length} {t('records')}
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#32323a] bg-[#101013]">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              data-testid="command-palette-input"
              ref={searchInputRef}
              type="text"
              placeholder={t('searchDbTable')}
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-zinc-200 text-sm placeholder:text-zinc-600 min-w-0"
            />
            <kbd className="font-mono text-[10px] bg-[#202026] px-1.5 py-0.5 rounded text-zinc-500 border border-[#333] shrink-0">
              ESC
            </kbd>
          </div>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              {commandQuery ? t('noFilterResults') : t('noRecords')}
            </div>
          ) : (
            <div data-testid="command-palette-list" className="space-y-1.5">
              <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {t('tables')} / {t('views')}
              </div>
              {filteredCommands.map((cmd, idx) => (
                <button
                  data-testid="command-palette-item"
                  data-db-name={cmd.dbName}
                  data-table-name={cmd.tableName}
                  data-active={activeIndex === idx ? 'true' : 'false'}
                  key={`${cmd.dbName}::${cmd.tableName}`}
                  ref={(node) => {
                    itemRefs.current[`${cmd.dbName}::${cmd.tableName}`] = node;
                  }}
                  onClick={() => handleSelect(cmd.dbName, cmd.tableName)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-zinc-300 transition-colors group text-left ${
                    activeIndex === idx
                      ? `${tc.bg} text-white border-transparent`
                      : 'border-[#2f2f36] hover:border-[#454550] hover:bg-[#232329]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {cmd.type === 'view' ? (
                      <Eye
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeIndex === idx
                            ? 'text-white'
                            : 'text-zinc-500 group-hover:text-white/70'
                        }`}
                      />
                    ) : (
                      <Table2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeIndex === idx
                            ? 'text-white'
                            : 'text-zinc-500 group-hover:text-white/70'
                        }`}
                      />
                    )}
                    <span className="font-medium text-sm truncate">{cmd.tableName}</span>
                  </div>
                  <div className="ml-3 flex items-center gap-2 shrink-0">
                    <span
                      data-testid="command-palette-db-label"
                      className={`text-[11px] max-w-[16rem] truncate ${
                        activeIndex === idx ? 'text-white/90' : 'text-zinc-500'
                      }`}
                      title={cmd.dbName}
                    >
                      {cmd.dbName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 text-white/50 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

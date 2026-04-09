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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center pt-[15vh]"
      onClick={closePalette}
    >
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
            onKeyDown={handleInputKeyDown}
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
                  key={`${cmd.dbName}::${cmd.tableName}`}
                  ref={(node) => {
                    itemRefs.current[`${cmd.dbName}::${cmd.tableName}`] = node;
                  }}
                  onClick={() => handleSelect(cmd.dbName, cmd.tableName)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-zinc-300 transition-colors group text-left ${
                    activeIndex === idx ? `${tc.bg} text-white` : `hover:${tc.bg} hover:text-white`
                  }`}
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

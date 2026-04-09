import React from 'react';
import { ChevronRight, LogOut, PanelLeft, RefreshCw, Search, Settings } from 'lucide-react';

export default function WorkspaceHeaderBar({
  t,
  onToggleSidebar,
  host,
  activeDb,
  activeTable,
  onClearSelection,
  onSelectDatabase,
  onOpenCommandPalette,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  onLogout,
}) {
  return (
    <header className="h-14 bg-[#1c1c1c] border-b border-[#2e2e32] flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-2 text-sm text-zinc-400 min-w-0 flex-1 mr-4 overflow-hidden">
        <button
          onClick={onToggleSidebar}
          className="mr-2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 hover:bg-[#333] rounded shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onClearSelection}
          className="hover:text-zinc-200 transition-colors truncate min-w-0 max-w-[28%] text-left"
          title={host}
        >
          {host}
        </button>
        {activeDb && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <button
              onClick={onSelectDatabase}
              className={`hover:text-zinc-200 transition-colors truncate min-w-0 max-w-[28%] text-left ${!activeTable ? 'text-zinc-100 font-medium' : ''}`}
              title={activeDb}
            >
              {activeDb}
            </button>
          </>
        )}
        {activeTable && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-zinc-100 font-medium truncate min-w-0 max-w-[34%]" title={activeTable}>
              {activeTable}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded hover:bg-[#2e2e32]"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded hover:bg-[#2e2e32]"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-zinc-100' : ''}`} />
        </button>
        <button
          onClick={onOpenSettings}
          className="text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded hover:bg-[#2e2e32]"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-[#333] mx-1"></div>
        <button
          onClick={onLogout}
          className="text-zinc-400 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-[#2e2e32]"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

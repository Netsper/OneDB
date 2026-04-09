import React from 'react';
import { Command, Database, Globe, Server, Zap } from 'lucide-react';

export default function WorkspaceStatusBar({
  t,
  tc,
  connForm,
  activeDb,
  ping,
  lang,
  onOpenShortcuts,
}) {
  return (
    <footer className="h-7 bg-[#1c1c1c] border-t border-[#2e2e32] flex items-center justify-between px-4 text-[10px] text-zinc-500 z-50 shrink-0 font-mono tracking-wide gap-3">
      <div className="flex items-center gap-4 min-w-0 overflow-hidden">
        <span className={`flex items-center gap-1.5 ${tc.textLight} shrink-0`}>
          <Server className="w-3 h-3" /> {connForm.host}:{connForm.port}
        </span>
        <span className="truncate min-w-0 hidden md:inline" title={`${connForm.user}@${connForm.host}`}>
          {connForm.user}@{connForm.host}
        </span>
        {activeDb && (
          <span className="truncate min-w-0" title={activeDb}>
            <Database className="w-3 h-3 inline mr-1" />
            {activeDb}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onOpenShortcuts} className="hover:text-zinc-300 flex items-center gap-1">
          <Command className="w-3 h-3" /> {t('shortcuts')}
        </button>
        <span className="flex items-center gap-1" title="Sunucu Gecikmesi">
          <Zap className="w-3 h-3" /> {ping}ms
        </span>
        <span className="font-bold text-zinc-400 hidden sm:inline">OneDB v1.0.0</span>
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3" /> {lang.toUpperCase()}
        </span>
      </div>
    </footer>
  );
}

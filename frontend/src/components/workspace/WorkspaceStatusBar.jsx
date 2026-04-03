import React from 'react';
import { Command, Database, Globe, Server, Zap } from 'lucide-react';

export default function WorkspaceStatusBar({ t, tc, connForm, activeDb, ping, lang, onOpenShortcuts }) {
  return (
    <footer className="h-7 bg-[#1c1c1c] border-t border-[#2e2e32] flex items-center justify-between px-4 text-[10px] text-zinc-500 z-50 shrink-0 font-mono tracking-wide">
      <div className="flex items-center gap-5">
        <span className={`flex items-center gap-1.5 ${tc.textLight}`}>
          <Server className="w-3 h-3" /> {connForm.host}:{connForm.port}
        </span>
        <span>
          {connForm.user}@{connForm.host}
        </span>
        {activeDb && (
          <span>
            <Database className="w-3 h-3 inline mr-1" />
            {activeDb}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onOpenShortcuts} className="hover:text-zinc-300 flex items-center gap-1">
          <Command className="w-3 h-3" /> {t('shortcuts')}
        </button>
        <span className="flex items-center gap-1" title="Sunucu Gecikmesi">
          <Zap className="w-3 h-3" /> {ping}ms
        </span>
        <span className="font-bold text-zinc-400">OneDB v1.0.0</span>
        <Globe className="w-3 h-3 ml-1" /> {lang.toUpperCase()}
      </div>
    </footer>
  );
}

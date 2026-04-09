import React from 'react';
import { Command, X } from 'lucide-react';

export default function ShortcutsModal({ t, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
          <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
            <Command className="w-4 h-4" /> {t('shortcutsTitle')}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">{t('cmdPalette')}</span>
            <div className="flex gap-1">
              <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                Cmd / Ctrl
              </kbd>
              <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                K
              </kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">{t('runQuery')}</span>
            <div className="flex gap-1">
              <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                Cmd / Ctrl
              </kbd>
              <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                Enter
              </kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">{t('closeWindows')}</span>
            <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
              Esc
            </kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">{t('saveInline')}</span>
            <kbd className="bg-[#2e2e32] text-zinc-300 px-2 py-1 rounded text-xs font-mono">
              Enter
            </kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">{t('editCell')}</span>
            <span className="text-xs text-zinc-500">{t('doubleClickCell')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

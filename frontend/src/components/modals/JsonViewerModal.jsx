import React from 'react';
import { X } from 'lucide-react';

export default function JsonViewerModal({
  t,
  tc,
  isOpen,
  onClose,
  columnName,
  formattedValue,
  copyToClipboard,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-3xl flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">{t('viewJson')}</h3>
            <p className="text-xs text-zinc-500 mt-1">{columnName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <pre className="max-h-[60vh] overflow-auto bg-[#18181b] border border-[#333] rounded-lg p-4 text-xs text-zinc-200 whitespace-pre-wrap break-all">
            {formattedValue}
          </pre>
        </div>
        <div className="px-6 py-4 border-t border-[#2e2e32] bg-[#18181b] flex justify-end gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(formattedValue)}
            className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
          >
            {t('copy')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

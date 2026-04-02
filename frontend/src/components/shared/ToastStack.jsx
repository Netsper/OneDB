import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

export default function ToastStack({ toasts, tc }) {
  return (
    <div className="fixed bottom-10 right-6 z-[110] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-[#232323] text-zinc-200 border border-[#333] px-4 py-3 rounded shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-2 pointer-events-auto"
        >
          {toast.type === 'success' ? (
            <Check className={`w-4 h-4 ${tc.text}`} />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <p className="text-xs font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

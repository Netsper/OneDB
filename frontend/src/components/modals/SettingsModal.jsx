import React from 'react';
import { Check, Palette, X } from 'lucide-react';

export default function SettingsModal({
  t,
  tc,
  isOpen,
  onClose,
  lang,
  setLang,
  theme,
  setTheme,
  themes,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
          <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
            <Palette className="w-4 h-4" /> {t('themeSettings')}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-zinc-400 mb-3">{t('languageSelect')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-2 rounded-md text-sm transition-colors border ${lang === 'en' ? `${tc.bg} ${tc.border} text-white` : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'}`}
              >
                English
              </button>
              <button
                onClick={() => setLang('tr')}
                className={`flex-1 py-2 rounded-md text-sm transition-colors border ${lang === 'tr' ? `${tc.bg} ${tc.border} text-white` : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'}`}
              >
                Türkçe
              </button>
            </div>
          </div>
          <div className="border-t border-[#2e2e32]" />
          <div>
            <p className="text-sm text-zinc-400 mb-3">{t('accentColor')}</p>
            <div className="flex gap-4">
              {Object.entries(themes).map(([key, themeObj]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`w-8 h-8 rounded-full ${themeObj.previewClass} border-2 transition-all flex items-center justify-center ${theme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110 opacity-70 hover:opacity-100'}`}
                  title={themeObj.nameKey}
                >
                  {theme === key && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

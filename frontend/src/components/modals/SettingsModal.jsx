import React, { useEffect, useState } from 'react';
import { Check, Code2, Eye, Languages, Palette, Settings2, X } from 'lucide-react';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-[#2f2f33] bg-[#151518] p-4 space-y-3">
      <header className="space-y-1 pb-1 border-b border-[#2a2a2e]">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-300" />
          {title}
        </h4>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-[#2d2d31] bg-[#111113] px-3 py-2.5 transition-colors hover:border-[#3b3b42]">
      <div className="space-y-0.5">
        <p className="text-sm text-zinc-100">{label}</p>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full p-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
          checked
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_0_1px_rgba(16,185,129,0.45)]'
            : 'border border-[#3b3b42] bg-[#25252a]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5 text-emerald-600' : 'translate-x-0 text-zinc-400'
          }`}
        >
          {checked ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />}
        </span>
      </button>
    </label>
  );
}

export default function SettingsModal({
  t,
  tc,
  isOpen,
  onClose,
  lang,
  setLang,
  theme,
  setTheme,
  settings = {
    uiDensity: 'comfortable',
    showCellTooltipOnHover: true,
    sqlEditor: {
      syntaxHighlight: true,
      autocomplete: true,
      wordWrap: true,
      lineNumbers: true,
      fontSize: 13,
    },
    jsonViewer: {
      defaultMode: 'tree',
    },
  },
  setSettings = () => {},
  themes,
}) {
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEntering(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setIsEntering(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSetting = (updater) => {
    setSettings((prev) => updater(prev));
  };

  const updateSqlEditor = (key, value) => {
    updateSetting((prev) => ({
      ...prev,
      sqlEditor: {
        ...prev.sqlEditor,
        [key]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          isEntering ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label={t('close')}
      />
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-3xl bg-gradient-to-b from-[#1d1d21] to-[#17171a] border-l border-[#333] rounded-l-2xl flex flex-col shadow-2xl transition-all duration-300 ease-out ${
          isEntering ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
        }`}
      >
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b]/90 backdrop-blur-md rounded-tl-2xl">
          <div>
            <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> {t('themeSettings')}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{t('settingsGeneralDesc')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Section
                icon={Languages}
                title={t('settingsGeneral')}
                description={t('settingsGeneralDesc')}
              >
                <p className="text-sm text-zinc-400">{t('languageSelect')}</p>
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
                <div className="space-y-1">
                  <p className="text-sm text-zinc-400">{t('settingsDensity')}</p>
                  <p className="text-xs text-zinc-500">{t('settingsDensityDesc')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateSetting((prev) => ({
                        ...prev,
                        uiDensity: 'comfortable',
                      }))
                    }
                    className={`flex-1 py-2 rounded-md text-sm transition-colors border ${
                      settings.uiDensity === 'comfortable'
                        ? `${tc.bg} ${tc.border} text-white`
                        : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'
                    }`}
                  >
                    <span className="block">{t('settingsDensityComfortable')}</span>
                    <span className="block text-[11px] opacity-80">
                      {t('settingsDensityComfortableDesc')}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      updateSetting((prev) => ({
                        ...prev,
                        uiDensity: 'compact',
                      }))
                    }
                    className={`flex-1 py-2 rounded-md text-sm transition-colors border ${
                      settings.uiDensity === 'compact'
                        ? `${tc.bg} ${tc.border} text-white`
                        : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'
                    }`}
                  >
                    <span className="block">{t('settingsDensityCompact')}</span>
                    <span className="block text-[11px] opacity-80">
                      {t('settingsDensityCompactDesc')}
                    </span>
                  </button>
                </div>
              </Section>

              <Section
                icon={Palette}
                title={t('settingsAppearance')}
                description={t('settingsAppearanceDesc')}
              >
                <p className="text-sm text-zinc-400">{t('accentColor')}</p>
                <div className="flex gap-3 flex-wrap">
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
              </Section>
            </div>

            <div className="space-y-4">
              <Section icon={Eye} title={t('settingsTable')} description={t('settingsTableDesc')}>
                <ToggleRow
                  label={t('settingsTooltipOnHover')}
                  description={t('settingsTooltipOnHoverDesc')}
                  checked={settings.showCellTooltipOnHover}
                  onChange={() =>
                    updateSetting((prev) => ({
                      ...prev,
                      showCellTooltipOnHover: !prev.showCellTooltipOnHover,
                    }))
                  }
                />
              </Section>

              <Section icon={Code2} title={t('settingsSqlEditor')} description={t('settingsSqlDesc')}>
                <ToggleRow
                  label={t('settingsSqlSyntaxHighlight')}
                  checked={settings.sqlEditor.syntaxHighlight}
                  onChange={() =>
                    updateSqlEditor('syntaxHighlight', !settings.sqlEditor.syntaxHighlight)
                  }
                />
                <ToggleRow
                  label={t('settingsSqlAutocomplete')}
                  checked={settings.sqlEditor.autocomplete}
                  onChange={() => updateSqlEditor('autocomplete', !settings.sqlEditor.autocomplete)}
                />
                <ToggleRow
                  label={t('settingsSqlWordWrap')}
                  checked={settings.sqlEditor.wordWrap}
                  onChange={() => updateSqlEditor('wordWrap', !settings.sqlEditor.wordWrap)}
                />
                <ToggleRow
                  label={t('settingsSqlLineNumbers')}
                  checked={settings.sqlEditor.lineNumbers}
                  onChange={() => updateSqlEditor('lineNumbers', !settings.sqlEditor.lineNumbers)}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-100">{t('settingsSqlFontSize')}</p>
                    <span className="text-xs text-zinc-400">{settings.sqlEditor.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={11}
                    max={20}
                    value={settings.sqlEditor.fontSize}
                    onChange={(event) => updateSqlEditor('fontSize', Number(event.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </Section>

              <Section
                icon={Code2}
                title={t('settingsJsonViewer')}
                description={t('settingsJsonDesc')}
              >
                <p className="text-sm text-zinc-400">{t('settingsJsonDefaultMode')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateSetting((prev) => ({
                        ...prev,
                        jsonViewer: {
                          ...prev.jsonViewer,
                          defaultMode: 'tree',
                        },
                      }))
                    }
                    className={`flex-1 py-2 rounded-md text-sm transition-colors border ${
                      settings.jsonViewer.defaultMode === 'tree'
                        ? `${tc.bg} ${tc.border} text-white`
                        : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'
                    }`}
                  >
                    {t('settingsJsonModeTree')}
                  </button>
                  <button
                    onClick={() =>
                      updateSetting((prev) => ({
                        ...prev,
                        jsonViewer: {
                          ...prev.jsonViewer,
                          defaultMode: 'raw',
                        },
                      }))
                    }
                    className={`flex-1 py-2 rounded-md text-sm transition-colors border ${
                      settings.jsonViewer.defaultMode === 'raw'
                        ? `${tc.bg} ${tc.border} text-white`
                        : 'border-[#333] text-zinc-400 hover:bg-[#2e2e32]'
                    }`}
                  >
                    {t('settingsJsonModeRaw')}
                  </button>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Check, Code2, Eye, Languages, Palette, Settings2, X } from 'lucide-react';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-lg border border-[#2f2f33] bg-[#141417] p-4 space-y-3">
      <header className="space-y-1">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-300" />
          {title}
        </h4>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm text-zinc-100">{label}</p>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`mt-0.5 h-6 w-11 rounded-full border transition-colors relative ${
          checked ? 'border-emerald-400 bg-emerald-500/30' : 'border-[#3b3b40] bg-[#232327]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-6">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
          <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> {t('themeSettings')}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <Section
            icon={Languages}
            title={t('settingsGeneral')}
            description={t('settingsGeneralDesc')}
          >
            <p className="text-sm text-zinc-400">{t('languageSelect')}</p>
            <div className="flex gap-2 mt-2">
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
            <div className="mt-4">
              <p className="text-sm text-zinc-400">{t('settingsDensity')}</p>
              <div className="flex gap-2 mt-2">
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
                  {t('settingsDensityComfortable')}
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
                  {t('settingsDensityCompact')}
                </button>
              </div>
            </div>
          </Section>

          <Section
            icon={Palette}
            title={t('settingsAppearance')}
            description={t('settingsAppearanceDesc')}
          >
            <p className="text-sm text-zinc-400">{t('accentColor')}</p>
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
          </Section>

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

          <Section icon={Code2} title={t('settingsJsonViewer')} description={t('settingsJsonDesc')}>
            <p className="text-sm text-zinc-400">{t('settingsJsonDefaultMode')}</p>
            <div className="flex gap-2 mt-2">
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
  );
}

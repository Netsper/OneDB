import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Columns,
  Code2,
  Eye,
  Languages,
  Palette,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import ToggleSwitch from '../shared/ToggleSwitch.jsx';

function AccordionSection({ icon: Icon, title, description, isOpen, onToggle, children }) {
  return (
    <section className="border-b border-[#2b2b30] overflow-hidden bg-transparent">
      <button
        type="button"
        onClick={onToggle}
        className="sticky top-0 z-20 w-full px-4 py-3.5 flex items-center justify-between text-left bg-[#17171a]/96 backdrop-blur-sm hover:bg-[#1b1b1f] transition-colors border-b border-[#232327]"
      >
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Icon className="w-4 h-4 text-zinc-300 shrink-0" />
            <span className="truncate">{title}</span>
          </h4>
          {description ? <p className="text-xs text-zinc-500 mt-1">{description}</p> : null}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen ? <div className="space-y-0">{children}</div> : null}
    </section>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div className="border-b border-[#25252a] bg-[#131316] px-4 py-3 space-y-1.5">
      <p className="text-sm text-zinc-100">{title}</p>
      {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
      <div className="pt-1.5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, tc }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-[#25252a] bg-[#131316] px-4 py-3 transition-colors hover:bg-[#18181d]">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm text-zinc-100">{label}</p>
        {description ? <p className="text-xs text-zinc-400">{description}</p> : null}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} tc={tc} />
    </label>
  );
}

function ChoiceButton({ active, onClick, title, subtitle, tc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border transition-colors flex items-center justify-between gap-3 ${
        active
          ? `${tc.border} ${tc.lightBg} ${tc.textLight}`
          : 'border-[#2f2f34] text-zinc-300 hover:bg-[#1e1e23]'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm">{title}</span>
        {subtitle ? <span className="block text-xs text-zinc-500 mt-0.5">{subtitle}</span> : null}
      </span>
      {active ? <Check className={`w-4 h-4 shrink-0 ${tc.textLight}`} /> : null}
    </button>
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
    showCellTooltipOnHover: true,
    tabs: {
      colorizeDbLabelsByDatabase: false,
    },
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
  const [openSections, setOpenSections] = useState({
    general: true,
    appearance: true,
    table: true,
    tabs: true,
    sql: true,
    json: true,
  });

  const sections = useMemo(
    () => [
      {
        key: 'general',
        icon: Languages,
        title: t('settingsGeneral'),
        description: t('settingsGeneralDesc'),
      },
      {
        key: 'appearance',
        icon: Palette,
        title: t('settingsAppearance'),
        description: t('settingsAppearanceDesc'),
      },
      {
        key: 'table',
        icon: Eye,
        title: t('settingsTable'),
        description: t('settingsTableDesc'),
      },
      {
        key: 'tabs',
        icon: Columns,
        title: t('settingsTabs'),
        description: t('settingsTabsDesc'),
      },
      {
        key: 'sql',
        icon: Code2,
        title: t('settingsSqlEditor'),
        description: t('settingsSqlDesc'),
      },
      {
        key: 'json',
        icon: SlidersHorizontal,
        title: t('settingsJsonViewer'),
        description: t('settingsJsonDesc'),
      },
    ],
    [t],
  );

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
        className={`absolute inset-y-0 right-0 w-full max-w-xl bg-gradient-to-b from-[#1d1d21] to-[#17171a] border-l border-[#333] rounded-l-2xl flex flex-col shadow-2xl transition-all duration-300 ease-out ${
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

        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
          {sections.map((section) => (
            <AccordionSection
              key={section.key}
              icon={section.icon}
              title={section.title}
              description={section.description}
              isOpen={Boolean(openSections[section.key])}
              onToggle={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  [section.key]: !prev[section.key],
                }))
              }
            >
              {section.key === 'general' ? (
                <>
                  <SettingRow title={t('languageSelect')}>
                    <div className="space-y-2">
                      <ChoiceButton
                        active={lang === 'en'}
                        onClick={() => setLang('en')}
                        title="English"
                        tc={tc}
                      />
                      <ChoiceButton
                        active={lang === 'tr'}
                        onClick={() => setLang('tr')}
                        title="Türkçe"
                        tc={tc}
                      />
                    </div>
                  </SettingRow>
                </>
              ) : null}

              {section.key === 'appearance' ? (
                <SettingRow title={t('accentColor')}>
                  <div className="space-y-2">
                    {Object.entries(themes).map(([key, themeObj]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                          theme === key
                            ? `${tc.border} ${tc.lightBg} ${tc.textLight}`
                            : 'border-[#333] text-zinc-300 hover:bg-[#232323]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-3 h-3 rounded-full ${themeObj.previewClass}`} />
                          <span className="truncate">{themeObj.nameKey}</span>
                        </span>
                        {theme === key ? <Check className={`w-4 h-4 ${tc.textLight}`} /> : null}
                      </button>
                    ))}
                  </div>
                </SettingRow>
              ) : null}

              {section.key === 'table' ? (
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
                  tc={tc}
                />
              ) : null}

              {section.key === 'tabs' ? (
                <ToggleRow
                  label={t('settingsTabsColorizeDb')}
                  description={t('settingsTabsColorizeDbDesc')}
                  checked={settings.tabs?.colorizeDbLabelsByDatabase ?? false}
                  onChange={() =>
                    updateSetting((prev) => ({
                      ...prev,
                      tabs: {
                        ...(prev.tabs || {}),
                        colorizeDbLabelsByDatabase: !(prev.tabs?.colorizeDbLabelsByDatabase ?? false),
                      },
                    }))
                  }
                  tc={tc}
                />
              ) : null}

              {section.key === 'sql' ? (
                <>
                  <ToggleRow
                    label={t('settingsSqlSyntaxHighlight')}
                    checked={settings.sqlEditor.syntaxHighlight}
                    onChange={() =>
                      updateSqlEditor('syntaxHighlight', !settings.sqlEditor.syntaxHighlight)
                    }
                    tc={tc}
                  />
                  <ToggleRow
                    label={t('settingsSqlAutocomplete')}
                    checked={settings.sqlEditor.autocomplete}
                    onChange={() =>
                      updateSqlEditor('autocomplete', !settings.sqlEditor.autocomplete)
                    }
                    tc={tc}
                  />
                  <ToggleRow
                    label={t('settingsSqlWordWrap')}
                    checked={settings.sqlEditor.wordWrap}
                    onChange={() => updateSqlEditor('wordWrap', !settings.sqlEditor.wordWrap)}
                    tc={tc}
                  />
                  <ToggleRow
                    label={t('settingsSqlLineNumbers')}
                    checked={settings.sqlEditor.lineNumbers}
                    onChange={() => updateSqlEditor('lineNumbers', !settings.sqlEditor.lineNumbers)}
                    tc={tc}
                  />
                  <SettingRow title={t('settingsSqlFontSize')}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">{settings.sqlEditor.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={11}
                      max={20}
                      value={settings.sqlEditor.fontSize}
                      onChange={(event) => updateSqlEditor('fontSize', Number(event.target.value))}
                      className={`w-full ${tc.accent}`}
                    />
                  </SettingRow>
                </>
              ) : null}

              {section.key === 'json' ? (
                <SettingRow title={t('settingsJsonDefaultMode')}>
                  <div className="space-y-2">
                    <ChoiceButton
                      active={settings.jsonViewer.defaultMode === 'tree'}
                      onClick={() =>
                        updateSetting((prev) => ({
                          ...prev,
                          jsonViewer: {
                            ...prev.jsonViewer,
                            defaultMode: 'tree',
                          },
                        }))
                      }
                      title={t('settingsJsonModeTree')}
                      tc={tc}
                    />
                    <ChoiceButton
                      active={settings.jsonViewer.defaultMode === 'raw'}
                      onClick={() =>
                        updateSetting((prev) => ({
                          ...prev,
                          jsonViewer: {
                            ...prev.jsonViewer,
                            defaultMode: 'raw',
                          },
                        }))
                      }
                      title={t('settingsJsonModeRaw')}
                      tc={tc}
                    />
                  </div>
                </SettingRow>
              ) : null}
            </AccordionSection>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Database,
  Loader2,
  Server,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import SettingsModal from '../modals/SettingsModal.jsx';
import SelectField from '../shared/SelectField.jsx';

export default function LoginScreen({
  t,
  tc,
  savedConnections,
  loadConnectionProfile,
  deleteConnectionProfile,
  connForm,
  setConnForm,
  handleConnect,
  openSaveProfileModal,
  saveConnectionProfile,
  isSaveProfileModalOpen,
  profileNameDraft,
  setProfileNameDraft,
  closeSaveProfileModal,
  isConnecting,
  loginError,
  lang,
  setLang,
  theme,
  setTheme,
  settings,
  setSettings,
  themes,
  clearLoginError,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div
      className={`min-h-screen bg-[#1c1c1c] flex items-center justify-center p-4 font-sans text-zinc-300 ${tc.selection}`}
    >
      <div className="bg-[#232323] p-8 rounded-xl w-full max-w-4xl border border-[#333] shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8">
        <div
          className={`absolute -top-20 -right-20 w-48 h-48 ${tc.bg} opacity-10 blur-3xl rounded-full`}
        />
        <div
          className={`absolute -bottom-20 -left-20 w-48 h-48 ${tc.bg} opacity-10 blur-3xl rounded-full`}
        />
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 z-20 text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded hover:bg-[#2e2e32]"
          title={t('themeSettings')}
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="flex-1 md:border-r md:border-[#333] md:pr-8 flex flex-col z-10">
          <h2
            data-testid="saved-servers-title"
            className="text-lg font-medium text-zinc-100 mb-4 flex items-center gap-2"
          >
            <Server className="w-5 h-5" /> {t('savedServers')}
          </h2>
          <div className="flex-1 overflow-auto space-y-2">
            {savedConnections.length === 0 ? (
              <div className="text-sm text-zinc-500 py-8 text-center bg-[#1c1c1c] rounded-lg border border-[#333] border-dashed">
                {t('noSavedConn')}
              </div>
            ) : (
              savedConnections.map((conn, idx) => (
                <div
                  key={idx}
                  className="bg-[#1c1c1c] border border-[#333] hover:border-[#555] rounded-lg p-3 transition-colors group cursor-pointer"
                  onClick={() => loadConnectionProfile(conn)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-zinc-200 text-sm">{conn.name}</span>
                    <button
                      onClick={(e) => deleteConnectionProfile(e, conn.name)}
                      className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {conn.user} @ {conn.host}:{conn.port}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-[1.2] flex flex-col z-10">
          <div className="flex flex-col items-center mb-8">
            <div data-testid="login-brand" className="flex items-center gap-1.5 mb-2">
              <Database className={`w-8 h-8 ${tc.text}`} />
              <span className="text-3xl font-bold tracking-tight text-white">
                One<span className={tc.text}>DB</span>
              </span>
            </div>
            <p className="text-sm text-zinc-500">{t('loginDesc')}</p>
          </div>
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                {t('serverUrl')}
              </label>
              <input
                data-testid="login-host-input"
                type="text"
                disabled={isConnecting}
                className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 transition-colors disabled:opacity-50 ${tc.focusRing}`}
                value={connForm.host}
                onChange={(e) => {
                  clearLoginError();
                  setConnForm({ ...connForm, host: e.target.value });
                }}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {t('username')}
                </label>
                <input
                  data-testid="login-user-input"
                  type="text"
                  disabled={isConnecting}
                  className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 transition-colors disabled:opacity-50 ${tc.focusRing}`}
                  value={connForm.user}
                  onChange={(e) => {
                    clearLoginError();
                    setConnForm({ ...connForm, user: e.target.value });
                  }}
                />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Driver
                </label>
                <SelectField
                  disabled={isConnecting}
                  className={`w-full appearance-none bg-[#1c1c1c] border border-[#3a3a3f] rounded-md py-2 px-2 text-sm text-zinc-100 transition-colors disabled:opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${tc.focusRing}`}
                  value={connForm.driver}
                  onChange={(e) => {
                    clearLoginError();
                    setConnForm({
                      ...connForm,
                      driver: e.target.value,
                      port:
                        e.target.value === 'pgsql'
                          ? '5432'
                          : connForm.port === '5432'
                            ? '3306'
                            : connForm.port,
                    });
                  }}
                >
                  <option value="mysql">MySQL</option>
                  <option value="pgsql">PostgreSQL</option>
                </SelectField>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {t('port')}
                </label>
                <input
                  type="text"
                  disabled={isConnecting}
                  className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 transition-colors disabled:opacity-50 ${tc.focusRing}`}
                  value={connForm.port}
                  onChange={(e) => {
                    clearLoginError();
                    setConnForm({ ...connForm, port: e.target.value });
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                {t('password')}
              </label>
              <input
                data-testid="login-pass-input"
                type="password"
                disabled={isConnecting}
                placeholder="••••••••"
                className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 transition-colors disabled:opacity-50 ${tc.focusRing}`}
                value={connForm.pass}
                onChange={(e) => {
                  clearLoginError();
                  setConnForm({ ...connForm, pass: e.target.value });
                }}
              />
            </div>

            <div className="border border-[#333] rounded-md bg-[#1c1c1c] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((prev) => !prev)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-xs text-zinc-300 hover:bg-[#222228] transition-colors"
              >
                <span className="font-medium uppercase tracking-wider">
                  {t('advancedConnection') || 'Advanced connection'}
                </span>
                {isAdvancedOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>

              {isAdvancedOpen ? (
                <div className="border-t border-[#2e2e32] p-3 space-y-3 bg-[#18181b]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">
                        {t('sslTls') || 'SSL/TLS'}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {t('sslTlsHint') ||
                          'Use secure transport and optional client certificates.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearLoginError();
                        setConnForm({ ...connForm, sslEnabled: !connForm.sslEnabled });
                      }}
                      className={`h-6 w-11 rounded-full border transition-colors relative ${
                        connForm.sslEnabled
                          ? `${tc.bg} border-transparent`
                          : 'bg-[#232328] border-[#444]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          connForm.sslEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {connForm.sslEnabled ? (
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          {t('sslMode') || 'SSL mode'}
                        </label>
                        <SelectField
                          className={`w-full appearance-none bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-100 ${tc.focusRing}`}
                          value={connForm.sslMode || 'prefer'}
                          onChange={(event) =>
                            setConnForm({ ...connForm, sslMode: event.target.value })
                          }
                        >
                          <option value="disable">disable</option>
                          <option value="allow">allow</option>
                          <option value="prefer">prefer</option>
                          <option value="require">require</option>
                          <option value="verify-ca">verify-ca</option>
                          <option value="verify-full">verify-full</option>
                        </SelectField>
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          {t('sslCaPath') || 'CA cert path'}
                        </label>
                        <input
                          type="text"
                          className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                          value={connForm.sslCa || ''}
                          onChange={(event) =>
                            setConnForm({ ...connForm, sslCa: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            {t('sslCertPath') || 'Client cert path'}
                          </label>
                          <input
                            type="text"
                            className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                            value={connForm.sslCert || ''}
                            onChange={(event) =>
                              setConnForm({ ...connForm, sslCert: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            {t('sslKeyPath') || 'Client key path'}
                          </label>
                          <input
                            type="text"
                            className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                            value={connForm.sslKey || ''}
                            onChange={(event) =>
                              setConnForm({ ...connForm, sslKey: event.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          {t('sslKeyPassphrase') || 'Key passphrase'}
                        </label>
                        <input
                          type="password"
                          className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                          value={connForm.sslPassphrase || ''}
                          onChange={(event) =>
                            setConnForm({ ...connForm, sslPassphrase: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t border-[#2e2e32] pt-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-xs text-zinc-300 font-medium">
                          {t('sshTunnel') || 'SSH tunnel'}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {t('sshTunnelHint') ||
                            'Use an already established local tunnel endpoint.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearLoginError();
                          setConnForm({
                            ...connForm,
                            sshTunnelEnabled: !connForm.sshTunnelEnabled,
                          });
                        }}
                        className={`h-6 w-11 rounded-full border transition-colors relative ${
                          connForm.sshTunnelEnabled
                            ? `${tc.bg} border-transparent`
                            : 'bg-[#232328] border-[#444]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            connForm.sshTunnelEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {connForm.sshTunnelEnabled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            {t('sshLocalHost') || 'Local host'}
                          </label>
                          <input
                            type="text"
                            className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                            value={connForm.sshTunnelHost || ''}
                            onChange={(event) =>
                              setConnForm({ ...connForm, sshTunnelHost: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            {t('sshLocalPort') || 'Local port'}
                          </label>
                          <input
                            type="text"
                            className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                            value={connForm.sshTunnelPort || ''}
                            onChange={(event) =>
                              setConnForm({ ...connForm, sshTunnelPort: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-[#2e2e32] pt-3">
                    <label className="block text-xs text-zinc-300 font-medium mb-1">
                      {t('secretProfileRef') || 'Secret profile reference'}
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-[#1c1c1c] border border-[#333] rounded-md py-2 px-3 text-xs text-zinc-200 ${tc.focusRing}`}
                      placeholder={t('secretProfileRefHint') || 'e.g. PROD_MAIN'}
                      value={connForm.secretRef || ''}
                      onChange={(event) =>
                        setConnForm({ ...connForm, secretRef: event.target.value })
                      }
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {t('secretProfileRefDesc') ||
                        'Backend reads ONEDB_SECRET_<REF> from environment and merges credentials.'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            {loginError && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {loginError}
              </div>
            )}
            <div className="flex gap-2 mt-6 pt-2">
              <button
                type="button"
                onClick={openSaveProfileModal}
                disabled={isConnecting}
                className="bg-[#1c1c1c] border border-[#333] hover:bg-[#2e2e32] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-md transition-colors"
              >
                {t('saveBtn')}
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                data-testid="connect-button"
                className={`flex-1 ${tc.bg} ${tc.hoverBg} text-white text-sm font-medium py-2.5 rounded-md transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Database className="w-4 h-4" /> {t('connectBtn')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isSaveProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-[#2e2e32] bg-[#18181b] rounded-t-xl flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-100">{t('saveConnectionProfile')}</h3>
              <button
                type="button"
                onClick={closeSaveProfileModal}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveConnectionProfile(profileNameDraft);
              }}
              className="p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {t('profileName')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={profileNameDraft}
                  onChange={(event) => setProfileNameDraft(event.target.value)}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                  placeholder={t('profileNamePlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeSaveProfileModal}
                  className="px-3 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-3 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SettingsModal
        t={t}
        tc={tc}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        settings={settings}
        setSettings={setSettings}
        themes={themes}
      />
    </div>
  );
}

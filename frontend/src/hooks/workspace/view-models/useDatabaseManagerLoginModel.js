import { useEffect, useRef } from 'react';
import useWorkspaceConnectionActions from '../actions/useWorkspaceConnectionActions.js';

export default function useDatabaseManagerLoginModel(model, apiModel) {
  const { workspace, t, tc, themes, showToast } = model;
  const { getCsrfToken, callApi, buildConnectionPayload, refreshSchemas } = apiModel;

  const {
    handleConnect,
    openSaveProfileModal,
    closeSaveProfileModal,
    saveConnectionProfile,
    loadConnectionProfile,
    deleteConnectionProfile,
    handleDownloadBuild,
  } = useWorkspaceConnectionActions({
    ...workspace,
    t,
    getCsrfToken,
    callApi,
    buildConnectionPayload,
    refreshSchemas,
    showToast,
  });

  const didAttemptRestoreRef = useRef(false);

  useEffect(() => {
    if (workspace.isConnected) return;
    if (workspace.isConnecting) return;
    if (didAttemptRestoreRef.current) return;
    const rawLastConnection = localStorage.getItem('dbm_last_connection');
    if (!rawLastConnection) return;

    try {
      const parsed = JSON.parse(rawLastConnection);
      const requiresPassword = Boolean(parsed?.requiresPassword);
      if (requiresPassword && !String(workspace.connForm?.pass || '')) {
        return;
      }
    } catch {
      // Fallback to attempting connection when persisted shape is invalid.
    }

    didAttemptRestoreRef.current = true;
    handleConnect();
  }, [handleConnect, workspace.connForm?.pass, workspace.isConnected, workspace.isConnecting]);

  const loginScreenProps = {
    t,
    tc,
    savedConnections: workspace.savedConnections,
    loadConnectionProfile,
    deleteConnectionProfile,
    connForm: workspace.connForm,
    setConnForm: workspace.setConnForm,
    handleConnect,
    openSaveProfileModal,
    saveConnectionProfile,
    isSaveProfileModalOpen: workspace.isSaveProfileModalOpen,
    profileNameDraft: workspace.profileNameDraft,
    setProfileNameDraft: workspace.setProfileNameDraft,
    closeSaveProfileModal,
    isConnecting: workspace.isConnecting,
    isBuilding: workspace.isBuilding,
    handleDownloadBuild,
    loginError: workspace.loginError,
    lang: workspace.lang,
    setLang: workspace.setLang,
    theme: workspace.theme,
    setTheme: workspace.setTheme,
    settings: workspace.settings,
    setSettings: workspace.setSettings,
    themes,
    clearLoginError: () => workspace.setLoginError(''),
  };

  return { loginScreenProps };
}

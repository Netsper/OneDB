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
    if (!localStorage.getItem('dbm_last_connection')) return;

    didAttemptRestoreRef.current = true;
    handleConnect();
  }, [handleConnect, workspace.isConnected, workspace.isConnecting]);

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
    loginError: workspace.loginError,
    lang: workspace.lang,
    setLang: workspace.setLang,
    theme: workspace.theme,
    setTheme: workspace.setTheme,
    themes,
    clearLoginError: () => workspace.setLoginError(''),
  };

  return { loginScreenProps };
}

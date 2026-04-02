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

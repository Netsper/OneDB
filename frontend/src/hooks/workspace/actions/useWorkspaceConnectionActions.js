export default function useWorkspaceConnectionActions({
  t,
  connForm,
  setConnForm,
  setIsConnecting,
  setLoginError,
  setIsConnected,
  setQps,
  setActiveDb,
  setActiveTable,
  setExpandedDbs,
  setExpandedGroups,
  setSavedConnections,
  setProfileNameDraft,
  setIsSaveProfileModalOpen,
  csrfTokenRef,
  getCsrfToken,
  callApi,
  buildConnectionPayload,
  refreshSchemas,
  showToast,
}) {
  const persistLastConnection = () => {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
        return;
      }
      localStorage.setItem(
        'dbm_last_connection',
        JSON.stringify({
          name: String(connForm.name || '').trim(),
          host: String(connForm.host || '').trim(),
          user: String(connForm.user || '').trim(),
          pass: String(connForm.pass || ''),
          port: String(connForm.port || '').trim(),
          driver: connForm.driver === 'pgsql' ? 'pgsql' : 'mysql',
        }),
      );
    } catch {
      // Ignore storage failures in restricted/private runtime contexts.
    }
  };

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    setIsConnecting(true);
    setLoginError('');
    try {
      csrfTokenRef.current = '';
      await getCsrfToken();
      await callApi('test_connection', { connection: buildConnectionPayload('') });
      const dbNames = await refreshSchemas();
      setIsConnected(true);
      setQps(0);

      persistLastConnection();

      const firstDb = dbNames[0] || null;
      if (firstDb) {
        setActiveDb(firstDb);
        setExpandedDbs({ [firstDb]: true });
        setExpandedGroups({ [`${firstDb}_tables`]: true, [`${firstDb}_views`]: true });
      } else {
        setActiveDb(null);
        setActiveTable(null);
      }

      showToast(t('connSuccess'), 'success');
    } catch (error) {
      setLoginError(error.message || 'Connection failed.');
      showToast(error.message || 'Connection failed.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const openSaveProfileModal = () => {
    setProfileNameDraft(String(connForm.name || connForm.host || '').trim());
    setIsSaveProfileModalOpen(true);
  };

  const closeSaveProfileModal = () => {
    setIsSaveProfileModalOpen(false);
  };

  const saveConnectionProfile = (profileNameInput) => {
    const profileName = String(profileNameInput || '').trim();
    if (!profileName) {
      showToast(t('profileNameRequired'), 'error');
      return;
    }

    setSavedConnections((prev) => [
      ...prev.filter((connection) => connection.name !== profileName),
      { ...connForm, pass: '', name: profileName },
    ]);
    setConnForm((prev) => ({ ...prev, name: profileName }));
    setIsSaveProfileModalOpen(false);
    showToast(t('connSaved'), 'success');
  };

  const loadConnectionProfile = (profile) => {
    const inferredDriver = profile.driver || (String(profile.port) === '5432' ? 'pgsql' : 'mysql');
    setConnForm({
      host: profile.host || '',
      user: profile.user || '',
      pass: '',
      port: profile.port || '',
      name: profile.name || '',
      driver: inferredDriver,
    });
    setLoginError('');
  };

  const deleteConnectionProfile = (e, profileName) => {
    e.stopPropagation();
    setSavedConnections((prev) => prev.filter((c) => c.name !== profileName));
  };

  return {
    handleConnect,
    openSaveProfileModal,
    closeSaveProfileModal,
    saveConnectionProfile,
    loadConnectionProfile,
    deleteConnectionProfile,
  };
}

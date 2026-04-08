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
  isBuilding,
  setIsBuilding,
  setIsInitializing,
  csrfTokenRef,
  getCsrfToken,
  callApi,
  buildConnectionPayload,
  refreshSchemas,
  showToast,
}) {
  const getSessionStorage = () => {
    if (typeof sessionStorage === 'undefined' || sessionStorage == null) {
      return null;
    }
    return sessionStorage;
  };

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
          port: String(connForm.port || '').trim(),
          driver: connForm.driver === 'pgsql' ? 'pgsql' : 'mysql',
          sslEnabled: Boolean(connForm.sslEnabled),
          sslMode: String(connForm.sslMode || 'prefer'),
          sslCa: String(connForm.sslCa || ''),
          sslCert: String(connForm.sslCert || ''),
          sslKey: String(connForm.sslKey || ''),
          sshTunnelEnabled: Boolean(connForm.sshTunnelEnabled),
          sshTunnelHost: String(connForm.sshTunnelHost || '127.0.0.1'),
          sshTunnelPort: String(connForm.sshTunnelPort || ''),
          secretRef: String(connForm.secretRef || '').trim(),
          requiresPassword: String(connForm.pass || '') !== '',
        }),
      );

      const session = getSessionStorage();
      if (session && typeof session.setItem === 'function') {
        session.setItem('dbm_last_connection_pass', String(connForm.pass || ''));
      }
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

      const params = new URLSearchParams(window.location.search);
      const urlDb = params.get('db');
      const urlTable = params.get('table');

      const targetDb = (urlDb && dbNames.includes(urlDb)) ? urlDb : (dbNames[0] || null);

      if (targetDb) {
        setActiveDb(targetDb);
        setExpandedDbs((prev) => ({ ...prev, [targetDb]: true }));
        setExpandedGroups((prev) => ({ 
          ...prev, 
          [`${targetDb}_tables`]: true, 
          [`${targetDb}_views`]: true 
        }));

        if (urlTable) {
          const tabId = `${targetDb}::${urlTable}`;
          // Ensure the tab exists in openTableTabs if it's new
          setOpenTableTabs((prev) => {
            if (prev.some(t => t.id === tabId)) return prev;
            return [...prev, { id: tabId, dbName: targetDb, tableName: urlTable, pinned: false }];
          });
          setActiveTableTabId(tabId);
          setActiveTable(urlTable);
        }
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
      if (setIsInitializing) setIsInitializing(false);
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
      { ...connForm, name: profileName },
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
      pass: profile.pass || '',
      port: profile.port || '',
      name: profile.name || '',
      driver: inferredDriver,
      sslEnabled: Boolean(profile.sslEnabled),
      sslMode: String(profile.sslMode || 'prefer'),
      sslCa: String(profile.sslCa || ''),
      sslCert: String(profile.sslCert || ''),
      sslKey: String(profile.sslKey || ''),
      sslPassphrase: profile.sslPassphrase || '',
      sshTunnelEnabled: Boolean(profile.sshTunnelEnabled),
      sshTunnelHost: String(profile.sshTunnelHost || '127.0.0.1'),
      sshTunnelPort: String(profile.sshTunnelPort || ''),
      secretRef: String(profile.secretRef || ''),
    });
    setLoginError('');
  };

  const deleteConnectionProfile = (e, profileName) => {
    e.stopPropagation();
    setSavedConnections((prev) => prev.filter((c) => c.name !== profileName));
  };

  const handleDownloadBuild = async () => {
    if (isBuilding) return;
    
    showToast(t('building') + '...', 'info');
    setIsBuilding(true);
    try {
      const blob = await callApi('build_release', null, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'OneDB.php');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || 'Build failed.', 'error');
    } finally {
      setIsBuilding(false);
    }
  };

  return {
    handleConnect,
    openSaveProfileModal,
    closeSaveProfileModal,
    saveConnectionProfile,
    loadConnectionProfile,
    deleteConnectionProfile,
    handleDownloadBuild,
  };
}

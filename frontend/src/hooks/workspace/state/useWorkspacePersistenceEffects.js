import { useEffect } from 'react';

export default function useWorkspacePersistenceEffects({
  lang,
  theme,
  settings,
  sqlHistory,
  sqlSnippets,
  sidebarWidth,
  pinnedItems,
  savedConnections,
  databaseVisibility,
  openTableTabs,
  activeTableTabId,
}) {
  useEffect(() => {
    localStorage.setItem('dbm_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('dbm_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dbm_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('dbm_sql_history', JSON.stringify(sqlHistory));
  }, [sqlHistory]);

  useEffect(() => {
    localStorage.setItem('dbm_sql_snippets', JSON.stringify(sqlSnippets));
  }, [sqlSnippets]);

  useEffect(() => {
    localStorage.setItem('dbm_sidebar_w', sidebarWidth);
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('dbm_pinned', JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  useEffect(() => {
    localStorage.setItem('dbm_connections', JSON.stringify(savedConnections));
  }, [savedConnections]);

  useEffect(() => {
    localStorage.setItem('dbm_database_visibility', JSON.stringify(databaseVisibility));
  }, [databaseVisibility]);

  useEffect(() => {
    localStorage.setItem('dbm_open_table_tabs', JSON.stringify(openTableTabs));
  }, [openTableTabs]);

  useEffect(() => {
    if (activeTableTabId) {
      localStorage.setItem('dbm_active_table_tab', activeTableTabId);
      return;
    }
    localStorage.removeItem('dbm_active_table_tab');
  }, [activeTableTabId]);
}

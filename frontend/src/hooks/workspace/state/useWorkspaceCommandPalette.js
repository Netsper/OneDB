import { useMemo } from 'react';

export const flattenDatabaseTables = (databases) => {
  const list = [];
  Object.keys(databases || {}).forEach((db) => {
    Object.keys(databases[db] || {}).forEach((tbl) => {
      list.push({ dbName: db, tableName: tbl, type: databases[db][tbl].type || 'table' });
    });
  });
  return list;
};

export const filterCommandEntries = (allTablesList, commandQuery, maxResults = 100) => {
  if (!commandQuery) {
    return (Array.isArray(allTablesList) ? allTablesList : []).slice(0, 10);
  }

  const normalizedQuery = commandQuery.toLowerCase();
  return (Array.isArray(allTablesList) ? allTablesList : [])
    .filter(
      (item) =>
        item.tableName.toLowerCase().includes(normalizedQuery) ||
        item.dbName.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, maxResults);
};

export default function useWorkspaceCommandPalette({ databases, commandQuery, sidebarQuery }) {
  const MAX_COMMAND_RESULTS = 100;

  const allTablesList = useMemo(() => flattenDatabaseTables(databases), [databases]);

  const filteredCommands = useMemo(
    () => filterCommandEntries(allTablesList, commandQuery, MAX_COMMAND_RESULTS),
    [allTablesList, commandQuery],
  );

  const hasSidebarFilters = sidebarQuery.trim() !== '';

  return {
    filteredCommands,
    hasSidebarFilters,
  };
}

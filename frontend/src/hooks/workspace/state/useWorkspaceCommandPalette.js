import { useMemo } from 'react';

export default function useWorkspaceCommandPalette({ databases, commandQuery, sidebarQuery }) {
  const MAX_COMMAND_RESULTS = 100;

  const allTablesList = useMemo(() => {
    const list = [];
    Object.keys(databases).forEach((db) => {
      Object.keys(databases[db]).forEach((tbl) => {
        list.push({ dbName: db, tableName: tbl, type: databases[db][tbl].type || 'table' });
      });
    });
    return list;
  }, [databases]);

  const filteredCommands = useMemo(() => {
    if (!commandQuery) {
      return allTablesList.slice(0, 10);
    }

    const normalizedQuery = commandQuery.toLowerCase();
    return allTablesList
      .filter(
        (item) =>
          item.tableName.toLowerCase().includes(normalizedQuery) ||
          item.dbName.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, MAX_COMMAND_RESULTS);
  }, [allTablesList, commandQuery]);

  const hasSidebarFilters = sidebarQuery.trim() !== '';

  return {
    filteredCommands,
    hasSidebarFilters,
  };
}

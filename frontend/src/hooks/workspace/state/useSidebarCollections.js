import { useCallback, useMemo } from 'react';
import { makeDatabasePinKey, makeTablePinKey, parseDatabasePinKey } from '../../../utils/pins.js';

export default function useSidebarCollections({
  databases,
  pinnedItems,
  sidebarQuery,
  visibilityQuery,
  databaseVisibility,
  loadedTableDbs,
  setDatabaseVisibility,
}) {
  const isDatabaseVisible = useCallback(
    (dbName) => databaseVisibility[dbName] !== false,
    [databaseVisibility],
  );

  const toggleDatabaseVisibility = useCallback(
    (dbName) => {
      setDatabaseVisibility((prev) => ({
        ...prev,
        [dbName]: prev[dbName] === false ? true : false,
      }));
    },
    [setDatabaseVisibility],
  );

  const pinnedDatabaseSet = useMemo(
    () => new Set(pinnedItems.filter((item) => item.startsWith('db:'))),
    [pinnedItems],
  );

  const pinnedTableSet = useMemo(
    () => new Set(pinnedItems.filter((item) => item.startsWith('table:'))),
    [pinnedItems],
  );

  const isDatabasePinned = useCallback(
    (dbName) => pinnedDatabaseSet.has(makeDatabasePinKey(dbName)),
    [pinnedDatabaseSet],
  );

  const isTablePinned = useCallback(
    (dbName, tableName) => pinnedTableSet.has(makeTablePinKey(dbName, tableName)),
    [pinnedTableSet],
  );

  const filteredPinnedDatabases = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase();
    return pinnedItems
      .filter((item) => item.startsWith('db:'))
      .map((item) => parseDatabasePinKey(item))
      .filter((dbName) => databases[dbName])
      .filter((dbName) => isDatabaseVisible(dbName))
      .filter((dbName) => !query || dbName.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b))
      .map((dbName) => {
        const dbEntries = databases[dbName] || {};
        const tableCount = loadedTableDbs[dbName]
          ? Object.values(dbEntries).filter((entry) => (entry.type || 'table') !== 'view').length
          : null;
        return { dbName, tableCount };
      });
  }, [databases, isDatabaseVisible, loadedTableDbs, pinnedItems, sidebarQuery]);

  const visibilityDatabases = useMemo(() => {
    const query = visibilityQuery.trim().toLowerCase();
    return Object.keys(databases)
      .sort()
      .filter((dbName) => {
        if (!query) return true;
        return dbName.toLowerCase().includes(query);
      });
  }, [databases, visibilityQuery]);

  const areAllVisibilityDatabasesVisible = useMemo(
    () =>
      visibilityDatabases.length > 0 &&
      visibilityDatabases.every((dbName) => isDatabaseVisible(dbName)),
    [isDatabaseVisible, visibilityDatabases],
  );

  const toggleAllVisibilityDatabases = useCallback(() => {
    if (visibilityDatabases.length === 0) return;
    const nextVisibleValue = !areAllVisibilityDatabasesVisible;
    setDatabaseVisibility((prev) => {
      const next = { ...prev };
      visibilityDatabases.forEach((dbName) => {
        next[dbName] = nextVisibleValue;
      });
      return next;
    });
  }, [areAllVisibilityDatabasesVisible, setDatabaseVisibility, visibilityDatabases]);

  const sidebarDatabases = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase();

    return Object.keys(databases)
      .sort()
      .reduce((list, dbName) => {
        if (!isDatabaseVisible(dbName)) {
          return list;
        }
        const dbEntries = databases[dbName] || {};
        const dbMatches = query !== '' && dbName.toLowerCase().includes(query);
        const objectEntries = Object.keys(dbEntries).map((entryName) => ({
          name: entryName,
          ...dbEntries[entryName],
        }));

        const visibleEntries = objectEntries.filter((entry) => {
          if (!query) return true;
          if (dbMatches) return true;
          return entry.name.toLowerCase().includes(query);
        });

        const pinnedEntries = visibleEntries
          .filter((entry) => isTablePinned(dbName, entry.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        const tables = visibleEntries
          .filter(
            (entry) =>
              (entry.type === 'table' || !entry.type) && !isTablePinned(dbName, entry.name),
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        const views = visibleEntries
          .filter((entry) => entry.type === 'view' && !isTablePinned(dbName, entry.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        const tableCount = loadedTableDbs[dbName]
          ? objectEntries.filter((entry) => entry.type !== 'view').length
          : null;

        if (
          query &&
          !dbMatches &&
          tables.length === 0 &&
          views.length === 0 &&
          pinnedEntries.length === 0
        ) {
          return list;
        }

        list.push({
          dbName,
          pinnedEntries,
          tables,
          views,
          tableCount,
        });

        return list;
      }, []);
  }, [databases, isDatabaseVisible, isTablePinned, loadedTableDbs, sidebarQuery]);

  return {
    isDatabaseVisible,
    toggleDatabaseVisibility,
    isDatabasePinned,
    isTablePinned,
    filteredPinnedDatabases,
    visibilityDatabases,
    areAllVisibilityDatabasesVisible,
    toggleAllVisibilityDatabases,
    sidebarDatabases,
  };
}

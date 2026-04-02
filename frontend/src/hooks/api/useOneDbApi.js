import { useCallback } from 'react';

export const shouldIncludeBrowseRowCount = (nextPage, overrideValue) => {
  if (typeof overrideValue === 'boolean') {
    return overrideValue;
  }
  return Number(nextPage || 1) <= 1;
};

export const resolveBrowseRowCount = ({ includeRowCount, apiRowCount, fallbackRowCount }) => {
  if (includeRowCount) {
    const parsed = Number(apiRowCount || 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  const fallback = Number(fallbackRowCount || 0);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
};

export default function useOneDbApi({
  currentDriver,
  connForm,
  csrfTokenRef,
  activeDb,
  activeTable,
  page,
  rowsPerPage,
  sortConfig,
  serverColumnFilters,
  filterRules,
  databases,
  loadedTableDbs,
  loadingTableDbs,
  setDatabases,
  setLoadedTableDbs,
  setLoadingTableDbs,
  setPing,
  setDbSizeLabel,
  escapeLiteral,
}) {
  const buildConnectionPayload = useCallback(
    (database = '') => ({
      driver: currentDriver,
      host: connForm.host.trim(),
      port: connForm.port.trim(),
      username: connForm.user.trim(),
      password: connForm.pass,
      database: currentDriver === 'pgsql' ? database || 'postgres' : database,
      charset: 'utf8mb4',
    }),
    [connForm.host, connForm.pass, connForm.port, connForm.user, currentDriver],
  );

  const apiActionUrl = useCallback((action) => `?api=${encodeURIComponent(action)}`, []);

  const getCsrfToken = useCallback(async () => {
    if (csrfTokenRef.current) return csrfTokenRef.current;
    const res = await fetch(apiActionUrl('csrf'), {
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !data.token) {
      throw new Error(data?.error || 'Failed to fetch CSRF token.');
    }
    csrfTokenRef.current = data.token;
    return csrfTokenRef.current;
  }, [apiActionUrl, csrfTokenRef]);

  const callApi = useCallback(
    async (action, payload = null, options = {}) => {
      const method = options.method || 'POST';
      const headers = {};
      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        headers['X-CSRF-Token'] = await getCsrfToken();
      }

      const res = await fetch(apiActionUrl(action), {
        method,
        credentials: 'same-origin',
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(payload || {}),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Invalid API response for "${action}".`);
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `API "${action}" failed (${res.status}).`);
      }
      return data;
    },
    [apiActionUrl, getCsrfToken],
  );

  const executeSql = useCallback(
    async (sql, database = activeDb) =>
      callApi('query', {
        connection: buildConnectionPayload(database || ''),
        sql,
      }),
    [activeDb, buildConnectionPayload, callApi],
  );

  const getFirstValue = useCallback((row) => {
    if (!row || typeof row !== 'object') return null;
    const values = Object.values(row);
    return values.length > 0 ? values[0] : null;
  }, []);

  const listDatabases = useCallback(async () => {
    const result = await callApi('list_databases', {
      connection: buildConnectionPayload(''),
    });

    return (result.databases || []).map((dbName) => String(dbName || '').trim()).filter(Boolean);
  }, [buildConnectionPayload, callApi]);

  const refreshSchemas = useCallback(
    async (databaseNames) => {
      const dbNames = Array.isArray(databaseNames) ? databaseNames : await listDatabases();
      setDatabases((prev) => {
        const next = {};
        dbNames.forEach((dbName) => {
          next[dbName] = prev[dbName] || {};
        });
        return next;
      });
      setLoadedTableDbs((prev) =>
        Object.keys(prev).reduce((next, dbName) => {
          if (dbNames.includes(dbName)) next[dbName] = prev[dbName];
          return next;
        }, {}),
      );

      return dbNames;
    },
    [listDatabases, setDatabases, setLoadedTableDbs],
  );

  const ensureDatabaseTablesLoaded = useCallback(
    async (dbName, options = {}) => {
      if (!dbName) return [];
      if (loadedTableDbs[dbName] && !options.force) {
        return Object.values(databases[dbName] || {});
      }
      if (loadingTableDbs[dbName] && !options.force) {
        return [];
      }

      setLoadingTableDbs((prev) => ({ ...prev, [dbName]: true }));
      try {
        const result = await callApi('list_tables', {
          connection: buildConnectionPayload(dbName),
        });
        const entries = (result.tables || [])
          .map((row) => ({
            name: String(row.name || '').trim(),
            type: String(row.type || '').toLowerCase() === 'view' ? 'view' : 'table',
            columnCount: Number(row.columnCount || 0),
          }))
          .filter((entry) => entry.name !== '');

        setDatabases((prev) => {
          const prevDb = prev[dbName] || {};
          const nextDb = {};

          entries.forEach((entry) => {
            const currentEntry = prevDb[entry.name];
            nextDb[entry.name] = currentEntry
              ? { ...currentEntry, type: entry.type, columnCount: entry.columnCount }
              : {
                  type: entry.type,
                  columns: [],
                  data: [],
                  rowCount: 0,
                  columnCount: entry.columnCount,
                  loaded: false,
                  page: 1,
                  perPage: rowsPerPage,
                };
          });

          return {
            ...prev,
            [dbName]: nextDb,
          };
        });
        setLoadedTableDbs((prev) => ({ ...prev, [dbName]: true }));

        return entries;
      } finally {
        setLoadingTableDbs((prev) => ({ ...prev, [dbName]: false }));
      }
    },
    [
      buildConnectionPayload,
      callApi,
      databases,
      loadedTableDbs,
      loadingTableDbs,
      rowsPerPage,
      setDatabases,
      setLoadedTableDbs,
      setLoadingTableDbs,
    ],
  );

  const buildBrowseFilters = useCallback(
    (filtersMap = serverColumnFilters, rulesList = filterRules) => {
      const columnFilters = Object.entries(filtersMap || {}).reduce(
        (list, [column, filterConfig]) => {
          if (!filterConfig || typeof filterConfig !== 'object') return list;
          const value = String(filterConfig?.value ?? '').trim();
          if (value === '') return list;
          list.push({
            column,
            operator: filterConfig?.operator || 'contains',
            value,
          });
          return list;
        },
        [],
      );

      const extraRules = (Array.isArray(rulesList) ? rulesList : []).reduce((list, rule) => {
        if (!rule || typeof rule !== 'object') return list;
        const column = String(rule.column || '').trim();
        const operator = String(rule.operator || 'contains').trim() || 'contains';
        const value = String(rule.value ?? '').trim();

        if (column === '' || value === '') return list;
        list.push({ column, operator, value });
        return list;
      }, []);

      return [...columnFilters, ...extraRules];
    },
    [filterRules, serverColumnFilters],
  );

  const loadTableDetails = useCallback(
    async (dbName, tableName, overrides = {}) => {
      if (!dbName || !tableName) return null;

      const nextPage = overrides.page ?? page;
      const nextPerPage = overrides.perPage ?? rowsPerPage;
      const includeRowCount = shouldIncludeBrowseRowCount(nextPage, overrides.includeRowCount);
      const hasInsights = Boolean(databases?.[dbName]?.[tableName]?.insightsLoaded);
      const includeInsights =
        typeof overrides.includeInsights === 'boolean' ? overrides.includeInsights : !hasInsights;
      const nextSort = overrides.sort ?? (sortConfig.key ? sortConfig : null);
      const nextColumnFilters = overrides.columnFilters ?? serverColumnFilters;
      const nextRuleFilters = overrides.ruleFilters ?? filterRules;
      const tableType = String(databases?.[dbName]?.[tableName]?.type || 'table').toLowerCase();
      const result = await callApi('browse_table', {
        connection: buildConnectionPayload(dbName),
        table: tableName,
        tableType,
        page: nextPage,
        perPage: nextPerPage,
        includeRowCount,
        includeInsights,
        sort: nextSort?.key ? { column: nextSort.key, direction: nextSort.direction } : null,
        filters: buildBrowseFilters(nextColumnFilters, nextRuleFilters),
      });

      const rows = (result.rows || []).map((row, index) => ({ ...row, _origIndex: index }));
      const columns = result.columns || [];

      setDatabases((prev) => {
        const dbEntry = prev[dbName] || {};
        const currentEntry = dbEntry[tableName] || { type: 'table' };
        const rowCount = resolveBrowseRowCount({
          includeRowCount,
          apiRowCount: result.rowCount,
          fallbackRowCount: currentEntry.rowCount,
        });
        return {
          ...prev,
          [dbName]: {
            ...dbEntry,
            [tableName]: {
              ...currentEntry,
              columns,
              data: rows,
              rowCount,
              columnCount: columns.length,
              insights: includeInsights ? result.insights || null : currentEntry.insights || null,
              insightsLoaded:
                includeInsights || Boolean(currentEntry.insightsLoaded || result.insights),
              loaded: true,
              page: Number(result.page || nextPage),
              perPage: Number(result.perPage || nextPerPage),
            },
          },
        };
      });

      return result;
    },
    [
      buildBrowseFilters,
      buildConnectionPayload,
      callApi,
      databases,
      filterRules,
      page,
      rowsPerPage,
      serverColumnFilters,
      setDatabases,
      sortConfig,
    ],
  );

  const refreshActiveTable = useCallback(async () => {
    if (!activeDb || !activeTable) return;
    await loadTableDetails(activeDb, activeTable);
  }, [activeDb, activeTable, loadTableDetails]);

  const refreshPing = useCallback(async () => {
    const started = performance.now();
    await callApi('ping', null, { method: 'GET' });
    const elapsed = Math.max(1, Math.round(performance.now() - started));
    setPing(elapsed);
    return elapsed;
  }, [callApi, setPing]);

  const refreshDatabaseSize = useCallback(
    async (dbName) => {
      if (!dbName) {
        setDbSizeLabel('--');
        return;
      }

      const sizeSql =
        currentDriver === 'pgsql'
          ? "SELECT ROUND(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) / 1024 / 1024.0, 2) AS mb FROM pg_tables WHERE schemaname = 'public';"
          : `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS mb FROM information_schema.tables WHERE table_schema = ${escapeLiteral(dbName)};`;

      try {
        const result = await executeSql(sizeSql, dbName);
        const mb = Number(getFirstValue(result.rows?.[0]));
        if (Number.isFinite(mb)) {
          setDbSizeLabel(`${mb.toFixed(2)} MB`);
        } else {
          setDbSizeLabel('--');
        }
      } catch {
        setDbSizeLabel('--');
      }
    },
    [currentDriver, escapeLiteral, executeSql, getFirstValue, setDbSizeLabel],
  );

  return {
    buildConnectionPayload,
    getCsrfToken,
    callApi,
    executeSql,
    getFirstValue,
    listDatabases,
    refreshSchemas,
    ensureDatabaseTablesLoaded,
    buildBrowseFilters,
    loadTableDetails,
    refreshActiveTable,
    refreshPing,
    refreshDatabaseSize,
  };
}

export const mapExplainRowToPlanItem = (row, getFirstValue) => {
  const baseItem = {
    node: '-',
    entity: '-',
    cost: '-',
    rows: '-',
    time: '-',
    raw: row,
  };

  if (!row || typeof row !== 'object') {
    return baseItem;
  }

  const firstValue = getFirstValue(row);
  const firstText = String(firstValue ?? '').trim();

  if (firstText !== '') {
    const postgresMatch = firstText.match(/^(.*?)(?:\s+on\s+([^\s(]+))?\s+\((.+)\)$/i);
    if (postgresMatch) {
      const attrs = String(postgresMatch[3] || '');
      const costMatch = attrs.match(/cost=([0-9.]+)\.\.([0-9.]+)/i);
      const rowsMatch = attrs.match(/rows=([0-9]+)/i);
      const timeMatch = attrs.match(/actual time=([0-9.]+)\.\.([0-9.]+)/i);

      return {
        ...baseItem,
        node: String(postgresMatch[1] || '-').trim() || '-',
        entity: String(postgresMatch[2] || '-').replace(/^"|"$/g, '') || '-',
        cost: costMatch ? `${costMatch[1]}..${costMatch[2]}` : '-',
        rows: rowsMatch ? rowsMatch[1] : '-',
        time: timeMatch ? timeMatch[2] : '-',
      };
    }
  }

  const mysqlNode = String(row.select_type || row.type || firstText || 'STEP').trim();
  const mysqlEntity = String(row.table || row.key || '-').trim();

  let mysqlCost = '-';
  if (
    row.cost_info &&
    typeof row.cost_info === 'object' &&
    row.cost_info.query_cost !== undefined
  ) {
    mysqlCost = String(row.cost_info.query_cost);
  } else if (row.query_cost !== undefined) {
    mysqlCost = String(row.query_cost);
  }

  const mysqlRows = row.rows !== undefined ? String(row.rows) : '-';

  return {
    ...baseItem,
    node: mysqlNode || '-',
    entity: mysqlEntity || '-',
    cost: mysqlCost,
    rows: mysqlRows,
    time: '-',
  };
};

const mapMysqlJsonToPlanItems = (planJson) => {
  const queryCost =
    planJson?.query_block?.cost_info?.query_cost ??
    planJson?.cost_info?.query_cost ??
    planJson?.query_cost ??
    '-';

  return [
    {
      node: 'JSON PLAN',
      entity: String(planJson?.query_block?.select_id ?? '-'),
      cost: String(queryCost),
      rows: '-',
      time: '-',
      raw: planJson,
    },
  ];
};

const mapExplainRowsToPlanItems = (rows, getFirstValue) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.length === 0) return [];

  const firstValue = getFirstValue(safeRows[0]);
  const firstText = String(firstValue ?? '').trim();

  if (firstText.startsWith('{') || firstText.startsWith('[')) {
    try {
      const parsed = JSON.parse(firstText);
      return mapMysqlJsonToPlanItems(parsed);
    } catch {
      // fall through to row mapper
    }
  }

  return safeRows.map((row) => mapExplainRowToPlanItem(row, getFirstValue));
};

const READ_ONLY_SQL_PATTERN = /^(select|show|describe|desc|explain|with|pragma)\b/i;

const isReadOnlyLikeSql = (sql) => READ_ONLY_SQL_PATTERN.test(String(sql || '').trim());

export default function useWorkspaceSqlActions({
  sqlQuery,
  setIsQueryRunning,
  sqlHistory,
  setSqlHistory,
  executeSql,
  executeSqlTransactionBatch,
  activeDb,
  getFirstValue,
  setSqlResult,
  setQps,
  refreshSchemas,
  ensureDatabaseTablesLoaded,
  activeTable,
  refreshActiveTable,
  setActiveTable,
  showToast,
  t,
  setSqlQuery,
  setSqlSnippets,
  currentDriver,
  transactionDraftActive,
  setTransactionDraftActive,
  transactionDraftStatements,
  setTransactionDraftStatements,
  sqlAbortControllerRef,
}) {
  const abortControllerRef = sqlAbortControllerRef || { current: null };

  const cancelRunningSql = () => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  };

  const runSql = async () => {
    const sql = sqlQuery.trim();
    if (!sql) return;

    if (transactionDraftActive && !isReadOnlyLikeSql(sql)) {
      const nextCount = transactionDraftStatements.length + 1;
      setTransactionDraftStatements((prev) => [...prev, sql]);
      showToast(t('transactionStatementQueued').replace('{count}', String(nextCount)), 'success');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const queryAbortController = new AbortController();
    abortControllerRef.current = queryAbortController;

    setIsQueryRunning(true);

    if (!sqlHistory.includes(sqlQuery)) {
      setSqlHistory((prev) => [sqlQuery, ...prev].slice(0, 15));
    }

    const started = performance.now();
    try {
      const result = await executeSql(sql, activeDb || '', {
        signal: queryAbortController.signal,
      });
      const elapsedSec = ((performance.now() - started) / 1000).toFixed(3);
      setQps((prev) => prev + 1);

      if (result.kind === 'result_set') {
        const resultColumns = (result.columns || Object.keys((result.rows || [])[0] || {})).map(
          (name) => ({ name: String(name) }),
        );
        let plan = null;
        let planCompare = null;
        if (/^(select|with)\b/i.test(sql)) {
          try {
            const explainResult = await executeSql(`EXPLAIN ${sql}`, activeDb || '', {
              signal: queryAbortController.signal,
            });
            plan = mapExplainRowsToPlanItems(explainResult.rows || [], getFirstValue);
          } catch {
            plan = null;
          }

          if (plan && plan.length > 0) {
            try {
              if (currentDriver === 'pgsql') {
                const analyzeResult = await executeSql(
                  `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
                  activeDb || '',
                  {
                    signal: queryAbortController.signal,
                  },
                );
                const actualPlan = mapExplainRowsToPlanItems(analyzeResult.rows || [], getFirstValue);
                if (actualPlan.length > 0) {
                  planCompare = {
                    estimated: plan,
                    actual: actualPlan,
                  };
                }
              } else if (currentDriver === 'mysql') {
                const jsonPlanResult = await executeSql(`EXPLAIN FORMAT=JSON ${sql}`, activeDb || '', {
                  signal: queryAbortController.signal,
                });
                const actualPlan = mapExplainRowsToPlanItems(
                  jsonPlanResult.rows || [],
                  getFirstValue,
                );
                if (actualPlan.length > 0) {
                  planCompare = {
                    estimated: plan,
                    actual: actualPlan,
                  };
                }
              } else if (currentDriver === 'sqlite') {
                const sqlitePlanResult = await executeSql(`EXPLAIN QUERY PLAN ${sql}`, activeDb || '', {
                  signal: queryAbortController.signal,
                });
                const actualPlan = mapExplainRowsToPlanItems(
                  sqlitePlanResult.rows || [],
                  getFirstValue,
                );
                if (actualPlan.length > 0) {
                  planCompare = {
                    estimated: plan,
                    actual: actualPlan,
                  };
                }
              }
            } catch {
              planCompare = null;
            }
          }
        }

        setSqlResult({
          columns: resultColumns,
          data: result.rows || [],
          time: elapsedSec,
          plan,
          planCompare,
        });
      } else {
        setSqlResult(null);
        await refreshSchemas();
        if (activeDb) {
          await ensureDatabaseTablesLoaded(activeDb, { force: true });
        }
        if (activeDb && activeTable) {
          try {
            await refreshActiveTable();
          } catch {
            setActiveTable(null);
          }
        }
      }

      showToast(t('sqlExecuted'), 'success');
    } catch (error) {
      if (error?.name === 'AbortError') {
        showToast(t('sqlCanceled'), 'info');
        return;
      }
      showToast(error.message || 'SQL execution failed.', 'error');
    } finally {
      if (abortControllerRef.current === queryAbortController) {
        abortControllerRef.current = null;
      }
      setIsQueryRunning(false);
    }
  };

  const handleSqlKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSql();
  };

  const beginTransactionDraft = () => {
    if (transactionDraftActive) return;
    setTransactionDraftStatements([]);
    setTransactionDraftActive(true);
    showToast(t('transactionStarted'), 'success');
  };

  const rollbackTransactionDraft = () => {
    if (!transactionDraftActive) return;
    const rolledBackCount = transactionDraftStatements.length;
    setTransactionDraftStatements([]);
    setTransactionDraftActive(false);
    showToast(t('transactionRolledBack').replace('{count}', String(rolledBackCount)), 'success');
  };

  const commitTransactionDraft = async () => {
    if (!transactionDraftActive) return;
    if (transactionDraftStatements.length === 0) {
      showToast(t('transactionEmpty'), 'error');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const queryAbortController = new AbortController();
    abortControllerRef.current = queryAbortController;
    setIsQueryRunning(true);

    try {
      const result = await executeSqlTransactionBatch(transactionDraftStatements, activeDb || '', {
        signal: queryAbortController.signal,
      });
      setQps((prev) => prev + 1);
      setSqlResult(null);

      await refreshSchemas();
      if (activeDb) {
        await ensureDatabaseTablesLoaded(activeDb, { force: true });
      }
      if (activeDb && activeTable) {
        try {
          await refreshActiveTable();
        } catch {
          setActiveTable(null);
        }
      }

      const committedCount = Number(result?.executedStatements || transactionDraftStatements.length);
      setTransactionDraftStatements([]);
      setTransactionDraftActive(false);
      showToast(t('transactionCommitted').replace('{count}', String(committedCount)), 'success');
    } catch (error) {
      if (error?.name === 'AbortError') {
        showToast(t('sqlCanceled'), 'error');
        return;
      }
      showToast(error.message || t('transactionCommitFailed'), 'error');
    } finally {
      if (abortControllerRef.current === queryAbortController) {
        abortControllerRef.current = null;
      }
      setIsQueryRunning(false);
    }
  };

  const formatSql = () => {
    if (!sqlQuery.trim()) return;
    const formatted = sqlQuery
      .replace(
        /\b(select|from|where|insert|update|delete|join|left|right|inner|order by|group by|limit|values|set|into)\b/gi,
        (match) => match.toUpperCase(),
      )
      .replace(
        /\s+(FROM|WHERE|LEFT JOIN|RIGHT JOIN|INNER JOIN|ORDER BY|GROUP BY|LIMIT)\s+/g,
        '\n$1 ',
      )
      .replace(/,\s+/g, ',\n  ');
    setSqlQuery(formatted);
    showToast(t('sqlFormatted'), 'success');
  };

  const saveSnippet = () => {
    if (!sqlQuery.trim()) return;
    const title = prompt('Name:', 'Saved Query');
    if (title) {
      setSqlSnippets((prev) => [{ id: Date.now(), title, query: sqlQuery }, ...prev]);
    }
  };

  return {
    runSql,
    cancelRunningSql,
    beginTransactionDraft,
    commitTransactionDraft,
    rollbackTransactionDraft,
    handleSqlKeyDown,
    formatSql,
    saveSnippet,
  };
}

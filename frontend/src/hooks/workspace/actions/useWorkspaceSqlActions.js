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
  if (row.cost_info && typeof row.cost_info === 'object' && row.cost_info.query_cost !== undefined) {
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

export default function useWorkspaceSqlActions({
  sqlQuery,
  setIsQueryRunning,
  sqlHistory,
  setSqlHistory,
  executeSql,
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
}) {
  const runSql = async () => {
    const sql = sqlQuery.trim();
    if (!sql) return;
    setIsQueryRunning(true);

    if (!sqlHistory.includes(sqlQuery)) {
      setSqlHistory((prev) => [sqlQuery, ...prev].slice(0, 15));
    }

    const started = performance.now();
    try {
      const result = await executeSql(sql, activeDb || '');
      const elapsedSec = ((performance.now() - started) / 1000).toFixed(3);
      setQps((prev) => prev + 1);

      if (result.kind === 'result_set') {
        const resultColumns = (result.columns || Object.keys((result.rows || [])[0] || {})).map(
          (name) => ({ name: String(name) }),
        );
        let plan = null;
        if (/^(select|with)\b/i.test(sql)) {
          try {
            const explainResult = await executeSql(`EXPLAIN ${sql}`, activeDb || '');
            plan = (explainResult.rows || []).map((row) => mapExplainRowToPlanItem(row, getFirstValue));
          } catch {
            plan = null;
          }
        }

        setSqlResult({
          columns: resultColumns,
          data: result.rows || [],
          time: elapsedSec,
          plan,
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
      showToast(error.message || 'SQL execution failed.', 'error');
    } finally {
      setIsQueryRunning(false);
    }
  };

  const handleSqlKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSql();
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
    handleSqlKeyDown,
    formatSql,
    saveSnippet,
  };
}

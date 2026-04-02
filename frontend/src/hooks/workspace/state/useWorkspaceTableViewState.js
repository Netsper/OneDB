import { useMemo } from 'react';
import { generateSchemaDDL } from '../../../utils/schema.js';

export default function useWorkspaceTableViewState({
  currentTableData,
  currentDriver,
  activeTable,
  hiddenColumns,
  setHiddenColumns,
  sortConfig,
  setSortConfig,
  selectedRows,
  setSelectedRows,
  rowsPerPage,
  copyToClipboard,
  getCellTextValue,
}) {
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const currentTableDdl = useMemo(
    () =>
      currentTableData
        ? generateSchemaDDL({
            driver: currentDriver,
            tableName: activeTable,
            tableType: currentTableData.type,
            columns: currentTableData.columns,
          })
        : '',
    [activeTable, currentDriver, currentTableData],
  );

  const visibleColumns = useMemo(() => {
    if (!currentTableData) return [];
    return currentTableData.columns.filter((col) => !hiddenColumns.has(col.name));
  }, [currentTableData, hiddenColumns]);

  const copyRowWithHeaders = (row) => {
    if (!row || !currentTableData) return;
    const text = visibleColumns
      .map((col) => `${col.name}: ${getCellTextValue(row[col.name])}`)
      .join('\n');
    copyToClipboard(text);
  };

  const toggleColumnVisibility = (colName) => {
    setHiddenColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(colName)) newSet.delete(colName);
      else newSet.add(colName);
      return newSet;
    });
  };

  const processedData = useMemo(() => currentTableData?.data || [], [currentTableData]);

  const paginatedData = useMemo(() => processedData, [processedData]);

  const totalPages = Math.max(1, Math.ceil(Number(currentTableData?.rowCount || 0) / rowsPerPage));

  const toggleRowSelection = (origIndex) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(origIndex)) newSet.delete(origIndex);
    else newSet.add(origIndex);
    setSelectedRows(newSet);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === paginatedData.length && paginatedData.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((r) => r._origIndex)));
    }
  };

  return {
    handleSort,
    currentTableDdl,
    visibleColumns,
    copyRowWithHeaders,
    toggleColumnVisibility,
    processedData,
    paginatedData,
    totalPages,
    toggleRowSelection,
    toggleAllRows,
  };
}

import { useMemo } from 'react';

export const mapColumnTypeForDriver = (type, currentDriver) => {
  if (currentDriver !== 'pgsql') return type;
  const lower = String(type || '').toLowerCase();
  if (lower === 'int(11)') return 'INTEGER';
  if (lower === 'tinyint(1)') return 'BOOLEAN';
  if (lower === 'datetime') return 'TIMESTAMP';
  return type;
};

export const buildColumnDefaultSql = (defaultRaw, escapeLiteral) => {
  if (defaultRaw === '') return '';
  const isRawDefault = /^(CURRENT_TIMESTAMP|NOW\(\)|\d+(\.\d+)?)$/i.test(defaultRaw);
  return ` DEFAULT ${isRawDefault ? defaultRaw : escapeLiteral(defaultRaw)}`;
};

export default function useWorkspaceDataActions({
  currentTableData,
  activeTable,
  activeDb,
  databases,
  currentDriver,
  modalConfig,
  formData,
  setModalConfig,
  setSelectedRows,
  setEditingCell,
  newColForm,
  setNewColForm,
  inputVal,
  setInputVal,
  dbCollation,
  executeSql,
  refreshActiveTable,
  refreshSchemas,
  ensureDatabaseTablesLoaded,
  setActiveDb,
  setActiveTable,
  setLoadedTableDbs,
  setExpandedDbs,
  setExpandedGroups,
  selectDbAndTable,
  quoteIdentifier,
  escapeLiteral,
  showToast,
  t,
  setContextMenu,
}) {
  const saveInlineEdit = async (editingCell) => {
    if (!editingCell || !currentTableData || !activeTable) return;
    const colDef = currentTableData.columns.find((c) => c.name === editingCell.colName);
    if (
      colDef &&
      (colDef.type.includes('int') || colDef.type.includes('decimal')) &&
      editingCell.value !== '' &&
      isNaN(Number(editingCell.value))
    ) {
      showToast(t('mustBeNumber').replace('{col}', editingCell.colName), 'error');
      setEditingCell(null);
      return;
    }

    const targetRow = currentTableData.data[editingCell.rowIndex];
    if (!targetRow) {
      setEditingCell(null);
      return;
    }

    if (String(targetRow[editingCell.colName]) === String(editingCell.value)) {
      setEditingCell(null);
      return;
    }

    const pkCol = currentTableData.columns.find((c) => c.isPrimary);
    if (!pkCol) {
      showToast('Primary key is required for inline update.', 'error');
      setEditingCell(null);
      return;
    }

    try {
      const sql = `UPDATE ${quoteIdentifier(activeTable)} SET ${quoteIdentifier(editingCell.colName)} = ${escapeLiteral(editingCell.value === '' ? null : editingCell.value)} WHERE ${quoteIdentifier(pkCol.name)} = ${escapeLiteral(targetRow[pkCol.name])};`;
      await executeSql(sql);
      await refreshActiveTable();
      showToast(t('recordUpdated'), 'success');
    } catch (error) {
      showToast(error.message || 'Update failed.', 'error');
    } finally {
      setEditingCell(null);
    }
  };

  const handleBulkDelete = async (selectedRows) => {
    if (!currentTableData || !activeTable || selectedRows.size === 0) return;
    if (!confirm(t('confirmBulkDelete').replace('{count}', selectedRows.size))) return;

    const pkCol = currentTableData.columns.find((c) => c.isPrimary);
    if (!pkCol) {
      showToast('Primary key is required for bulk delete.', 'error');
      return;
    }

    const pkValues = Array.from(selectedRows)
      .map((idx) => currentTableData.data[idx]?.[pkCol.name])
      .filter((v) => v !== undefined);

    if (pkValues.length === 0) return;

    try {
      const inClause = pkValues.map((v) => escapeLiteral(v)).join(', ');
      const sql = `DELETE FROM ${quoteIdentifier(activeTable)} WHERE ${quoteIdentifier(pkCol.name)} IN (${inClause});`;
      await executeSql(sql);
      await refreshActiveTable();
      setSelectedRows(new Set());
      showToast(t('recordDeleted'), 'success');
    } catch (error) {
      showToast(error.message || 'Delete failed.', 'error');
    }
  };

  const handleDeleteRow = async (origIndex) => {
    if (!currentTableData || !activeTable) return;
    if (!confirm(t('confirmDelete'))) return;

    const pkCol = currentTableData.columns.find((c) => c.isPrimary);
    if (!pkCol) {
      showToast('Primary key is required for delete.', 'error');
      return;
    }

    const row = currentTableData.data[origIndex];
    if (!row) return;

    try {
      const sql = `DELETE FROM ${quoteIdentifier(activeTable)} WHERE ${quoteIdentifier(pkCol.name)} = ${escapeLiteral(row[pkCol.name])};`;
      await executeSql(sql);
      await refreshActiveTable();
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(origIndex);
        return next;
      });
      showToast(t('recordDeleted'), 'success');
    } catch (error) {
      showToast(error.message || 'Delete failed.', 'error');
    }
  };

  const handleCloneRow = async (origIndex) => {
    if (!currentTableData || !activeTable) return;
    const rowToClone = currentTableData.data[origIndex];
    if (!rowToClone) return;

    const insertCols = currentTableData.columns.filter((col) => {
      const isAutoPk =
        col.isPrimary &&
        String(col.extra || '')
          .toLowerCase()
          .includes('auto_increment');
      return !isAutoPk;
    });

    if (insertCols.length === 0) {
      showToast('No insertable columns found.', 'error');
      return;
    }

    try {
      const colSql = insertCols.map((col) => quoteIdentifier(col.name)).join(', ');
      const valSql = insertCols.map((col) => escapeLiteral(rowToClone[col.name])).join(', ');
      await executeSql(
        `INSERT INTO ${quoteIdentifier(activeTable)} (${colSql}) VALUES (${valSql});`,
      );
      await refreshActiveTable();
      showToast(t('recordAdded'), 'success');
    } catch (error) {
      showToast(error.message || 'Clone failed.', 'error');
    }
  };

  const handleTruncateTable = async (dbName, tableName) => {
    if (!confirm(t('confirmTruncate').replace('{name}', tableName))) return;
    try {
      await executeSql(`TRUNCATE TABLE ${quoteIdentifier(tableName)};`, dbName);
      await refreshActiveTable();
      setContextMenu((prev) => ({ ...prev, visible: false }));
    } catch (error) {
      showToast(error.message || 'Truncate failed.', 'error');
    }
  };

  const handleDeleteTable = async (e, dbName, tableName) => {
    if (e) e.stopPropagation();
    if (!confirm(t('confirmTableDrop').replace('{name}', tableName))) return;
    try {
      await executeSql(`DROP TABLE ${quoteIdentifier(tableName)};`, dbName);
      await refreshSchemas();
      await ensureDatabaseTablesLoaded(dbName, { force: true });
      if (activeTable === tableName) setActiveTable(null);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    } catch (error) {
      showToast(error.message || 'Drop table failed.', 'error');
    }
  };

  const handleDuplicateTable = async (dbName, tableName) => {
    let newName = `${tableName}_copy`;
    let suffix = 1;
    while (databases[dbName]?.[newName]) {
      newName = `${tableName}_copy_${suffix}`;
      suffix += 1;
    }

    try {
      if (currentDriver === 'pgsql') {
        await executeSql(
          `CREATE TABLE ${quoteIdentifier(newName)} AS TABLE ${quoteIdentifier(tableName)};`,
          dbName,
        );
      } else {
        await executeSql(
          `CREATE TABLE ${quoteIdentifier(newName)} LIKE ${quoteIdentifier(tableName)};`,
          dbName,
        );
        await executeSql(
          `INSERT INTO ${quoteIdentifier(newName)} SELECT * FROM ${quoteIdentifier(tableName)};`,
          dbName,
        );
      }
      await refreshSchemas();
      await ensureDatabaseTablesLoaded(dbName, { force: true });
      setContextMenu((prev) => ({ ...prev, visible: false }));
    } catch (error) {
      showToast(error.message || 'Duplicate table failed.', 'error');
    }
  };

  const saveRowData = async (e) => {
    e.preventDefault();
    if (!currentTableData || !activeTable) return;

    const submitData = { ...formData };
    delete submitData._origIndex;
    const pkCol = currentTableData.columns.find((c) => c.isPrimary);

    try {
      if (modalConfig.editIndex > -1) {
        const row = currentTableData.data[modalConfig.editIndex];
        if (!row || !pkCol) {
          throw new Error('Primary key is required for update.');
        }

        const updateCols = currentTableData.columns.filter((c) => c.name !== pkCol.name);
        if (updateCols.length === 0) {
          throw new Error('No updatable columns found.');
        }
        const setClause = updateCols
          .map(
            (c) =>
              `${quoteIdentifier(c.name)} = ${escapeLiteral(submitData[c.name] === '' ? null : submitData[c.name])}`,
          )
          .join(', ');

        await executeSql(
          `UPDATE ${quoteIdentifier(activeTable)} SET ${setClause} WHERE ${quoteIdentifier(pkCol.name)} = ${escapeLiteral(row[pkCol.name])};`,
        );
        showToast(t('recordUpdated'), 'success');
      } else {
        const insertCols = currentTableData.columns.filter((col) => {
          const isAutoPk =
            col.isPrimary &&
            String(col.extra || '')
              .toLowerCase()
              .includes('auto_increment');
          return !isAutoPk;
        });
        if (insertCols.length === 0) {
          throw new Error('No insertable columns found.');
        }
        const colSql = insertCols.map((c) => quoteIdentifier(c.name)).join(', ');
        const valSql = insertCols
          .map((c) => escapeLiteral(submitData[c.name] === '' ? null : submitData[c.name]))
          .join(', ');
        await executeSql(
          `INSERT INTO ${quoteIdentifier(activeTable)} (${colSql}) VALUES (${valSql});`,
        );
        showToast(t('recordAdded'), 'success');
      }

      await refreshActiveTable();
      setModalConfig({ isOpen: false, type: null });
    } catch (error) {
      showToast(error.message || 'Save failed.', 'error');
    }
  };

  const relatedDataInfo = useMemo(() => {
    if (!activeDb || !activeTable || modalConfig.editIndex === -1 || !currentTableData) return [];
    const pkCol = currentTableData.columns.find((c) => c.isPrimary);
    if (!pkCol) return [];

    const currentRowPkValue = formData[pkCol.name];
    const related = [];

    Object.keys(databases[activeDb]).forEach((tblName) => {
      if (tblName === activeTable) return;
      const tbl = databases[activeDb][tblName];
      const foreignCol = tbl.columns?.find(
        (c) => c.isForeign && c.foreignTable === activeTable && c.foreignCol === pkCol.name,
      );

      if (foreignCol) {
        const matchingRows = tbl.data.filter(
          (r) => String(r[foreignCol.name]) === String(currentRowPkValue),
        );
        related.push({
          tableName: tblName,
          foreignCol: foreignCol.name,
          rows: matchingRows,
          cols: tbl.columns,
        });
      }
    });

    return related;
  }, [activeDb, activeTable, currentTableData, databases, formData, modalConfig.editIndex]);

  const handleCreateDB = async (e) => {
    e.preventDefault();
    const dbName = inputVal.trim();
    if (!dbName) return;
    if (databases[dbName]) return;
    try {
      if (currentDriver === 'pgsql') {
        await executeSql(`CREATE DATABASE ${quoteIdentifier(dbName)};`, '');
      } else {
        await executeSql(
          `CREATE DATABASE ${quoteIdentifier(dbName)} CHARACTER SET utf8mb4 COLLATE ${dbCollation};`,
          '',
        );
      }
      const dbNames = await refreshSchemas();
      setExpandedDbs((prev) => ({ ...prev, [dbName]: true }));
      setActiveDb(dbNames.includes(dbName) ? dbName : dbNames[0] || null);
      setLoadedTableDbs((prev) => ({ ...prev, [dbName]: false }));
      showToast(t('dbCreated').replace('{name}', dbName), 'success');
      setModalConfig({ isOpen: false, type: null });
      setInputVal('');
    } catch (error) {
      showToast(error.message || 'Create database failed.', 'error');
    }
  };

  const handleDeleteDB = async (e, dbName) => {
    e.stopPropagation();
    if (!confirm(t('confirmDbDrop').replace('{name}', dbName))) return;
    try {
      await executeSql(`DROP DATABASE ${quoteIdentifier(dbName)};`, '');
      const dbNames = await refreshSchemas();
      if (activeDb === dbName) {
        setActiveDb(dbNames[0] || null);
        setActiveTable(null);
      }
    } catch (error) {
      showToast(error.message || 'Drop database failed.', 'error');
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    const tableName = inputVal.trim();
    if (!tableName) return;
    const targetDb = modalConfig.data?.dbName || activeDb;
    if (!targetDb || databases[targetDb]?.[tableName]) return;

    try {
      if (currentDriver === 'pgsql') {
        await executeSql(
          `CREATE TABLE ${quoteIdentifier(tableName)} (id BIGSERIAL PRIMARY KEY);`,
          targetDb,
        );
      } else {
        await executeSql(
          `CREATE TABLE ${quoteIdentifier(tableName)} (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
          targetDb,
        );
      }
      await refreshSchemas();
      await ensureDatabaseTablesLoaded(targetDb, { force: true });
      setExpandedDbs((prev) => ({ ...prev, [targetDb]: true }));
      setExpandedGroups((prev) => ({ ...prev, [`${targetDb}_tables`]: true }));
      await selectDbAndTable(targetDb, tableName);
      showToast(t('tableCreated').replace('{name}', tableName), 'success');
      setModalConfig({ isOpen: false, type: null });
      setInputVal('');
    } catch (error) {
      showToast(error.message || 'Create table failed.', 'error');
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColForm.name.trim() || !activeTable || !currentTableData) return;
    if (currentTableData.columns.find((c) => c.name === newColForm.name)) return;

    const nullable = newColForm.nullable === 'Evet' || newColForm.nullable === 'Yes';
    const mappedType = mapColumnTypeForDriver(newColForm.type, currentDriver);
    const defaultRaw = newColForm.default.trim();
    const defaultSql = buildColumnDefaultSql(defaultRaw, escapeLiteral);

    const sql = `ALTER TABLE ${quoteIdentifier(activeTable)} ADD COLUMN ${quoteIdentifier(newColForm.name)} ${mappedType}${nullable ? '' : ' NOT NULL'}${defaultSql};`;

    try {
      await executeSql(sql);
      await refreshActiveTable();
      showToast(t('colAdded').replace('{name}', newColForm.name), 'success');
      setModalConfig({ isOpen: false, type: null });
      setNewColForm({ name: '', type: 'varchar(255)', nullable: 'Yes', default: '' });
    } catch (error) {
      showToast(error.message || 'Add column failed.', 'error');
    }
  };

  const handleDropColumn = async (columnName) => {
    const targetColumn = String(columnName || '').trim();
    if (!targetColumn || !activeTable || !currentTableData) return;

    const column = currentTableData.columns.find((entry) => entry.name === targetColumn);
    if (!column) return;

    if (!confirm(`Drop column "${targetColumn}" from "${activeTable}"?`)) {
      return;
    }

    try {
      await executeSql(
        `ALTER TABLE ${quoteIdentifier(activeTable)} DROP COLUMN ${quoteIdentifier(targetColumn)};`,
      );
      await refreshActiveTable();
      showToast(`Column "${targetColumn}" dropped.`, 'success');
    } catch (error) {
      showToast(error.message || 'Drop column failed.', 'error');
    }
  };

  return {
    saveInlineEdit,
    handleBulkDelete,
    handleDeleteRow,
    handleCloneRow,
    handleTruncateTable,
    handleDeleteTable,
    handleDuplicateTable,
    saveRowData,
    relatedDataInfo,
    handleCreateDB,
    handleDeleteDB,
    handleCreateTable,
    handleAddColumn,
    handleDropColumn,
  };
}

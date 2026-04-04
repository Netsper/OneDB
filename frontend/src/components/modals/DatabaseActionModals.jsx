import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Bookmark,
  Database,
  FileDown,
  GitBranch,
  History,
  ListChecks,
  ListTree,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import SelectField from '../shared/SelectField.jsx';
import SearchableSelectField from '../shared/SearchableSelectField.jsx';

export default function DatabaseActionModals({
  modalConfig,
  setModalConfig,
  t,
  tc,
  inputVal,
  setInputVal,
  activeDb,
  databaseNames,
  currentDriver,
  executeSql,
  dbCharset,
  setDbCharset,
  dbCollation,
  setDbCollation,
  baseSelectClass,
  handleCreateDB,
  handleCreateTable,
  newColForm,
  setNewColForm,
  handleAddColumn,
  historyTab,
  setHistoryTab,
  sqlHistory,
  sqlSnippets,
  setSqlSnippets,
  setSqlQuery,
  isImportModalOpen,
  closeImportModal,
  importFileInputRef,
  importAccept,
  handleImportFileInputChange,
  openImportFilePicker,
  handleImportDragOver,
  handleImportDragLeave,
  handleImportDrop,
  isImporting,
  isImportDragActive,
  importDropLabel,
  importFormatHint,
  isImportLimitsLoading,
  importLimitsError,
  importLimitsRows,
  handleExportTable,
  handleExportDatabaseSql,
}) {
  const isMysql = currentDriver === 'mysql';
  const isCreateDbModalOpen = modalConfig.isOpen && modalConfig.type === 'create_db';

  const [isCharsetLoading, setIsCharsetLoading] = useState(false);
  const [isCollationLoading, setIsCollationLoading] = useState(false);
  const [charsetOptions, setCharsetOptions] = useState([
    { value: 'utf8mb4', label: 'utf8mb4' },
    { value: 'utf8', label: 'utf8' },
  ]);
  const [collationOptions, setCollationOptions] = useState([
    { value: 'utf8mb4_general_ci', label: 'utf8mb4_general_ci' },
    { value: 'utf8mb4_unicode_ci', label: 'utf8mb4_unicode_ci' },
  ]);

  const [dbAdminData, setDbAdminData] = useState({
    loading: false,
    error: '',
    rows: [],
  });
  const [schemaDiffSourceDb, setSchemaDiffSourceDb] = useState('');
  const [schemaDiffTargetDb, setSchemaDiffTargetDb] = useState('');
  const [schemaDiffData, setSchemaDiffData] = useState({
    loading: false,
    error: '',
    summary: null,
    tablesAdded: [],
    tablesRemoved: [],
    tablesChanged: [],
  });
  const [erdDb, setErdDb] = useState('');
  const [erdData, setErdData] = useState({
    loading: false,
    error: '',
    tables: [],
    relationships: [],
  });

  const dbAdminModalMap = useMemo(
    () => ({
      db_privileges: {
        title: t('privilegesTab') || 'Privileges',
        icon: ShieldCheck,
        sql: 'SHOW GRANTS FOR CURRENT_USER;',
      },
      db_process_list: {
        title: t('processListTab') || 'Process list',
        icon: ListChecks,
        sql: 'SHOW FULL PROCESSLIST;',
      },
      db_variables: {
        title: t('variablesTab') || 'Variables',
        icon: SlidersHorizontal,
        sql: 'SHOW VARIABLES;',
      },
      db_status: {
        title: t('statusTab') || 'Status',
        icon: ListTree,
        sql: 'SHOW STATUS;',
      },
      db_schema_diff: {
        title: t('schemaDiffTab') || 'Schema diff',
        icon: ArrowLeftRight,
        sql: '',
      },
      db_erd: {
        title: t('erdTab') || 'ERD',
        icon: GitBranch,
        sql: '',
      },
    }),
    [t],
  );

  const activeDbAdminConfig = dbAdminModalMap[modalConfig.type] || null;
  const isDbAdminModalOpen = modalConfig.isOpen && Boolean(activeDbAdminConfig);
  const isSchemaDiffModalOpen = modalConfig.isOpen && modalConfig.type === 'db_schema_diff';
  const isErdModalOpen = modalConfig.isOpen && modalConfig.type === 'db_erd';

  const fallbackCharsetList = useMemo(
    () => [
      'armscii8',
      'ascii',
      'big5',
      'binary',
      'cp1250',
      'cp1251',
      'cp1256',
      'cp1257',
      'cp850',
      'cp852',
      'cp866',
      'cp932',
      'dec8',
      'eucjpms',
      'euckr',
      'gb18030',
      'gb2312',
      'gbk',
      'geostd8',
      'greek',
      'hebrew',
      'hp8',
      'keybcs2',
      'koi8r',
      'koi8u',
      'latin1',
      'latin2',
      'latin5',
      'latin7',
      'macce',
      'macroman',
      'sjis',
      'swe7',
      'tis620',
      'ucs2',
      'ujis',
      'utf16',
      'utf16le',
      'utf32',
      'utf8',
      'utf8mb3',
      'utf8mb4',
    ],
    [],
  );

  const fallbackCollationByCharset = useMemo(
    () => ({
      utf8mb4: ['utf8mb4_0900_ai_ci', 'utf8mb4_unicode_ci', 'utf8mb4_general_ci'],
      utf8: ['utf8_unicode_ci', 'utf8_general_ci'],
      utf8mb3: ['utf8mb3_unicode_ci', 'utf8mb3_general_ci'],
      latin1: ['latin1_swedish_ci', 'latin1_general_ci'],
    }),
    [],
  );

  const getFirstPresentValue = useCallback((row, keys) => {
    if (!row || typeof row !== 'object') return '';
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  }, []);

  const normalizeResultRows = useCallback((result) => {
    if (!result) return [];
    if (Array.isArray(result.rows)) return result.rows;
    if (Array.isArray(result.data)) return result.data;
    return [];
  }, []);

  const adminRows = useMemo(
    () => (Array.isArray(dbAdminData.rows) ? dbAdminData.rows : []),
    [dbAdminData.rows],
  );
  const adminColumns = useMemo(
    () => (adminRows[0] && typeof adminRows[0] === 'object' ? Object.keys(adminRows[0]) : []),
    [adminRows],
  );

  const loadAvailableCharsets = useCallback(async () => {
    if (!isMysql) return;
    setIsCharsetLoading(true);
    try {
      const result = await executeSql('SHOW CHARACTER SET;', activeDb || '');
      const rows = normalizeResultRows(result);
      const options = rows
        .map((row) => ({
          value: getFirstPresentValue(row, ['Charset', 'charset']),
          label: getFirstPresentValue(row, ['Charset', 'charset']),
        }))
        .filter((entry) => entry.value !== '');
      const uniqueOptions =
        options.length > 0
          ? Array.from(new Map(options.map((entry) => [entry.value, entry])).values())
          : fallbackCharsetList.map((name) => ({ value: name, label: name }));
      setCharsetOptions(uniqueOptions);
      if (!uniqueOptions.some((entry) => entry.value === dbCharset)) {
        setDbCharset(uniqueOptions[0]?.value || 'utf8mb4');
      }
    } catch {
      const options = fallbackCharsetList.map((name) => ({ value: name, label: name }));
      setCharsetOptions(options);
      if (!options.some((entry) => entry.value === dbCharset)) {
        setDbCharset(options[0]?.value || 'utf8mb4');
      }
    } finally {
      setIsCharsetLoading(false);
    }
  }, [
    activeDb,
    dbCharset,
    executeSql,
    fallbackCharsetList,
    getFirstPresentValue,
    isMysql,
    normalizeResultRows,
    setDbCharset,
  ]);

  const loadCollationsForCharset = useCallback(async (charset) => {
    if (!isMysql || !charset) return;
    setIsCollationLoading(true);
    try {
      const safeCharset = String(charset).replace(/'/g, "''");
      const result = await executeSql(`SHOW COLLATION WHERE Charset = '${safeCharset}';`, activeDb || '');
      const rows = normalizeResultRows(result);
      const options = rows
        .map((row) => {
          const name = getFirstPresentValue(row, ['Collation', 'collation']);
          if (!name) return null;
          const isDefault = String(row.Default ?? row.default ?? '').toLowerCase();
          return {
            value: name,
            label: isDefault === 'yes' ? `${name} (default)` : name,
          };
        })
        .filter(Boolean);
      const uniqueOptions =
        options.length > 0
          ? Array.from(new Map(options.map((entry) => [entry.value, entry])).values())
          : (fallbackCollationByCharset[charset] || [`${charset}_general_ci`]).map((name) => ({
              value: name,
              label: name,
            }));
      setCollationOptions(uniqueOptions);
      if (!uniqueOptions.some((entry) => entry.value === dbCollation)) {
        setDbCollation(uniqueOptions[0]?.value || '');
      }
    } catch {
      const fallbackOptions = (fallbackCollationByCharset[charset] || [`${charset}_general_ci`]).map(
        (name) => ({ value: name, label: name }),
      );
      setCollationOptions(fallbackOptions);
      if (!fallbackOptions.some((entry) => entry.value === dbCollation)) {
        setDbCollation(fallbackOptions[0]?.value || '');
      }
    } finally {
      setIsCollationLoading(false);
    }
  }, [
    activeDb,
    dbCollation,
    executeSql,
    fallbackCollationByCharset,
    getFirstPresentValue,
    isMysql,
    normalizeResultRows,
    setDbCollation,
  ]);

  const loadDbAdminData = useCallback(async () => {
    if (!isMysql || !activeDbAdminConfig?.sql) return;
    setDbAdminData({ loading: true, error: '', rows: [] });
    try {
      const result = await executeSql(activeDbAdminConfig.sql, activeDb || '');
      const rows = normalizeResultRows(result);
      setDbAdminData({ loading: false, error: '', rows });
    } catch (error) {
      setDbAdminData({
        loading: false,
        error: error?.message || t('loadFailed') || 'Failed to load data.',
        rows: [],
      });
    }
  }, [activeDb, activeDbAdminConfig, executeSql, isMysql, normalizeResultRows, t]);

  const buildSchemaSnapshot = useCallback(
    async (databaseName) => {
      const tableMap = new Map();

      if (currentDriver === 'mysql') {
        const [tableResult, columnResult] = await Promise.all([
          executeSql(
            `
            SELECT
              TABLE_NAME AS table_name,
              TABLE_TYPE AS table_type
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            ORDER BY TABLE_NAME;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              TABLE_NAME AS table_name,
              COLUMN_NAME AS column_name,
              COLUMN_TYPE AS column_type,
              IS_NULLABLE AS is_nullable,
              COLUMN_DEFAULT AS column_default,
              EXTRA AS extra,
              COLUMN_KEY AS column_key
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
            `,
            databaseName,
          ),
        ]);

        const tableRows = normalizeResultRows(tableResult);
        const columnRows = normalizeResultRows(columnResult);

        tableRows.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          if (!tableName) return;
          const rawType = String(row.table_type || '').toLowerCase();
          tableMap.set(tableName, {
            type: rawType.includes('view') ? 'view' : 'table',
            columns: new Map(),
          });
        });

        columnRows.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          const columnName = String(row.column_name || '').trim();
          if (!tableName || !columnName) return;
          if (!tableMap.has(tableName)) {
            tableMap.set(tableName, { type: 'table', columns: new Map() });
          }
          const tableEntry = tableMap.get(tableName);
          tableEntry.columns.set(columnName, {
            dataType: String(row.column_type || '').trim(),
            nullable: String(row.is_nullable || '').toLowerCase() === 'yes',
            defaultValue:
              row.column_default == null ? null : String(row.column_default),
            extra: String(row.extra || '').trim(),
            key: String(row.column_key || '').trim(),
          });
        });
      } else if (currentDriver === 'pgsql') {
        const [tableResult, columnResult] = await Promise.all([
          executeSql(
            `
            SELECT
              table_name,
              table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type IN ('BASE TABLE', 'VIEW')
            ORDER BY table_name;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              table_name,
              column_name,
              data_type,
              udt_name,
              is_nullable,
              column_default,
              character_maximum_length,
              numeric_precision,
              numeric_scale
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
            `,
            databaseName,
          ),
        ]);

        const tableRows = normalizeResultRows(tableResult);
        const columnRows = normalizeResultRows(columnResult);

        tableRows.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          if (!tableName) return;
          const rawType = String(row.table_type || '').toLowerCase();
          tableMap.set(tableName, {
            type: rawType.includes('view') ? 'view' : 'table',
            columns: new Map(),
          });
        });

        columnRows.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          const columnName = String(row.column_name || '').trim();
          if (!tableName || !columnName) return;
          if (!tableMap.has(tableName)) {
            tableMap.set(tableName, { type: 'table', columns: new Map() });
          }

          const charLength = Number(row.character_maximum_length);
          const numericPrecision = Number(row.numeric_precision);
          const numericScale = Number(row.numeric_scale);
          const rawDataType = String(row.data_type || '').trim();
          let dataType = rawDataType;
          if (Number.isFinite(charLength) && charLength > 0) {
            dataType = `${rawDataType}(${charLength})`;
          } else if (Number.isFinite(numericPrecision) && numericPrecision > 0) {
            dataType = Number.isFinite(numericScale) && numericScale >= 0
              ? `${rawDataType}(${numericPrecision},${numericScale})`
              : `${rawDataType}(${numericPrecision})`;
          } else if (!dataType) {
            dataType = String(row.udt_name || '').trim();
          }

          const tableEntry = tableMap.get(tableName);
          tableEntry.columns.set(columnName, {
            dataType,
            nullable: String(row.is_nullable || '').toLowerCase() === 'yes',
            defaultValue:
              row.column_default == null ? null : String(row.column_default),
            extra: '',
            key: '',
          });
        });
      } else if (currentDriver === 'sqlite') {
        const tableResult = await executeSql(
          `
          SELECT
            name,
            type
          FROM sqlite_master
          WHERE type IN ('table', 'view')
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name;
          `,
          databaseName,
        );
        const tableRows = normalizeResultRows(tableResult);
        for (const row of tableRows) {
          const tableName = String(row.name || '').trim();
          if (!tableName) continue;
          const tableType = String(row.type || '').toLowerCase() === 'view' ? 'view' : 'table';
          const escapedTable = tableName.replace(/"/g, '""');
          const columnResult = await executeSql(`PRAGMA table_info("${escapedTable}");`, databaseName);
          const columnRows = normalizeResultRows(columnResult);
          const columns = new Map();
          columnRows.forEach((columnRow) => {
            const columnName = String(columnRow.name || '').trim();
            if (!columnName) return;
            columns.set(columnName, {
              dataType: String(columnRow.type || '').trim(),
              nullable: Number(columnRow.notnull || 0) !== 1,
              defaultValue:
                columnRow.dflt_value == null ? null : String(columnRow.dflt_value),
              extra: '',
              key: Number(columnRow.pk || 0) === 1 ? 'PRI' : '',
            });
          });
          tableMap.set(tableName, { type: tableType, columns });
        }
      } else {
        throw new Error(t('schemaDiffDriverUnsupported') || 'Schema diff is not supported for this driver.');
      }

      const normalizedTables = {};
      Array.from(tableMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([tableName, value]) => {
          const normalizedColumns = {};
          Array.from(value.columns.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([columnName, columnSignature]) => {
              normalizedColumns[columnName] = columnSignature;
            });
          normalizedTables[tableName] = {
            type: value.type,
            columns: normalizedColumns,
          };
        });

      return {
        databaseName,
        tables: normalizedTables,
      };
    },
    [currentDriver, executeSql, normalizeResultRows, t],
  );

  const compareSchemaSnapshots = useCallback((leftSnapshot, rightSnapshot) => {
    const leftTables = leftSnapshot?.tables || {};
    const rightTables = rightSnapshot?.tables || {};
    const leftNames = Object.keys(leftTables);
    const rightNames = Object.keys(rightTables);

    const tablesAdded = rightNames.filter((name) => !leftTables[name]).sort((a, b) => a.localeCompare(b));
    const tablesRemoved = leftNames.filter((name) => !rightTables[name]).sort((a, b) => a.localeCompare(b));

    const commonNames = leftNames.filter((name) => rightTables[name]).sort((a, b) => a.localeCompare(b));
    const tablesChanged = [];

    const diffFields = ['dataType', 'nullable', 'defaultValue', 'extra', 'key'];

    commonNames.forEach((tableName) => {
      const leftTable = leftTables[tableName];
      const rightTable = rightTables[tableName];
      const leftColumns = leftTable?.columns || {};
      const rightColumns = rightTable?.columns || {};

      const columnsAdded = Object.keys(rightColumns)
        .filter((columnName) => !leftColumns[columnName])
        .sort((a, b) => a.localeCompare(b));
      const columnsRemoved = Object.keys(leftColumns)
        .filter((columnName) => !rightColumns[columnName])
        .sort((a, b) => a.localeCompare(b));

      const changedColumns = [];
      Object.keys(leftColumns)
        .filter((columnName) => rightColumns[columnName])
        .sort((a, b) => a.localeCompare(b))
        .forEach((columnName) => {
          const leftColumn = leftColumns[columnName];
          const rightColumn = rightColumns[columnName];
          const changedProps = diffFields
            .map((field) => {
              const leftValue = leftColumn[field] == null ? null : String(leftColumn[field]);
              const rightValue = rightColumn[field] == null ? null : String(rightColumn[field]);
              if (leftValue === rightValue) return null;
              return {
                field,
                before: leftColumn[field],
                after: rightColumn[field],
              };
            })
            .filter(Boolean);
          if (changedProps.length > 0) {
            changedColumns.push({
              name: columnName,
              changedProps,
            });
          }
        });

      const tableTypeChanged = leftTable?.type !== rightTable?.type;
      if (!tableTypeChanged && columnsAdded.length === 0 && columnsRemoved.length === 0 && changedColumns.length === 0) {
        return;
      }

      tablesChanged.push({
        table: tableName,
        tableTypeChanged,
        beforeType: leftTable?.type || 'table',
        afterType: rightTable?.type || 'table',
        columnsAdded,
        columnsRemoved,
        changedColumns,
      });
    });

    const summary = {
      tablesAdded: tablesAdded.length,
      tablesRemoved: tablesRemoved.length,
      tablesChanged: tablesChanged.length,
      columnsAdded: tablesChanged.reduce((sum, item) => sum + item.columnsAdded.length, 0),
      columnsRemoved: tablesChanged.reduce((sum, item) => sum + item.columnsRemoved.length, 0),
      columnsChanged: tablesChanged.reduce((sum, item) => sum + item.changedColumns.length, 0),
    };

    return {
      summary,
      tablesAdded,
      tablesRemoved,
      tablesChanged,
    };
  }, []);

  const buildErdSnapshot = useCallback(
    async (databaseName) => {
      if (!databaseName) {
        return { tables: [], relationships: [] };
      }

      if (currentDriver === 'mysql') {
        const [tablesResult, columnsResult, foreignResult] = await Promise.all([
          executeSql(
            `
            SELECT
              TABLE_NAME AS table_name,
              TABLE_TYPE AS table_type
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            ORDER BY TABLE_NAME;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              TABLE_NAME AS table_name,
              COLUMN_NAME AS column_name,
              COLUMN_TYPE AS data_type,
              COLUMN_KEY AS column_key
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              CONSTRAINT_NAME AS constraint_name,
              TABLE_NAME AS table_name,
              COLUMN_NAME AS column_name,
              REFERENCED_TABLE_NAME AS referenced_table_name,
              REFERENCED_COLUMN_NAME AS referenced_column_name
            FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND referenced_table_name IS NOT NULL
            ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;
            `,
            databaseName,
          ),
        ]);

        const tables = normalizeResultRows(tablesResult);
        const columns = normalizeResultRows(columnsResult);
        const relations = normalizeResultRows(foreignResult);
        return { tables, columns, relations };
      }

      if (currentDriver === 'pgsql') {
        const [tablesResult, columnsResult, foreignResult] = await Promise.all([
          executeSql(
            `
            SELECT
              table_name,
              table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type IN ('BASE TABLE', 'VIEW')
            ORDER BY table_name;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              c.table_name AS table_name,
              c.column_name AS column_name,
              c.data_type AS data_type,
              CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END AS column_key
            FROM information_schema.columns c
            LEFT JOIN (
              SELECT kcu.table_name, kcu.column_name
              FROM information_schema.table_constraints tc
              INNER JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = 'public'
            ) pk
              ON pk.table_name = c.table_name
             AND pk.column_name = c.column_name
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position;
            `,
            databaseName,
          ),
          executeSql(
            `
            SELECT
              tc.constraint_name AS constraint_name,
              kcu.table_name AS table_name,
              kcu.column_name AS column_name,
              ccu.table_name AS referenced_table_name,
              ccu.column_name AS referenced_column_name
            FROM information_schema.table_constraints tc
            INNER JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            INNER JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            ORDER BY kcu.table_name, tc.constraint_name, kcu.ordinal_position;
            `,
            databaseName,
          ),
        ]);

        const tables = normalizeResultRows(tablesResult);
        const columns = normalizeResultRows(columnsResult);
        const relations = normalizeResultRows(foreignResult);
        return { tables, columns, relations };
      }

      if (currentDriver === 'sqlite') {
        const tablesResult = await executeSql(
          `
          SELECT
            name AS table_name,
            type AS table_type
          FROM sqlite_master
          WHERE type IN ('table', 'view')
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name;
          `,
          databaseName,
        );
        const tableRows = normalizeResultRows(tablesResult);
        const columns = [];
        const relations = [];
        for (const table of tableRows) {
          const tableName = String(table.table_name || '').trim();
          if (!tableName) continue;
          const escaped = tableName.replace(/"/g, '""');
          const columnResult = await executeSql(`PRAGMA table_info("${escaped}");`, databaseName);
          const columnRows = normalizeResultRows(columnResult);
          columnRows.forEach((row) => {
            columns.push({
              table_name: tableName,
              column_name: row.name,
              data_type: row.type,
              column_key: Number(row.pk || 0) === 1 ? 'PRI' : '',
            });
          });

          const relationResult = await executeSql(`PRAGMA foreign_key_list("${escaped}");`, databaseName);
          const relationRows = normalizeResultRows(relationResult);
          relationRows.forEach((row) => {
            relations.push({
              constraint_name: `fk_${tableName}_${row.from || ''}`,
              table_name: tableName,
              column_name: row.from,
              referenced_table_name: row.table,
              referenced_column_name: row.to,
            });
          });
        }

        return { tables: tableRows, columns, relations };
      }

      throw new Error(t('erdDriverUnsupported') || 'ERD is not supported for this driver.');
    },
    [currentDriver, executeSql, normalizeResultRows, t],
  );

  useEffect(() => {
    if (!isCreateDbModalOpen) return;
    if (isMysql) {
      loadAvailableCharsets();
    }
  }, [isCreateDbModalOpen, isMysql, loadAvailableCharsets]);

  useEffect(() => {
    if (!isCreateDbModalOpen || !isMysql) return;
    loadCollationsForCharset(dbCharset);
  }, [isCreateDbModalOpen, isMysql, dbCharset, loadCollationsForCharset]);

  useEffect(() => {
    if (!isSchemaDiffModalOpen) return;
    const names = Array.isArray(databaseNames) ? databaseNames : [];
    const preferredSource = names.includes(activeDb) ? activeDb : names[0] || '';
    const preferredTarget = names.find((name) => name !== preferredSource) || '';
    setSchemaDiffSourceDb(preferredSource);
    setSchemaDiffTargetDb(preferredTarget);
    setSchemaDiffData({
      loading: false,
      error: '',
      summary: null,
      tablesAdded: [],
      tablesRemoved: [],
      tablesChanged: [],
    });
  }, [activeDb, databaseNames, isSchemaDiffModalOpen]);

  useEffect(() => {
    if (!isSchemaDiffModalOpen) return;
    if (!schemaDiffSourceDb || !schemaDiffTargetDb) {
      setSchemaDiffData((prev) => ({
        ...prev,
        loading: false,
        error: t('schemaDiffSelectDatabases') || 'Select source and target databases.',
      }));
      return;
    }
    if (schemaDiffSourceDb === schemaDiffTargetDb) {
      setSchemaDiffData((prev) => ({
        ...prev,
        loading: false,
        error:
          t('schemaDiffSelectDifferentDatabases') ||
          'Source and target databases must be different.',
      }));
      return;
    }

    let cancelled = false;
    const loadDiff = async () => {
      setSchemaDiffData((prev) => ({
        ...prev,
        loading: true,
        error: '',
      }));

      try {
        const [leftSnapshot, rightSnapshot] = await Promise.all([
          buildSchemaSnapshot(schemaDiffSourceDb),
          buildSchemaSnapshot(schemaDiffTargetDb),
        ]);
        if (cancelled) return;
        const compared = compareSchemaSnapshots(leftSnapshot, rightSnapshot);
        setSchemaDiffData({
          loading: false,
          error: '',
          summary: compared.summary,
          tablesAdded: compared.tablesAdded,
          tablesRemoved: compared.tablesRemoved,
          tablesChanged: compared.tablesChanged,
        });
      } catch (error) {
        if (cancelled) return;
        setSchemaDiffData({
          loading: false,
          error:
            error?.message || t('loadFailed') || 'Failed to load data.',
          summary: null,
          tablesAdded: [],
          tablesRemoved: [],
          tablesChanged: [],
        });
      }
    };

    void loadDiff();
    return () => {
      cancelled = true;
    };
  }, [
    buildSchemaSnapshot,
    compareSchemaSnapshots,
    isSchemaDiffModalOpen,
    schemaDiffSourceDb,
    schemaDiffTargetDb,
    t,
  ]);

  useEffect(() => {
    if (!isErdModalOpen) return;
    const names = Array.isArray(databaseNames) ? databaseNames : [];
    const preferred = names.includes(activeDb) ? activeDb : names[0] || '';
    setErdDb(preferred);
    setErdData({
      loading: false,
      error: '',
      tables: [],
      relationships: [],
    });
  }, [activeDb, databaseNames, isErdModalOpen]);

  useEffect(() => {
    if (!isErdModalOpen) return;
    if (!erdDb) {
      setErdData({
        loading: false,
        error: t('erdSelectDatabase') || 'Select a database to render the diagram.',
        tables: [],
        relationships: [],
      });
      return;
    }

    let cancelled = false;
    const loadErd = async () => {
      setErdData((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const snapshot = await buildErdSnapshot(erdDb);
        if (cancelled) return;
        const relationLookup = new Set(
          snapshot.relations.map(
            (row) => `${String(row.table_name || '').trim()}::${String(row.column_name || '').trim()}`,
          ),
        );

        const tablesByName = new Map();
        snapshot.tables.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          if (!tableName) return;
          const rawType = String(row.table_type || '').toLowerCase();
          tablesByName.set(tableName, {
            name: tableName,
            type: rawType.includes('view') ? 'view' : 'table',
            columns: [],
          });
        });

        snapshot.columns.forEach((row) => {
          const tableName = String(row.table_name || '').trim();
          const columnName = String(row.column_name || '').trim();
          if (!tableName || !columnName) return;
          if (!tablesByName.has(tableName)) {
            tablesByName.set(tableName, {
              name: tableName,
              type: 'table',
              columns: [],
            });
          }
          tablesByName.get(tableName).columns.push({
            name: columnName,
            dataType: String(row.data_type || '').trim(),
            isPrimary: String(row.column_key || '').toUpperCase() === 'PRI',
            isForeign: relationLookup.has(`${tableName}::${columnName}`),
          });
        });

        const tables = Array.from(tablesByName.values())
          .map((table) => ({
            ...table,
            columns: table.columns.sort((a, b) => a.name.localeCompare(b.name)),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const relationships = snapshot.relations
          .map((row) => ({
            constraint: String(row.constraint_name || '').trim(),
            fromTable: String(row.table_name || '').trim(),
            fromColumn: String(row.column_name || '').trim(),
            toTable: String(row.referenced_table_name || '').trim(),
            toColumn: String(row.referenced_column_name || '').trim(),
          }))
          .filter((row) => row.fromTable && row.fromColumn && row.toTable && row.toColumn);

        setErdData({
          loading: false,
          error: '',
          tables,
          relationships,
        });
      } catch (error) {
        if (cancelled) return;
        setErdData({
          loading: false,
          error: error?.message || t('loadFailed') || 'Failed to load data.',
          tables: [],
          relationships: [],
        });
      }
    };

    void loadErd();
    return () => {
      cancelled = true;
    };
  }, [buildErdSnapshot, erdDb, isErdModalOpen, t]);

  useEffect(() => {
    if (!isDbAdminModalOpen || isSchemaDiffModalOpen || isErdModalOpen) return;
    if (!isMysql) {
      setDbAdminData({
        loading: false,
        error:
          t('mysqlOnlyAdminTabNotice') ||
          'This section is currently available for MySQL-compatible drivers.',
        rows: [],
      });
      return;
    }
    loadDbAdminData();
  }, [activeDb, activeDbAdminConfig, isDbAdminModalOpen, isErdModalOpen, isMysql, isSchemaDiffModalOpen, loadDbAdminData, t]);

  return (
    <>
      {isCreateDbModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
              <h3 className="text-base font-semibold text-zinc-100">{t('newDatabase')}</h3>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDB} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  {t('dbNamePlaceholder')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />
              </div>

              {isMysql ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      {t('charset') || 'Charset'}
                    </label>
                    <SearchableSelectField
                      value={dbCharset}
                      onChange={setDbCharset}
                      options={charsetOptions}
                      placeholder={t('charset') || 'Charset'}
                      searchPlaceholder={t('search')}
                      emptyLabel={t('noFilterResults')}
                      tc={tc}
                    />
                    {isCharsetLoading ? (
                      <p className="text-[11px] text-zinc-500 mt-2">
                        {t('loadingCharsets') || 'Loading charsets...'}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      {t('collation')}
                    </label>
                    <SearchableSelectField
                      value={dbCollation}
                      onChange={setDbCollation}
                      options={collationOptions}
                      placeholder={t('collation')}
                      searchPlaceholder={t('search')}
                      emptyLabel={t('noFilterResults')}
                      tc={tc}
                    />
                    {isCollationLoading ? (
                      <p className="text-[11px] text-zinc-500 mt-2">
                        {t('loadingCollations') || 'Loading collations...'}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="bg-[#151518] border border-[#333] rounded-lg p-3">
                  <p className="text-xs text-zinc-400">
                    {t('charsetDriverNotice') ||
                      'Charset and collation options are available for MySQL connections.'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDbAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-5xl flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[88vh]">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                {activeDbAdminConfig?.icon ? (
                  <activeDbAdminConfig.icon className="w-4 h-4 text-zinc-300" />
                ) : (
                  <Database className="w-4 h-4 text-zinc-300" />
                )}
                <h3 className="text-base font-semibold text-zinc-100">
                  {activeDbAdminConfig?.title || ''}
                </h3>
              </div>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-auto custom-scrollbar">
              {isErdModalOpen ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-2">
                        {t('selectDb')}
                      </label>
                      <SearchableSelectField
                        value={erdDb}
                        onChange={setErdDb}
                        options={(databaseNames || []).map((name) => ({ value: name, label: name }))}
                        placeholder={t('selectDb')}
                        searchPlaceholder={t('search')}
                        emptyLabel={t('noFilterResults')}
                        tc={tc}
                      />
                    </div>
                    <div className="bg-[#151518] border border-[#333] rounded-md px-3 py-2 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">{t('tables') || 'Tables'}</span>
                      <span className="text-sm font-semibold text-zinc-100">{erdData.tables.length}</span>
                      <span className="text-[11px] text-zinc-500">{t('relationships') || 'Relationships'}</span>
                      <span className="text-sm font-semibold text-zinc-100">{erdData.relationships.length}</span>
                    </div>
                  </div>

                  {erdData.loading ? (
                    <div className="bg-[#151518] border border-[#333] rounded-lg p-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('loading') || 'Loading...'}</span>
                    </div>
                  ) : erdData.error ? (
                    <div className="bg-[#151518] border border-red-500/40 rounded-lg p-4 text-sm text-red-300">
                      {erdData.error}
                    </div>
                  ) : erdData.tables.length === 0 ? (
                    <div className="bg-[#151518] border border-[#333] rounded-lg p-4 text-sm text-zinc-400">
                      {t('noRecords')}
                    </div>
                  ) : (
                    <div className="bg-[#151518] border border-[#333] rounded-lg overflow-hidden">
                      <div className="overflow-auto custom-scrollbar max-h-[64vh]">
                        {(() => {
                          const COLUMN_COUNT = 4;
                          const CARD_WIDTH = 250;
                          const CARD_HEIGHT_BASE = 62;
                          const CARD_HEIGHT_PER_COLUMN = 18;
                          const GAP_X = 56;
                          const GAP_Y = 36;
                          const PADDING = 24;

                          const positions = new Map();
                          let maxX = 0;
                          let maxY = 0;

                          erdData.tables.forEach((table, index) => {
                            const col = index % COLUMN_COUNT;
                            const row = Math.floor(index / COLUMN_COUNT);
                            const height =
                              CARD_HEIGHT_BASE +
                              Math.min(table.columns.length, 10) * CARD_HEIGHT_PER_COLUMN;
                            const x = PADDING + col * (CARD_WIDTH + GAP_X);
                            const y = PADDING + row * (210 + GAP_Y);
                            positions.set(table.name, { x, y, width: CARD_WIDTH, height });
                            maxX = Math.max(maxX, x + CARD_WIDTH);
                            maxY = Math.max(maxY, y + height);
                          });

                          const canvasWidth = maxX + PADDING;
                          const canvasHeight = maxY + PADDING;

                          return (
                            <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
                              <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight}>
                                {erdData.relationships.map((relation, index) => {
                                  const from = positions.get(relation.fromTable);
                                  const to = positions.get(relation.toTable);
                                  if (!from || !to) return null;

                                  const fromOnLeft = from.x <= to.x;
                                  const startX = fromOnLeft ? from.x + from.width : from.x;
                                  const endX = fromOnLeft ? to.x : to.x + to.width;
                                  const startY = from.y + from.height / 2;
                                  const endY = to.y + to.height / 2;
                                  const midX = (startX + endX) / 2;

                                  return (
                                    <path
                                      key={`${relation.fromTable}-${relation.fromColumn}-${relation.toTable}-${relation.toColumn}-${index}`}
                                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                                      fill="none"
                                      stroke="rgba(161,161,170,0.45)"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })}
                              </svg>

                              {erdData.tables.map((table) => {
                                const position = positions.get(table.name);
                                if (!position) return null;
                                return (
                                  <div
                                    key={table.name}
                                    className="absolute rounded-md border border-[#3a3a40] bg-[#101013]/95 backdrop-blur-sm shadow-lg"
                                    style={{
                                      left: position.x,
                                      top: position.y,
                                      width: position.width,
                                      minHeight: position.height,
                                    }}
                                  >
                                    <div className="px-2.5 py-2 border-b border-[#2b2b30] flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-zinc-100 truncate">
                                        {table.name}
                                      </span>
                                      <span className="text-[10px] uppercase text-zinc-500">
                                        {table.type}
                                      </span>
                                    </div>
                                    <div className="px-2.5 py-2 space-y-1.5">
                                      {table.columns.slice(0, 10).map((column) => (
                                        <div key={`${table.name}-${column.name}`} className="text-[11px] text-zinc-300">
                                          <span className="inline-flex items-center gap-1 mr-1.5">
                                            {column.isPrimary ? (
                                              <span className="text-[10px] px-1 rounded border border-amber-500/40 text-amber-300">
                                                PK
                                              </span>
                                            ) : null}
                                            {column.isForeign ? (
                                              <span className="text-[10px] px-1 rounded border border-cyan-500/40 text-cyan-300">
                                                FK
                                              </span>
                                            ) : null}
                                          </span>
                                          <span className="font-medium text-zinc-200">{column.name}</span>
                                          {column.dataType ? (
                                            <span className="text-zinc-500"> · {column.dataType}</span>
                                          ) : null}
                                        </div>
                                      ))}
                                      {table.columns.length > 10 ? (
                                        <div className="text-[10px] text-zinc-500">
                                          +{table.columns.length - 10} {t('columns') || 'columns'}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : isSchemaDiffModalOpen ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-2">
                        {t('schemaDiffSourceDb') || 'Source database'}
                      </label>
                      <SearchableSelectField
                        value={schemaDiffSourceDb}
                        onChange={setSchemaDiffSourceDb}
                        options={(databaseNames || []).map((name) => ({ value: name, label: name }))}
                        placeholder={t('schemaDiffSourceDb') || 'Source database'}
                        searchPlaceholder={t('search')}
                        emptyLabel={t('noFilterResults')}
                        tc={tc}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-2">
                        {t('schemaDiffTargetDb') || 'Target database'}
                      </label>
                      <SearchableSelectField
                        value={schemaDiffTargetDb}
                        onChange={setSchemaDiffTargetDb}
                        options={(databaseNames || []).map((name) => ({ value: name, label: name }))}
                        placeholder={t('schemaDiffTargetDb') || 'Target database'}
                        searchPlaceholder={t('search')}
                        emptyLabel={t('noFilterResults')}
                        tc={tc}
                      />
                    </div>
                  </div>

                  {schemaDiffData.loading ? (
                    <div className="bg-[#151518] border border-[#333] rounded-lg p-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('loading') || 'Loading...'}</span>
                    </div>
                  ) : schemaDiffData.error ? (
                    <div className="bg-[#151518] border border-red-500/40 rounded-lg p-4 text-sm text-red-300">
                      {schemaDiffData.error}
                    </div>
                  ) : (
                    <>
                      {schemaDiffData.summary ? (
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffTablesAdded') || 'Tables +'}
                            </div>
                            <div className="text-sm font-semibold text-emerald-300">
                              {schemaDiffData.summary.tablesAdded}
                            </div>
                          </div>
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffTablesRemoved') || 'Tables -'}
                            </div>
                            <div className="text-sm font-semibold text-red-300">
                              {schemaDiffData.summary.tablesRemoved}
                            </div>
                          </div>
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffTablesChanged') || 'Tables changed'}
                            </div>
                            <div className="text-sm font-semibold text-zinc-200">
                              {schemaDiffData.summary.tablesChanged}
                            </div>
                          </div>
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffColumnsAdded') || 'Columns +'}
                            </div>
                            <div className="text-sm font-semibold text-emerald-300">
                              {schemaDiffData.summary.columnsAdded}
                            </div>
                          </div>
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffColumnsRemoved') || 'Columns -'}
                            </div>
                            <div className="text-sm font-semibold text-red-300">
                              {schemaDiffData.summary.columnsRemoved}
                            </div>
                          </div>
                          <div className="bg-[#151518] border border-[#333] rounded-md p-2">
                            <div className="text-[10px] uppercase text-zinc-500">
                              {t('schemaDiffColumnsChanged') || 'Columns changed'}
                            </div>
                            <div className="text-sm font-semibold text-zinc-200">
                              {schemaDiffData.summary.columnsChanged}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {schemaDiffData.tablesAdded.length === 0 &&
                      schemaDiffData.tablesRemoved.length === 0 &&
                      schemaDiffData.tablesChanged.length === 0 ? (
                        <div className="bg-[#151518] border border-[#333] rounded-lg p-4 text-sm text-zinc-400">
                          {t('schemaDiffNoDiff') || 'No schema differences detected.'}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {schemaDiffData.tablesAdded.length > 0 ? (
                            <div className="bg-[#151518] border border-[#333] rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-emerald-300 mb-2">
                                {t('schemaDiffTablesAdded') || 'Tables added'}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {schemaDiffData.tablesAdded.map((tableName) => (
                                  <span
                                    key={`added-${tableName}`}
                                    className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-200"
                                  >
                                    {tableName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {schemaDiffData.tablesRemoved.length > 0 ? (
                            <div className="bg-[#151518] border border-[#333] rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-red-300 mb-2">
                                {t('schemaDiffTablesRemoved') || 'Tables removed'}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {schemaDiffData.tablesRemoved.map((tableName) => (
                                  <span
                                    key={`removed-${tableName}`}
                                    className="px-2 py-1 rounded border border-red-500/40 bg-red-500/10 text-[11px] text-red-200"
                                  >
                                    {tableName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {schemaDiffData.tablesChanged.length > 0 ? (
                            <div className="bg-[#151518] border border-[#333] rounded-lg overflow-hidden">
                              <div className="px-3 py-2 border-b border-[#2e2e32]">
                                <h4 className="text-xs font-semibold text-zinc-200">
                                  {t('schemaDiffTablesChanged') || 'Tables changed'}
                                </h4>
                              </div>
                              <div className="max-h-[46vh] overflow-auto custom-scrollbar">
                                {schemaDiffData.tablesChanged.map((item) => (
                                  <div
                                    key={`changed-${item.table}`}
                                    className="px-3 py-3 border-b border-[#252529] last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-semibold text-zinc-100">{item.table}</span>
                                      {item.tableTypeChanged ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                          {item.beforeType} → {item.afterType}
                                        </span>
                                      ) : null}
                                    </div>

                                    {item.columnsAdded.length > 0 ? (
                                      <div className="mb-1.5 text-[11px] text-emerald-300">
                                        + {item.columnsAdded.join(', ')}
                                      </div>
                                    ) : null}
                                    {item.columnsRemoved.length > 0 ? (
                                      <div className="mb-1.5 text-[11px] text-red-300">
                                        - {item.columnsRemoved.join(', ')}
                                      </div>
                                    ) : null}
                                    {item.changedColumns.map((column) => (
                                      <div
                                        key={`${item.table}-${column.name}`}
                                        className="mb-1.5 text-[11px] text-zinc-300"
                                      >
                                        <span className="font-semibold text-zinc-100">{column.name}</span>
                                        <span className="text-zinc-500">: </span>
                                        {column.changedProps.map((prop, index) => (
                                          <span key={`${column.name}-${prop.field}`} className="mr-3">
                                            <span className="text-zinc-400">{prop.field}</span>
                                            <span className="text-zinc-500"> </span>
                                            <span className="text-red-300">
                                              {prop.before == null ? 'NULL' : String(prop.before)}
                                            </span>
                                            <span className="text-zinc-500"> → </span>
                                            <span className="text-emerald-300">
                                              {prop.after == null ? 'NULL' : String(prop.after)}
                                            </span>
                                            {index < column.changedProps.length - 1 ? (
                                              <span className="text-zinc-600">; </span>
                                            ) : null}
                                          </span>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : !isMysql ? (
                <div className="bg-[#151518] border border-[#333] rounded-lg p-4 text-sm text-zinc-400">
                  {t('mysqlOnlyAdminTabNotice') ||
                    'This section is currently available for MySQL-compatible drivers.'}
                </div>
              ) : dbAdminData.loading ? (
                <div className="bg-[#151518] border border-[#333] rounded-lg p-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('loading') || 'Loading...'}</span>
                </div>
              ) : dbAdminData.error ? (
                <div className="bg-[#151518] border border-red-500/40 rounded-lg p-4 text-sm text-red-300">
                  {dbAdminData.error}
                </div>
              ) : adminRows.length === 0 ? (
                <div className="bg-[#151518] border border-[#333] rounded-lg p-4 text-sm text-zinc-400">
                  {t('noRecords')}
                </div>
              ) : (
                <div className="bg-[#151518] border border-[#333] rounded-lg overflow-hidden">
                  <div className="overflow-auto custom-scrollbar max-h-[64vh]">
                    <table className="w-full min-w-[780px] text-xs">
                      <thead className="bg-[#18181b] sticky top-0 z-10">
                        <tr>
                          {adminColumns.map((column) => (
                            <th
                              key={column}
                              className="text-left px-3 py-2 text-zinc-300 border-b border-[#2e2e32] whitespace-nowrap"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {adminRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-[#242428]">
                            {adminColumns.map((column) => {
                              const value = row?.[column];
                              const rendered =
                                value == null
                                  ? 'NULL'
                                  : typeof value === 'object'
                                    ? JSON.stringify(value, null, 2)
                                    : String(value);
                              return (
                                <td
                                  key={`${rowIndex}-${column}`}
                                  className="px-3 py-2 align-top text-zinc-200"
                                >
                                  <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px]">
                                    {rendered}
                                  </pre>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'create_table' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
              <h3 className="text-base font-medium text-zinc-100">{t('addNewTable')}</h3>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="p-6">
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                {t('tableNamePlaceholder')}
              </label>
              <input
                type="text"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
              />
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'add_column' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
              <h3 className="text-base font-medium text-zinc-100">{t('addColumn')}</h3>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddColumn} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('colName')}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newColForm.name}
                  onChange={(e) => setNewColForm({ ...newColForm, name: e.target.value })}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('dataType')}
                  </label>
                  <SelectField
                    value={newColForm.type}
                    onChange={(e) => setNewColForm({ ...newColForm, type: e.target.value })}
                    className={baseSelectClass}
                  >
                    <option value="varchar(255)">VARCHAR</option>
                    <option value="int(11)">INT</option>
                    <option value="text">TEXT</option>
                    <option value="datetime">DATETIME</option>
                    <option value="tinyint(1)">BOOLEAN</option>
                  </SelectField>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('colNullable')}
                  </label>
                  <SelectField
                    value={newColForm.nullable}
                    onChange={(e) => setNewColForm({ ...newColForm, nullable: e.target.value })}
                    className={baseSelectClass}
                  >
                    <option value="Yes">{t('yes')}</option>
                    <option value="No">{t('no')}</option>
                  </SelectField>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('defaultValue')}
                </label>
                <input
                  type="text"
                  value={newColForm.default}
                  onChange={(e) => setNewColForm({ ...newColForm, default: e.target.value })}
                  className={`w-full bg-[#18181b] border border-[#333] rounded-md py-2 px-3 text-sm text-zinc-200 ${tc.focusRing}`}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfig({ isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
                >
                  {t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig.isOpen && modalConfig.type === 'sql_history' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[80vh]">
            <div className="px-6 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => setHistoryTab('history')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${historyTab === 'history' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  <History className="w-4 h-4" /> {t('historySaved').split('&')[0].trim()}
                </button>
                <button
                  onClick={() => setHistoryTab('snippets')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${historyTab === 'snippets' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  <Bookmark className="w-4 h-4" />{' '}
                  {t('historySaved').split('&')[1]?.trim() || t('saveSnippet')}
                </button>
              </div>
              <button
                onClick={() => setModalConfig({ isOpen: false })}
                className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-2 bg-[#18181b] rounded-b-xl">
              {historyTab === 'history' ? (
                <>
                  {sqlHistory.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">{t('noRecords')}</p>
                  ) : null}
                  {sqlHistory.map((hq, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1c1c1c] border border-[#333] rounded p-3 group hover:border-[#444] transition-colors"
                    >
                      <code className="text-xs text-zinc-300 font-mono block mb-2 whitespace-pre-wrap">
                        {hq}
                      </code>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => {
                            setSqlQuery(hq);
                            setModalConfig({ isOpen: false });
                          }}
                          className={`text-[10px] uppercase font-bold ${tc.text} hover:${tc.textLight}`}
                        >
                          {t('add')}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {sqlSnippets.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">{t('noRecords')}</p>
                  ) : null}
                  {sqlSnippets.map((snip) => (
                    <div
                      key={snip.id}
                      className="bg-[#1c1c1c] border border-[#333] rounded p-3 group hover:border-[#444] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-zinc-300">{snip.title}</span>
                        <button
                          onClick={() =>
                            setSqlSnippets((prev) => prev.filter((s) => s.id !== snip.id))
                          }
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <code className="text-xs text-zinc-400 font-mono block mb-3 bg-[#18181b] p-2 rounded border border-[#2e2e32] whitespace-pre-wrap">
                        {snip.query}
                      </code>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setSqlQuery(snip.query);
                            setModalConfig({ isOpen: false });
                          }}
                          className={`text-[10px] uppercase font-bold ${tc.text} hover:${tc.textLight}`}
                        >
                          {t('add')}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen &&
        (modalConfig.type === 'import' ||
          modalConfig.type === 'export' ||
          modalConfig.type === 'import_db' ||
          modalConfig.type === 'export_db') && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b] rounded-t-xl">
                <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                  {modalConfig.type.includes('import') ? (
                    <UploadCloud className="w-4 h-4" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  {modalConfig.type.includes('import') ? t('import') : t('export')}
                </h3>
                <button
                  onClick={() =>
                    isImportModalOpen ? closeImportModal() : setModalConfig({ isOpen: false })
                  }
                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                {modalConfig.type.includes('import') ? (
                  <>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept={importAccept}
                      className="hidden"
                      onChange={handleImportFileInputChange}
                    />
                    <div
                      onClick={openImportFilePicker}
                      onDragOver={handleImportDragOver}
                      onDragLeave={handleImportDragLeave}
                      onDrop={handleImportDrop}
                      className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors bg-[#18181b] ${isImporting ? 'cursor-wait border-[#4a4a4f]' : 'cursor-pointer'} ${isImportDragActive ? `${tc.border}` : 'border-[#333] hover:border-[#555]'}`}
                    >
                      {isImporting ? (
                        <Loader2 className="w-8 h-8 text-zinc-400 mb-3 animate-spin" />
                      ) : (
                        <UploadCloud className="w-8 h-8 text-zinc-500 mb-3" />
                      )}
                      <p className="text-sm text-zinc-300 font-medium">{importDropLabel}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {isImporting ? t('importing') : t('clickToSelect')}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-3">{importFormatHint}</p>
                    </div>
                    <div className="mt-3 border border-[#2e2e32] bg-[#18181b] rounded-lg p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {t('importServerLimits')}
                      </p>
                      {isImportLimitsLoading ? (
                        <p className="text-xs text-zinc-500 mt-2">{t('importLimitsLoading')}</p>
                      ) : importLimitsError ? (
                        <p className="text-xs text-red-400 mt-2">{importLimitsError}</p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {importLimitsRows.map((row) => (
                            <div key={row.label} className="contents">
                              <p className="text-[11px] text-zinc-500">{row.label}</p>
                              <p className="text-[11px] text-zinc-300 text-right font-mono">
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">{t('exportFormat')}</p>
                    <div className="flex gap-2">
                      {modalConfig.type === 'export_db' ? (
                        <button
                          onClick={handleExportDatabaseSql}
                          className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                        >
                          {t('downloadSql')}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleExportTable('csv')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadCsv')}
                          </button>
                          <button
                            onClick={() => handleExportTable('json')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadJson')}
                          </button>
                          <button
                            onClick={() => handleExportTable('sql')}
                            className="flex-1 bg-[#18181b] border border-[#333] hover:border-zinc-500 text-zinc-300 py-2 rounded text-sm transition-colors"
                          >
                            {t('downloadSql')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}

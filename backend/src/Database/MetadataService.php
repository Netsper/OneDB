<?php

declare(strict_types=1);

namespace OneDB\Database;

use PDO;

/**
 * Provides schema and table-browse metadata for workspace views.
 */
final class MetadataService
{
    /**
     * Lists databases visible to the current connection.
     *
     * @param array<string,mixed> $connection
     * @return array<int,string>
     */
    public static function listDatabases(array $connection): array
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $pdo = ConnectionFactory::makePdo($connection);

        if ($driver === 'sqlite') {
            return ['main'];
        }

        $sql = $driver === 'pgsql'
            ? 'SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;'
            : 'SHOW DATABASES;';

        $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_NUM);

        return array_values(array_filter(array_map(
            static fn (array $row): string => trim((string)($row[0] ?? '')),
            $rows
        )));
    }

    /**
     * Lists tables/views and basic metadata for the selected database.
     *
     * @param array<string,mixed> $connection
     * @return array<int,array<string,mixed>>
     */
    public static function listTables(array $connection): array
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $pdo = ConnectionFactory::makePdo($connection);

        if ($driver === 'sqlite') {
            return self::listSqliteTables($pdo);
        }

        $sql = $driver === 'pgsql'
            ? "
                SELECT
                    t.table_name AS name,
                    t.table_type AS type,
                    COUNT(c.column_name) AS column_count
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c
                    ON c.table_schema = t.table_schema
                   AND c.table_name = t.table_name
                WHERE t.table_schema = 'public'
                GROUP BY t.table_name, t.table_type
                ORDER BY t.table_name;
            "
            : "
                SELECT
                    t.TABLE_NAME AS name,
                    t.TABLE_TYPE AS type,
                    COUNT(c.COLUMN_NAME) AS column_count
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c
                    ON c.table_schema = t.table_schema
                   AND c.table_name = t.table_name
                WHERE t.table_schema = DATABASE()
                GROUP BY t.TABLE_NAME, t.TABLE_TYPE
                ORDER BY t.TABLE_NAME;
            ";

        $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        return array_values(array_filter(array_map(
            static function (array $row): array {
                $name = trim((string)($row['name'] ?? ''));
                if ($name === '') {
                    return [];
                }

                $type = strtolower((string)($row['type'] ?? 'table'));

                return [
                    'name' => $name,
                    'type' => strpos($type, 'view') !== false ? 'view' : 'table',
                    'columnCount' => (int)($row['column_count'] ?? 0),
                ];
            },
            $rows
        )));
    }

    /**
     * Lists SQLite tables/views with column counts.
     *
     * Uses `pragma_table_info` table-valued function when available to avoid
     * N+1 PRAGMA queries, then falls back to legacy query-per-table behavior.
     *
     * @return array<int,array<string,mixed>>
     */
    private static function listSqliteTables(PDO $pdo): array
    {
        try {
            $rows = $pdo->query("
                SELECT
                    m.name AS name,
                    m.type AS type,
                    COUNT(p.name) AS column_count
                FROM sqlite_master m
                LEFT JOIN pragma_table_info(m.name) p
                WHERE m.type IN ('table', 'view')
                  AND m.name NOT LIKE 'sqlite_%'
                GROUP BY m.name, m.type
                ORDER BY m.name;
            ")->fetchAll(PDO::FETCH_ASSOC);

            return array_values(array_filter(array_map(
                static function (array $row): array {
                    $name = trim((string)($row['name'] ?? ''));
                    if ($name === '') {
                        return [];
                    }

                    return [
                        'name' => $name,
                        'type' => strtolower((string)($row['type'] ?? 'table')) === 'view' ? 'view' : 'table',
                        'columnCount' => (int)($row['column_count'] ?? 0),
                    ];
                },
                $rows
            )));
        } catch (\Throwable $_) {
            $tableRows = $pdo->query("
                SELECT name, type
                FROM sqlite_master
                WHERE type IN ('table', 'view')
                  AND name NOT LIKE 'sqlite_%'
                ORDER BY name;
            ")->fetchAll(PDO::FETCH_ASSOC);

            $tables = [];
            foreach ($tableRows as $row) {
                $tableName = (string)($row['name'] ?? '');
                if ($tableName === '') {
                    continue;
                }

                $pragmaRows = $pdo
                    ->query('PRAGMA table_info(' . self::quoteIdentifier($tableName, 'sqlite') . ')')
                    ->fetchAll(PDO::FETCH_ASSOC);

                $tables[] = [
                    'name' => $tableName,
                    'type' => strtolower((string)($row['type'] ?? 'table')) === 'view' ? 'view' : 'table',
                    'columnCount' => count($pragmaRows),
                ];
            }

            return $tables;
        }
    }

    /**
     * Returns paginated rows with filtering and sorting for one table/view.
     *
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public static function browseTable(array $payload): array
    {
        $connection = is_array($payload['connection'] ?? null) ? $payload['connection'] : [];
        $table = trim((string)($payload['table'] ?? ''));

        if ($table === '') {
            throw new \InvalidArgumentException('Table is required.');
        }

        $page = max(1, (int)($payload['page'] ?? 1));
        $perPage = max(1, min(200, (int)($payload['perPage'] ?? 25)));
        $includeRowCount = !array_key_exists('includeRowCount', $payload) || (bool)$payload['includeRowCount'];
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));

        $pdo = ConnectionFactory::makePdo($connection);
        $columns = self::describeTable($pdo, $connection, $table);
        $columnMap = [];

        foreach ($columns as $column) {
            $columnMap[$column['name']] = true;
        }

        $bindings = [];
        $whereParts = [];
        $filters = is_array($payload['filters'] ?? null) ? $payload['filters'] : [];

        foreach ($filters as $index => $filter) {
            if (!is_array($filter)) {
                continue;
            }

            $column = trim((string)($filter['column'] ?? ''));
            $operator = strtolower(trim((string)($filter['operator'] ?? 'contains')));
            $value = $filter['value'] ?? null;

            if ($column === '' || !isset($columnMap[$column])) {
                continue;
            }

            if (!in_array($operator, ['contains', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'starts_with', 'ends_with'], true)) {
                continue;
            }

            $quotedColumn = self::quoteIdentifier($column, $driver);
            $bindKey = ':filter_' . $index;

            switch ($operator) {
                case 'eq':
                    $whereParts[] = $quotedColumn . ' = ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'neq':
                    $whereParts[] = $quotedColumn . ' != ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'gt':
                    $whereParts[] = $quotedColumn . ' > ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'gte':
                    $whereParts[] = $quotedColumn . ' >= ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'lt':
                    $whereParts[] = $quotedColumn . ' < ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'lte':
                    $whereParts[] = $quotedColumn . ' <= ' . $bindKey;
                    $bindings[$bindKey] = $value;
                    break;

                case 'starts_with':
                    $whereParts[] = self::stringExpression($quotedColumn, $driver) . ' LIKE ' . $bindKey;
                    $bindings[$bindKey] = (string)$value . '%';
                    break;

                case 'ends_with':
                    $whereParts[] = self::stringExpression($quotedColumn, $driver) . ' LIKE ' . $bindKey;
                    $bindings[$bindKey] = '%' . (string)$value;
                    break;

                case 'contains':
                default:
                    $whereParts[] = self::stringExpression($quotedColumn, $driver) . ' LIKE ' . $bindKey;
                    $bindings[$bindKey] = '%' . (string)$value . '%';
                    break;
            }
        }

        $whereSql = $whereParts === [] ? '' : ' WHERE ' . implode(' AND ', $whereParts);

        $sortPayload = is_array($payload['sort'] ?? null) ? $payload['sort'] : [];
        $sortColumn = trim((string)($sortPayload['column'] ?? ''));
        $sortDirection = strtolower((string)($sortPayload['direction'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
        $orderSql = '';

        if ($sortColumn !== '' && isset($columnMap[$sortColumn])) {
            $orderSql = ' ORDER BY ' . self::quoteIdentifier($sortColumn, $driver) . ' ' . $sortDirection;
        } elseif ($columns !== []) {
            $primaryColumn = null;
            foreach ($columns as $column) {
                if ($column['isPrimary']) {
                    $primaryColumn = $column['name'];
                    break;
                }
            }

            $defaultColumn = $primaryColumn ?? $columns[0]['name'];
            $orderSql = ' ORDER BY ' . self::quoteIdentifier($defaultColumn, $driver) . ' ASC';
        }

        $qualifiedTable = self::quoteIdentifier($table, $driver);
        $rowCount = null;
        if ($includeRowCount) {
            $countStmt = $pdo->prepare('SELECT COUNT(*) AS total_count FROM ' . $qualifiedTable . $whereSql);
            foreach ($bindings as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $rowCount = (int)($countStmt->fetchColumn() ?: 0);
        }

        $offset = ($page - 1) * $perPage;
        $dataSql = 'SELECT * FROM ' . $qualifiedTable . $whereSql . $orderSql . ' LIMIT ' . $perPage . ' OFFSET ' . $offset;
        $dataStmt = $pdo->prepare($dataSql);

        foreach ($bindings as $key => $value) {
            $dataStmt->bindValue($key, $value);
        }

        $startedAt = microtime(true);
        $dataStmt->execute();
        $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
        $durationMs = (microtime(true) - $startedAt) * 1000;

        return [
            'ok' => true,
            'kind' => 'browse_table',
            'columns' => $columns,
            'rows' => $rows,
            'rowCount' => $rowCount,
            'page' => $page,
            'perPage' => $perPage,
            'durationMs' => round($durationMs, 2),
        ];
    }

    /**
     * Reads column and foreign-key metadata for one table/view.
     *
     * @param array<string,mixed> $connection
     * @return array<int,array<string,mixed>>
     */
    private static function describeTable(PDO $pdo, array $connection, string $table): array
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));

        if ($driver === 'sqlite') {
            $quotedTable = self::quoteIdentifier($table, $driver);
            $columnsResult = $pdo->query('PRAGMA table_info(' . $quotedTable . ')')->fetchAll(PDO::FETCH_ASSOC);
            $foreignResult = $pdo->query('PRAGMA foreign_key_list(' . $quotedTable . ')')->fetchAll(PDO::FETCH_ASSOC);
            $foreignMap = [];

            foreach ($foreignResult as $foreignRow) {
                $foreignMap[(string)($foreignRow['from'] ?? '')] = [
                    'table' => (string)($foreignRow['table'] ?? ''),
                    'column' => (string)($foreignRow['to'] ?? ''),
                ];
            }

            $columns = [];
            foreach ($columnsResult as $columnRow) {
                $name = (string)($columnRow['name'] ?? '');
                $foreign = $foreignMap[$name] ?? null;
                $columns[] = [
                    'name' => $name,
                    'type' => (string)($columnRow['type'] ?? ''),
                    'extra' => '',
                    'isPrimary' => (int)($columnRow['pk'] ?? 0) === 1,
                    'nullable' => (int)($columnRow['notnull'] ?? 0) === 1 ? 'No' : 'Yes',
                    'isForeign' => $foreign !== null,
                    'foreignTable' => $foreign['table'] ?? null,
                    'foreignCol' => $foreign['column'] ?? null,
                ];
            }

            return $columns;
        }

        $tableBind = ':table_name';
        if ($driver === 'pgsql') {
            $columnsSql = "
                SELECT
                    c.column_name AS name,
                    c.data_type AS data_type,
                    c.is_nullable AS is_nullable,
                    c.column_default AS column_default,
                    CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END AS column_key,
                    COALESCE(c.column_default, '') AS extra
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    INNER JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                       AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = {$tableBind}
                ) pk ON pk.column_name = c.column_name
                WHERE c.table_schema = 'public'
                  AND c.table_name = {$tableBind}
                ORDER BY c.ordinal_position;
            ";

            $foreignKeysSql = "
                SELECT
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
                  AND tc.table_name = {$tableBind};
            ";
        } else {
            $columnsSql = "
                SELECT
                    COLUMN_NAME AS name,
                    COLUMN_TYPE AS data_type,
                    IS_NULLABLE AS is_nullable,
                    COLUMN_DEFAULT AS column_default,
                    COLUMN_KEY AS column_key,
                    EXTRA AS extra
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = {$tableBind}
                ORDER BY ORDINAL_POSITION;
            ";

            $foreignKeysSql = "
                SELECT
                    COLUMN_NAME AS column_name,
                    REFERENCED_TABLE_NAME AS referenced_table_name,
                    REFERENCED_COLUMN_NAME AS referenced_column_name
                FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE()
                  AND table_name = {$tableBind}
                  AND referenced_table_name IS NOT NULL;
            ";
        }

        $columnsStmt = $pdo->prepare($columnsSql);
        $columnsStmt->bindValue($tableBind, $table);
        $columnsStmt->execute();
        $columnRows = $columnsStmt->fetchAll(PDO::FETCH_ASSOC);

        $foreignStmt = $pdo->prepare($foreignKeysSql);
        $foreignStmt->bindValue($tableBind, $table);
        $foreignStmt->execute();
        $foreignRows = $foreignStmt->fetchAll(PDO::FETCH_ASSOC);

        $foreignMap = [];
        foreach ($foreignRows as $foreignRow) {
            $foreignMap[(string)($foreignRow['column_name'] ?? '')] = [
                'table' => (string)($foreignRow['referenced_table_name'] ?? ''),
                'column' => (string)($foreignRow['referenced_column_name'] ?? ''),
            ];
        }

        $columns = [];
        foreach ($columnRows as $columnRow) {
            $name = (string)($columnRow['name'] ?? '');
            $foreign = $foreignMap[$name] ?? null;
            $nullableRaw = strtolower((string)($columnRow['is_nullable'] ?? ''));

            $columns[] = [
                'name' => $name,
                'type' => (string)($columnRow['data_type'] ?? ''),
                'extra' => (string)($columnRow['extra'] ?? $columnRow['column_default'] ?? ''),
                'isPrimary' => strtoupper((string)($columnRow['column_key'] ?? '')) === 'PRI',
                'nullable' => $nullableRaw === 'yes' ? 'Yes' : 'No',
                'isForeign' => $foreign !== null,
                'foreignTable' => $foreign['table'] ?? null,
                'foreignCol' => $foreign['column'] ?? null,
            ];
        }

        return $columns;
    }

    /**
     * Quotes SQL identifiers according to the selected driver.
     */
    private static function quoteIdentifier(string $name, string $driver): string
    {
        if ($driver === 'mysql') {
            return '`' . str_replace('`', '``', $name) . '`';
        }

        return '"' . str_replace('"', '""', $name) . '"';
    }

    /**
     * Returns cast expression used for string-based filter operations.
     */
    private static function stringExpression(string $quotedColumn, string $driver): string
    {
        if ($driver === 'mysql') {
            return 'CAST(' . $quotedColumn . ' AS CHAR)';
        }

        return 'CAST(' . $quotedColumn . ' AS TEXT)';
    }
}

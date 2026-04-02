<?php

declare(strict_types=1);

namespace OneDB;

use PDO;
use PDOException;
use Throwable;

final class Runtime
{
    private const CSRF_KEY = 'onedb_csrf_token';

    public static function dispatch(): bool
    {
        self::bootSession();

        if (!self::isApiRequest()) {
            return false;
        }

        self::sendCorsHeaders();

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            return true;
        }

        $action = self::resolveAction();
        if ($action === '') {
            self::json(['ok' => false, 'error' => 'Missing action parameter.'], 400);
            return true;
        }

        try {
            switch ($action) {
                case 'csrf':
                    self::json(['ok' => true, 'token' => self::csrfToken()]);
                    break;

                case 'ping':
                    self::json([
                        'ok' => true,
                        'time' => gmdate('c'),
                        'php' => PHP_VERSION,
                        'readonly' => self::readonlyMode(),
                    ]);
                    break;

                case 'upload_limits':
                    self::json([
                        'ok' => true,
                        'limits' => self::uploadLimits(),
                    ]);
                    break;

                case 'test_connection':
                    self::requireCsrf();
                    $payload = self::readJson();
                    $pdo = self::makePdo($payload['connection'] ?? []);
                    $pdo->query('SELECT 1');
                    self::json(['ok' => true, 'message' => 'Connection successful.']);
                    break;

                case 'list_databases':
                    self::requireCsrf();
                    $payload = self::readJson();
                    self::json([
                        'ok' => true,
                        'databases' => self::listDatabases($payload['connection'] ?? []),
                    ]);
                    break;

                case 'list_tables':
                    self::requireCsrf();
                    $payload = self::readJson();
                    self::json([
                        'ok' => true,
                        'tables' => self::listTables($payload['connection'] ?? []),
                    ]);
                    break;

                case 'browse_table':
                    self::requireCsrf();
                    $payload = self::readJson();
                    self::json(self::browseTable($payload));
                    break;

                case 'query':
                    self::requireCsrf();
                    $payload = self::readJson();
                    $sql = trim((string)($payload['sql'] ?? ''));

                    if ($sql === '') {
                        self::json(['ok' => false, 'error' => 'SQL is required.'], 400);
                        break;
                    }

                    if (self::readonlyMode() && !self::isReadOnlySql($sql)) {
                        self::json(['ok' => false, 'error' => 'Readonly mode allows only read queries.'], 403);
                        break;
                    }

                    $pdo = self::makePdo($payload['connection'] ?? []);
                    $stmt = $pdo->prepare($sql);
                    $startedAt = microtime(true);
                    $stmt->execute();
                    $durationMs = (microtime(true) - $startedAt) * 1000;

                    if ($stmt->columnCount() > 0) {
                        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        $columns = [];
                        for ($idx = 0; $idx < $stmt->columnCount(); $idx++) {
                            $meta = $stmt->getColumnMeta($idx);
                            if (is_array($meta)) {
                                $columns[] = (string)($meta['name'] ?? '');
                            }
                        }

                        self::json([
                            'ok' => true,
                            'kind' => 'result_set',
                            'columns' => $columns,
                            'rows' => $rows,
                            'rowCount' => count($rows),
                            'durationMs' => round($durationMs, 2),
                        ]);
                    } else {
                        self::json([
                            'ok' => true,
                            'kind' => 'mutation',
                            'affectedRows' => $stmt->rowCount(),
                            'durationMs' => round($durationMs, 2),
                        ]);
                    }
                    break;

                default:
                    self::json(['ok' => false, 'error' => 'Unsupported action.'], 404);
                    break;
            }
        } catch (PDOException $e) {
            self::json(['ok' => false, 'error' => $e->getMessage()], 500);
        } catch (Throwable $e) {
            self::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }

        return true;
    }

    private static function bootSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'use_strict_mode' => true,
        ]);
    }

    private static function isApiRequest(): bool
    {
        if (isset($_GET['action']) || isset($_GET['api'])) {
            return true;
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = (string)parse_url($uri, PHP_URL_PATH);

        return $path === '/api' || strpos($path, '/api/') === 0;
    }

    private static function resolveAction(): string
    {
        if (isset($_GET['action'])) {
            return trim((string)$_GET['action']);
        }

        if (isset($_GET['api'])) {
            return trim((string)$_GET['api']);
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = trim((string)parse_url($uri, PHP_URL_PATH), '/');

        if ($path === 'api') {
            return '';
        }

        if (strpos($path, 'api/') === 0) {
            return trim(substr($path, 4));
        }

        return '';
    }

    private static function readJson(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private static function csrfToken(): string
    {
        if (!isset($_SESSION[self::CSRF_KEY])) {
            $_SESSION[self::CSRF_KEY] = bin2hex(random_bytes(24));
        }

        return (string)$_SESSION[self::CSRF_KEY];
    }

    private static function requireCsrf(): void
    {
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($token === '' || !hash_equals(self::csrfToken(), $token)) {
            throw new \RuntimeException('CSRF validation failed.');
        }
    }

    private static function makePdo(array $connection): PDO
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));

        if ($driver === 'sqlite') {
            $path = (string)($connection['path'] ?? '');
            if ($path === '') {
                throw new \InvalidArgumentException('SQLite path is required.');
            }
            $dsn = 'sqlite:' . $path;
            $user = null;
            $pass = null;
        } else {
            $host = (string)($connection['host'] ?? '127.0.0.1');
            $port = (string)($connection['port'] ?? ($driver === 'pgsql' ? '5432' : '3306'));
            $db = (string)($connection['database'] ?? '');
            $charset = (string)($connection['charset'] ?? 'utf8mb4');
            $user = (string)($connection['username'] ?? '');
            $pass = (string)($connection['password'] ?? '');

            if ($driver === 'pgsql') {
                // Allow server-level connections (without an explicit database).
                $dsn = sprintf(
                    'pgsql:host=%s;port=%s%s',
                    $host,
                    $port,
                    $db !== '' ? ';dbname=' . $db : ''
                );
            } else {
                // Allow server-level connections (without an explicit database).
                if ($db !== '') {
                    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $db, $charset);
                } else {
                    $dsn = sprintf('mysql:host=%s;port=%s;charset=%s', $host, $port, $charset);
                }
            }
        }

        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    private static function isReadOnlySql(string $sql): bool
    {
        $trimmed = ltrim($sql);
        if ($trimmed === '') {
            return false;
        }

        $allowed = [
            'select',
            'show',
            'describe',
            'desc',
            'explain',
            'with',
            'pragma',
        ];

        $firstToken = strtolower((string)strtok($trimmed, " \t\n\r\0\x0B"));

        return in_array($firstToken, $allowed, true);
    }

    private static function readonlyMode(): bool
    {
        $raw = strtolower((string)(getenv('ONEDB_READONLY') ?: '0'));
        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    private static function uploadLimits(): array
    {
        $uploadRaw = trim((string)(ini_get('upload_max_filesize') ?: ''));
        $postRaw = trim((string)(ini_get('post_max_size') ?: ''));
        $memoryRaw = trim((string)(ini_get('memory_limit') ?: ''));

        $uploadBytes = self::iniSizeToBytes($uploadRaw);
        $postBytes = self::iniSizeToBytes($postRaw);
        $memoryBytes = self::iniSizeToBytes($memoryRaw);

        return [
            'uploadMaxFilesize' => [
                'raw' => $uploadRaw,
                'bytes' => $uploadBytes,
            ],
            'postMaxSize' => [
                'raw' => $postRaw,
                'bytes' => $postBytes,
            ],
            'memoryLimit' => [
                'raw' => $memoryRaw,
                'bytes' => $memoryBytes,
            ],
            'maxFileUploads' => self::iniInt('max_file_uploads'),
            'maxExecutionTime' => self::iniInt('max_execution_time'),
            'effectiveUploadLimit' => [
                'bytes' => self::smallestLimit([$uploadBytes, $postBytes]),
            ],
        ];
    }

    private static function iniInt(string $key): ?int
    {
        $raw = ini_get($key);
        if ($raw === false) {
            return null;
        }

        $value = trim((string)$raw);
        if ($value === '' || !is_numeric($value)) {
            return null;
        }

        return (int)$value;
    }

    private static function iniSizeToBytes(string $raw): ?int
    {
        $value = strtolower(trim($raw));
        if ($value === '') {
            return null;
        }

        if ($value === '-1') {
            return -1;
        }

        if (!preg_match('/^([0-9]+(?:\.[0-9]+)?)\s*([kmgtpe]?b?)?$/', $value, $matches)) {
            return null;
        }

        $amount = (float)($matches[1] ?? 0);
        $unit = rtrim((string)($matches[2] ?? ''), 'b');
        $powerMap = [
            '' => 0,
            'k' => 1,
            'm' => 2,
            'g' => 3,
            't' => 4,
            'p' => 5,
            'e' => 6,
        ];

        if (!array_key_exists($unit, $powerMap)) {
            return null;
        }

        $bytes = $amount * (1024 ** $powerMap[$unit]);
        if (!is_finite($bytes)) {
            return PHP_INT_MAX;
        }

        return (int)round(min($bytes, (float)PHP_INT_MAX));
    }

    private static function smallestLimit(array $limits): ?int
    {
        $finiteLimits = [];
        $hasUnlimited = false;

        foreach ($limits as $limit) {
            if (!is_int($limit)) {
                continue;
            }
            if ($limit < 0) {
                $hasUnlimited = true;
                continue;
            }
            $finiteLimits[] = $limit;
        }

        if ($finiteLimits !== []) {
            return min($finiteLimits);
        }

        return $hasUnlimited ? -1 : null;
    }

    private static function sendCorsHeaders(): void
    {
        $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
        $allowed = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ];

        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }

    private static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function listDatabases(array $connection): array
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $pdo = self::makePdo($connection);

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

    private static function listTables(array $connection): array
    {
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $pdo = self::makePdo($connection);

        if ($driver === 'sqlite') {
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

                $columnCount = 0;
                $pragmaRows = $pdo->query('PRAGMA table_info(' . self::quoteIdentifier($tableName, $driver) . ')')->fetchAll(PDO::FETCH_ASSOC);
                foreach ($pragmaRows as $_pragmaRow) {
                    $columnCount++;
                }

                $tables[] = [
                    'name' => $tableName,
                    'type' => strtolower((string)($row['type'] ?? 'table')) === 'view' ? 'view' : 'table',
                    'columnCount' => $columnCount,
                ];
            }

            return $tables;
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

    private static function browseTable(array $payload): array
    {
        $connection = is_array($payload['connection'] ?? null) ? $payload['connection'] : [];
        $table = trim((string)($payload['table'] ?? ''));

        if ($table === '') {
            throw new \InvalidArgumentException('Table is required.');
        }

        $page = max(1, (int)($payload['page'] ?? 1));
        $perPage = max(1, min(200, (int)($payload['perPage'] ?? 25)));
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $pdo = self::makePdo($connection);
        $columns = self::describeTable($pdo, $connection, $table);
        $columnMap = [];

        foreach ($columns as $column) {
            $columnMap[$column['name']] = true;
        }

        $whereSql = '';
        $bindings = [];
        $filters = is_array($payload['filters'] ?? null) ? $payload['filters'] : [];
        $whereParts = [];

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

        if ($whereParts !== []) {
            $whereSql = ' WHERE ' . implode(' AND ', $whereParts);
        }

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
        $countStmt = $pdo->prepare('SELECT COUNT(*) AS total_count FROM ' . $qualifiedTable . $whereSql);
        foreach ($bindings as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $rowCount = (int)($countStmt->fetchColumn() ?: 0);

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

    private static function quoteIdentifier(string $name, string $driver): string
    {
        if ($driver === 'mysql') {
            return '`' . str_replace('`', '``', $name) . '`';
        }

        return '"' . str_replace('"', '""', $name) . '"';
    }

    private static function stringExpression(string $quotedColumn, string $driver): string
    {
        if ($driver === 'mysql') {
            return 'CAST(' . $quotedColumn . ' AS CHAR)';
        }

        return 'CAST(' . $quotedColumn . ' AS TEXT)';
    }
}

<?php

declare(strict_types=1);

/**
 * Backend smoke tests for OneDB runtime actions.
 *
 * This suite starts a local PHP built-in server and performs real HTTP
 * requests so session, CSRF and JSON request parsing are exercised end-to-end.
 */
final class SmokeTestFailure extends RuntimeException
{
}

/**
 * @param mixed $condition
 */
function assert_true($condition, string $message): void
{
    if (!$condition) {
        throw new SmokeTestFailure($message);
    }
}

/**
 * @param mixed $expected
 * @param mixed $actual
 */
function assert_same($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        $expectedText = var_export($expected, true);
        $actualText = var_export($actual, true);
        throw new SmokeTestFailure($message . " (expected: {$expectedText}, actual: {$actualText})");
    }
}

/**
 * @param array<string,string> $envExtra
 * @return array{port:int, process:resource, stdoutLog:string, stderrLog:string}
 */
function start_backend_server(string $rootDir, array $envExtra = []): array
{
    $port = 18000 + (getmypid() % 1000);
    $host = '127.0.0.1';
    $docRoot = $rootDir . '/backend/public';
    $stdoutLog = sys_get_temp_dir() . '/onedb-smoke-server-out-' . getmypid() . '.log';
    $stderrLog = sys_get_temp_dir() . '/onedb-smoke-server-err-' . getmypid() . '.log';

    @unlink($stdoutLog);
    @unlink($stderrLog);

    $command = sprintf(
        'php -S %s:%d -t %s',
        $host,
        $port,
        escapeshellarg($docRoot)
    );

    $descriptorSpec = [
        0 => ['pipe', 'r'],
        1 => ['file', $stdoutLog, 'w'],
        2 => ['file', $stderrLog, 'w'],
    ];

    $baseEnv = getenv();
    if (!is_array($baseEnv)) {
        $baseEnv = [];
    }
    $env = array_merge($baseEnv, $envExtra);

    $process = proc_open($command, $descriptorSpec, $pipes, $rootDir, $env);
    if (!is_resource($process)) {
        throw new SmokeTestFailure('Failed to start local backend server.');
    }

    fclose($pipes[0]);

    return [
        'port' => $port,
        'process' => $process,
        'stdoutLog' => $stdoutLog,
        'stderrLog' => $stderrLog,
    ];
}

/**
 * @param array{process:resource, stdoutLog:string, stderrLog:string} $server
 */
function stop_backend_server(array $server): void
{
    if (is_resource($server['process'])) {
        proc_terminate($server['process']);
        proc_close($server['process']);
    }

    @unlink($server['stdoutLog']);
    @unlink($server['stderrLog']);
}

/**
 * @param array<string,string> $cookieJar
 * @param array<int,string> $extraHeaders
 * @return array{status:int, body:string, json:array<string,mixed>|null, headers:array<int,string>, cookies:array<string,string>}
 */
function call_api(
    string $baseUrl,
    string $action,
    string $method = 'GET',
    ?array $payload = null,
    array $cookieJar = [],
    string $csrfToken = '',
    array $extraHeaders = []
): array {
    $url = $baseUrl . '/?api=' . rawurlencode($action);
    $headers = [
        'Accept: application/json',
    ];

    $hasExplicitContentType = false;
    foreach ($extraHeaders as $headerLine) {
        if (stripos($headerLine, 'Content-Type:') === 0) {
            $hasExplicitContentType = true;
            break;
        }
    }

    if ($payload !== null && !$hasExplicitContentType) {
        $headers[] = 'Content-Type: application/json';
    }

    if ($csrfToken !== '') {
        $headers[] = 'X-CSRF-Token: ' . $csrfToken;
    }

    if ($cookieJar !== []) {
        $pairs = [];
        foreach ($cookieJar as $name => $value) {
            $pairs[] = $name . '=' . $value;
        }
        $headers[] = 'Cookie: ' . implode('; ', $pairs);
    }

    foreach ($extraHeaders as $headerLine) {
        $headers[] = $headerLine;
    }

    $context = stream_context_create([
        'http' => [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headers) . "\r\n",
            'content' => $payload === null
                ? ''
                : (string)json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'ignore_errors' => true,
            'timeout' => 3,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;

    if (isset($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', $responseHeaders[0], $matches)) {
        $status = (int)$matches[1];
    }

    $cookies = [];
    foreach ($responseHeaders as $line) {
        if (stripos($line, 'Set-Cookie:') !== 0) {
            continue;
        }

        $cookiePart = trim(substr($line, strlen('Set-Cookie:')));
        $token = explode(';', $cookiePart)[0] ?? '';
        $segments = explode('=', $token, 2);
        if (count($segments) === 2) {
            $cookies[trim($segments[0])] = trim($segments[1]);
        }
    }

    $json = json_decode((string)$body, true);

    return [
        'status' => $status,
        'body' => (string)$body,
        'json' => is_array($json) ? $json : null,
        'headers' => $responseHeaders,
        'cookies' => $cookies,
    ];
}

/**
 * @param array<string,string> $cookieJar
 */
function wait_until_server_ready(string $baseUrl, array $cookieJar = []): void
{
    for ($i = 0; $i < 50; $i++) {
        $result = call_api($baseUrl, 'ping', 'GET', null, $cookieJar);
        if ($result['status'] === 200 && is_array($result['json']) && ($result['json']['ok'] ?? false) === true) {
            return;
        }

        usleep(100_000);
    }

    throw new SmokeTestFailure('Local backend server did not become ready in time.');
}

/**
 * @param array<int,string> $headers
 */
function find_header_value(array $headers, string $headerName): ?string
{
    $needle = strtolower($headerName) . ':';
    foreach ($headers as $headerLine) {
        if (stripos($headerLine, $needle) !== 0) {
            continue;
        }

        return trim((string)substr($headerLine, strlen($needle)));
    }

    return null;
}

function run_smoke_suite(): void
{
    $rootDir = dirname(__DIR__, 2);
    $tmpDb = sys_get_temp_dir() . '/onedb-smoke-' . getmypid() . '.sqlite';
    $debugLogPath = sys_get_temp_dir() . '/onedb-debug-' . getmypid() . '.log';
    @unlink($tmpDb);
    @unlink($debugLogPath);

    $server = null;
    try {
        $server = start_backend_server($rootDir);
        $baseUrl = 'http://127.0.0.1:' . $server['port'];
        $cookieJar = [];

        wait_until_server_ready($baseUrl);

        $ping = call_api($baseUrl, 'ping');
        assert_same(200, $ping['status'], 'ping status must be 200');
        assert_true(is_array($ping['json']) && ($ping['json']['ok'] ?? false) === true, 'ping must return ok=true');
        assert_true(is_string($ping['json']['time'] ?? null), 'ping must return server time');
        assert_true(array_key_exists('readonly', (array)$ping['json']), 'ping must include readonly flag');

        $limits = call_api($baseUrl, 'upload_limits');
        assert_same(200, $limits['status'], 'upload_limits status must be 200');
        assert_true(is_array($limits['json']) && ($limits['json']['ok'] ?? false) === true, 'upload_limits must return ok=true');

        $csrf = call_api($baseUrl, 'csrf');
        assert_same(200, $csrf['status'], 'csrf status must be 200');
        assert_true(is_array($csrf['json']) && ($csrf['json']['ok'] ?? false) === true, 'csrf must return ok=true');
        $csrfToken = (string)($csrf['json']['token'] ?? '');
        assert_true($csrfToken !== '', 'csrf must return non-empty token');
        $cookieJar = array_merge($cookieJar, $csrf['cookies']);
        assert_true($cookieJar !== [], 'csrf response must set session cookie');

        $connection = [
            'driver' => 'sqlite',
            'path' => $tmpDb,
        ];

        $dbList = call_api(
            $baseUrl,
            'list_databases',
            'POST',
            ['connection' => $connection],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $dbList['status'], 'list_databases status must be 200');
        assert_true(is_array($dbList['json']) && ($dbList['json']['ok'] ?? false) === true, 'list_databases must return ok=true');
        assert_true(in_array('main', (array)($dbList['json']['databases'] ?? []), true), 'sqlite list_databases must contain main');

        $methodNotAllowed = call_api($baseUrl, 'list_databases', 'GET', null, $cookieJar, $csrfToken);
        assert_same(405, $methodNotAllowed['status'], 'list_databases GET must be rejected with 405');

        $missingCsrf = call_api(
            $baseUrl,
            'list_tables',
            'POST',
            ['connection' => $connection],
            $cookieJar,
            ''
        );
        assert_same(403, $missingCsrf['status'], 'missing CSRF token must be rejected with 403');

        $invalidContentType = call_api(
            $baseUrl,
            'list_tables',
            'POST',
            ['connection' => $connection],
            $cookieJar,
            $csrfToken,
            ['Content-Type: text/plain']
        );
        assert_same(415, $invalidContentType['status'], 'invalid content type must be rejected with 415');

        $connectionTest = call_api(
            $baseUrl,
            'test_connection',
            'POST',
            ['connection' => $connection],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $connectionTest['status'], 'test_connection status must be 200');
        assert_true(is_array($connectionTest['json']) && ($connectionTest['json']['ok'] ?? false) === true, 'test_connection must return ok=true');

        $create = call_api(
            $baseUrl,
            'query',
            'POST',
            ['connection' => $connection, 'sql' => 'CREATE TABLE smoke_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $create['status'], 'CREATE TABLE status must be 200');
        assert_true(is_array($create['json']) && ($create['json']['kind'] ?? '') === 'mutation', 'CREATE TABLE should be mutation result');

        $insert = call_api(
            $baseUrl,
            'query',
            'POST',
            ['connection' => $connection, 'sql' => "INSERT INTO smoke_items (name) VALUES ('alpha'), ('beta')"],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $insert['status'], 'INSERT status must be 200');
        assert_true(is_array($insert['json']) && ($insert['json']['kind'] ?? '') === 'mutation', 'INSERT should be mutation result');

        $tables = call_api(
            $baseUrl,
            'list_tables',
            'POST',
            ['connection' => $connection],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $tables['status'], 'list_tables status must be 200');
        $tableNames = array_map(
            static fn (array $row): string => (string)($row['name'] ?? ''),
            (array)($tables['json']['tables'] ?? [])
        );
        assert_true(in_array('smoke_items', $tableNames, true), 'list_tables must include smoke_items');

        $browse = call_api(
            $baseUrl,
            'browse_table',
            'POST',
            [
                'connection' => $connection,
                'table' => 'smoke_items',
                'page' => 1,
                'perPage' => 25,
                'includeRowCount' => true,
                'includeInsights' => true,
                'tableType' => 'table',
                'sort' => ['column' => 'id', 'direction' => 'asc'],
            ],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $browse['status'], 'browse_table status must be 200');
        assert_same(2, (int)($browse['json']['rowCount'] ?? -1), 'browse_table rowCount must be 2');
        assert_same(2, count((array)($browse['json']['rows'] ?? [])), 'browse_table must return two rows');
        $insights = (array)($browse['json']['insights'] ?? []);
        assert_true(array_key_exists('indexes', $insights), 'browse_table insights must include indexes');
        assert_true(array_key_exists('foreignKeys', $insights), 'browse_table insights must include foreign keys');
        assert_true(array_key_exists('referencedBy', $insights), 'browse_table insights must include incoming references');
        assert_true(array_key_exists('viewDefinition', $insights), 'browse_table insights must include view definition key');
        assert_true(array_key_exists('relatedRoutines', $insights), 'browse_table insights must include related routines');

        $select = call_api(
            $baseUrl,
            'query',
            'POST',
            ['connection' => $connection, 'sql' => 'SELECT id, name FROM smoke_items ORDER BY id ASC'],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $select['status'], 'SELECT status must be 200');
        assert_true(is_array($select['json']) && ($select['json']['kind'] ?? '') === 'result_set', 'SELECT should return result_set');
        assert_same(2, (int)($select['json']['rowCount'] ?? -1), 'SELECT rowCount must be 2');
        assert_same(false, (bool)($select['json']['truncated'] ?? true), 'SELECT should not be truncated');

        $readonlyMutation = call_api(
            $baseUrl,
            'query',
            'POST',
            ['connection' => $connection, 'sql' => "INSERT INTO smoke_items (name) VALUES ('blocked')"],
            $cookieJar,
            $csrfToken
        );
        assert_same(200, $readonlyMutation['status'], 'readonly-disabled INSERT status must be 200');
        assert_true(is_array($readonlyMutation['json']) && ($readonlyMutation['json']['ok'] ?? false) === true, 'baseline INSERT should succeed before readonly check');

        stop_backend_server($server);
        $server = null;

        $readonlyServer = start_backend_server($rootDir, ['ONEDB_READONLY' => '1']);
        $server = $readonlyServer;
        $readonlyBaseUrl = 'http://127.0.0.1:' . $readonlyServer['port'];
        $readonlyCookies = [];

        wait_until_server_ready($readonlyBaseUrl);
        $readonlyCsrf = call_api($readonlyBaseUrl, 'csrf');
        $readonlyToken = (string)($readonlyCsrf['json']['token'] ?? '');
        $readonlyCookies = array_merge($readonlyCookies, $readonlyCsrf['cookies']);
        assert_true($readonlyToken !== '', 'readonly csrf must return token');

        $readonlySelect = call_api(
            $readonlyBaseUrl,
            'query',
            'POST',
            ['connection' => ['driver' => 'sqlite', 'path' => $tmpDb], 'sql' => 'SELECT COUNT(*) AS c FROM smoke_items'],
            $readonlyCookies,
            $readonlyToken
        );
        assert_same(200, $readonlySelect['status'], 'readonly SELECT status must be 200');
        assert_true(is_array($readonlySelect['json']) && ($readonlySelect['json']['kind'] ?? '') === 'result_set', 'readonly SELECT must return result_set');

        $readonlyBlockedMutation = call_api(
            $readonlyBaseUrl,
            'query',
            'POST',
            ['connection' => ['driver' => 'sqlite', 'path' => $tmpDb], 'sql' => "INSERT INTO smoke_items (name) VALUES ('forbidden')"],
            $readonlyCookies,
            $readonlyToken
        );
        assert_same(403, $readonlyBlockedMutation['status'], 'readonly INSERT should return 403');
        assert_true(is_array($readonlyBlockedMutation['json']) && ($readonlyBlockedMutation['json']['ok'] ?? true) === false, 'readonly INSERT must be rejected');

        stop_backend_server($server);
        $server = null;

        $debugServer = start_backend_server($rootDir, [
            'ONEDB_DEBUG' => '1',
            'ONEDB_DEBUG_LOG_PATH' => $debugLogPath,
        ]);
        $server = $debugServer;
        $debugBaseUrl = 'http://127.0.0.1:' . $debugServer['port'];

        wait_until_server_ready($debugBaseUrl);

        $debugPing = call_api($debugBaseUrl, 'ping');
        assert_same(200, $debugPing['status'], 'debug ping status must be 200');
        assert_same('1', find_header_value($debugPing['headers'], 'X-OneDB-Debug'), 'debug header must be enabled');

        $durationHeader = find_header_value($debugPing['headers'], 'X-OneDB-Request-Duration-Ms');
        assert_true(is_string($durationHeader) && $durationHeader !== '', 'request duration header must be present');
        assert_true(is_numeric($durationHeader), 'request duration header must be numeric');
        assert_same('ping', find_header_value($debugPing['headers'], 'X-OneDB-Action'), 'debug action header must match action');

        $debugLogText = is_file($debugLogPath) ? (string)file_get_contents($debugLogPath) : '';
        assert_true($debugLogText !== '', 'debug log file must be written');
        assert_true(strpos($debugLogText, 'action=ping') !== false, 'debug log must contain action');
        assert_true(strpos($debugLogText, 'status=200') !== false, 'debug log must contain status');
    } finally {
        if (is_array($server)) {
            stop_backend_server($server);
        }
        @unlink($tmpDb);
        @unlink($debugLogPath);
    }
}

try {
    run_smoke_suite();
    fwrite(STDOUT, "Backend smoke tests passed.\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Backend smoke tests failed: " . $e->getMessage() . "\n");
    exit(1);
}

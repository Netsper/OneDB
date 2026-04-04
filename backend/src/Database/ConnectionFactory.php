<?php

declare(strict_types=1);

namespace OneDB\Database;

use OneDB\Support\Environment;
use PDO;

/**
 * Creates and configures PDO instances for supported database engines.
 */
final class ConnectionFactory
{
    /**
     * Builds a PDO connection from user-supplied connection payload.
     *
     * @param array<string,mixed> $connection
     */
    public static function makePdo(array $connection): PDO
    {
        $connection = self::resolveConnectionSecretPayload($connection);
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));
        $sslConfig = self::normalizeSslConfig($connection['ssl'] ?? null);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if ($driver === 'mysql' && defined('PDO::MYSQL_ATTR_USE_BUFFERED_QUERY')) {
            // Stream large SELECT result sets instead of buffering all rows in client memory.
            $options[PDO::MYSQL_ATTR_USE_BUFFERED_QUERY] = false;
        }

        if ($driver === 'mysql' && $sslConfig['enabled']) {
            if (
                $sslConfig['ca'] !== ''
                && defined('PDO::MYSQL_ATTR_SSL_CA')
            ) {
                $options[PDO::MYSQL_ATTR_SSL_CA] = $sslConfig['ca'];
            }
            if (
                $sslConfig['cert'] !== ''
                && defined('PDO::MYSQL_ATTR_SSL_CERT')
            ) {
                $options[PDO::MYSQL_ATTR_SSL_CERT] = $sslConfig['cert'];
            }
            if (
                $sslConfig['key'] !== ''
                && defined('PDO::MYSQL_ATTR_SSL_KEY')
            ) {
                $options[PDO::MYSQL_ATTR_SSL_KEY] = $sslConfig['key'];
            }
            if (
                $sslConfig['verifyServerCert'] !== null
                && defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')
            ) {
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = $sslConfig['verifyServerCert'];
            }
        }

        if ($driver === 'sqlite') {
            $path = self::normalizeSqlitePath((string)($connection['path'] ?? ''));
            $dsn = 'sqlite:' . $path;
            $user = null;
            $pass = null;
        } else {
            $host = trim((string)($connection['host'] ?? ''));
            if ($host === '') {
                $host = '127.0.0.1';
            }

            $defaultPort = $driver === 'pgsql' ? '5432' : '3306';
            $port = trim((string)($connection['port'] ?? ''));
            if ($port === '') {
                $port = $defaultPort;
            }

            $db = (string)($connection['database'] ?? '');
            $charset = (string)($connection['charset'] ?? 'utf8mb4');
            $user = (string)($connection['username'] ?? '');
            $pass = (string)($connection['password'] ?? '');

            if ($driver === 'pgsql') {
                // Server-level connections are allowed even when no database is selected.
                $dsnParts = [
                    'pgsql:host=' . $host,
                    'port=' . $port,
                ];
                if ($db !== '') {
                    $dsnParts[] = 'dbname=' . $db;
                }
                if ($sslConfig['enabled']) {
                    $dsnParts[] = 'sslmode=' . ($sslConfig['mode'] !== '' ? $sslConfig['mode'] : 'require');
                    if ($sslConfig['ca'] !== '') {
                        $dsnParts[] = 'sslrootcert=' . $sslConfig['ca'];
                    }
                    if ($sslConfig['cert'] !== '') {
                        $dsnParts[] = 'sslcert=' . $sslConfig['cert'];
                    }
                    if ($sslConfig['key'] !== '') {
                        $dsnParts[] = 'sslkey=' . $sslConfig['key'];
                    }
                    if ($sslConfig['passphrase'] !== '') {
                        $dsnParts[] = 'sslpassword=' . $sslConfig['passphrase'];
                    }
                }
                $dsn = implode(';', $dsnParts);
            } else {
                $mysqlSocket = trim((string)($connection['unix_socket'] ?? $connection['socket'] ?? ''));

                // Server-level connections are allowed even when no database is selected.
                if ($mysqlSocket !== '') {
                    if ($db !== '') {
                        $dsn = sprintf('mysql:unix_socket=%s;dbname=%s;charset=%s', $mysqlSocket, $db, $charset);
                    } else {
                        $dsn = sprintf('mysql:unix_socket=%s;charset=%s', $mysqlSocket, $charset);
                    }
                } else {
                    $dsn = self::buildMysqlHostDsn($host, $port, $db, $charset);
                }
            }
        }

        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $firstError) {
            // Some PDO MySQL setups treat "localhost" as Unix socket only and can fail
            // even when TCP is available. Retry with 127.0.0.1 for better compatibility.
            if (
                $driver === 'mysql'
                && isset($host, $port, $db, $charset)
                && strcasecmp($host, 'localhost') === 0
                && trim((string)($connection['unix_socket'] ?? $connection['socket'] ?? '')) === ''
            ) {
                $fallbackDsn = self::buildMysqlHostDsn('127.0.0.1', $port, $db, $charset);
                $pdo = new PDO($fallbackDsn, $user, $pass, $options);
            } else {
                throw $firstError;
            }
        }

        if (Environment::readonlyMode()) {
            self::configureReadonlySession($pdo, $driver);
        }

        return $pdo;
    }

    /**
     * Builds a MySQL DSN using host/port transport.
     */
    private static function buildMysqlHostDsn(string $host, string $port, string $db, string $charset): string
    {
        if ($db !== '') {
            return sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $db, $charset);
        }

        return sprintf('mysql:host=%s;port=%s;charset=%s', $host, $port, $charset);
    }

    /**
     * Configures server-side read-only constraints when supported by driver.
     */
    private static function configureReadonlySession(PDO $pdo, string $driver): void
    {
        if ($driver === 'pgsql') {
            $pdo->exec('SET default_transaction_read_only = on');
            return;
        }

        if ($driver === 'mysql') {
            $pdo->exec('SET SESSION TRANSACTION READ ONLY');
        }
    }

    /**
     * Validates and normalizes SQLite path according to optional root restriction.
     */
    private static function normalizeSqlitePath(string $path): string
    {
        $candidate = trim($path);
        if ($candidate === '') {
            throw new \InvalidArgumentException('SQLite path is required.');
        }

        if ($candidate === ':memory:') {
            return $candidate;
        }

        if (strpos($candidate, "\0") !== false) {
            throw new \InvalidArgumentException('SQLite path is invalid.');
        }

        $rootRaw = trim((string)(getenv('ONEDB_SQLITE_ROOT') ?: ''));
        if ($rootRaw === '') {
            return $candidate;
        }

        $root = realpath($rootRaw);
        if ($root === false) {
            throw new \RuntimeException('Configured ONEDB_SQLITE_ROOT directory does not exist.');
        }

        $absoluteCandidate = self::resolveAbsolutePath($candidate);
        $resolvedFile = realpath($absoluteCandidate);

        if ($resolvedFile !== false) {
            if (!self::pathStartsWith($resolvedFile, $root)) {
                throw new \RuntimeException('SQLite path is outside allowed root.');
            }

            return $resolvedFile;
        }

        $parent = realpath(dirname($absoluteCandidate));
        if ($parent === false || !self::pathStartsWith($parent, $root)) {
            throw new \RuntimeException('SQLite path is outside allowed root.');
        }

        return $absoluteCandidate;
    }

    /**
     * Returns an absolute path for relative filesystem paths.
     */
    private static function resolveAbsolutePath(string $path): string
    {
        if (self::isAbsolutePath($path)) {
            return $path;
        }

        $base = getcwd();
        if ($base === false || $base === '') {
            return $path;
        }

        return rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $path;
    }

    /**
     * Checks whether a path is absolute on POSIX or Windows systems.
     */
    private static function isAbsolutePath(string $path): bool
    {
        if ($path === '') {
            return false;
        }

        if ($path[0] === '/' || $path[0] === '\\') {
            return true;
        }

        return (bool)preg_match('/^[a-zA-Z]:[\\\\\\/]/', $path);
    }

    /**
     * Returns true when the given path is located within the configured root.
     */
    private static function pathStartsWith(string $path, string $root): bool
    {
        $normalizedPath = rtrim(str_replace('\\', '/', $path), '/');
        $normalizedRoot = rtrim(str_replace('\\', '/', $root), '/');

        return $normalizedPath === $normalizedRoot || strpos($normalizedPath, $normalizedRoot . '/') === 0;
    }

    /**
     * Loads optional connection payload overrides from environment-backed secret profiles.
     *
     * @param array<string,mixed> $connection
     * @return array<string,mixed>
     */
    private static function resolveConnectionSecretPayload(array $connection): array
    {
        $secretRefRaw = trim((string)($connection['secret_ref'] ?? ''));
        if ($secretRefRaw === '') {
            return $connection;
        }

        $normalizedRef = strtoupper((string)preg_replace('/[^A-Z0-9_]/', '_', $secretRefRaw));
        if ($normalizedRef === '') {
            throw new \RuntimeException('Secret reference is invalid.');
        }

        $envKey = 'ONEDB_SECRET_' . $normalizedRef;
        $rawSecret = getenv($envKey);
        if (!is_string($rawSecret) || trim($rawSecret) === '') {
            throw new \RuntimeException('Secret profile was not found: ' . $normalizedRef);
        }

        $decoded = json_decode($rawSecret, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Secret profile payload is invalid JSON: ' . $normalizedRef);
        }

        return self::mergeConnectionPayload($connection, $decoded);
    }

    /**
     * @param array<string,mixed> $connection
     * @param array<string,mixed> $secret
     * @return array<string,mixed>
     */
    private static function mergeConnectionPayload(array $connection, array $secret): array
    {
        $merged = $connection;
        foreach ($secret as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }

            if ($key === 'ssl' && is_array($value)) {
                $existingSsl = is_array($merged['ssl'] ?? null) ? $merged['ssl'] : [];
                $merged['ssl'] = array_merge($value, $existingSsl);
                continue;
            }

            if (!array_key_exists($key, $merged) || self::isEmptyConnectionValue($merged[$key])) {
                $merged[$key] = $value;
            }
        }

        return $merged;
    }

    /**
     * @param mixed $value
     */
    private static function isEmptyConnectionValue($value): bool
    {
        if ($value === null) {
            return true;
        }
        if (is_string($value)) {
            return trim($value) === '';
        }
        if (is_array($value)) {
            return $value === [];
        }
        return false;
    }

    /**
     * @param mixed $value
     * @return array{
     *   enabled:bool,
     *   mode:string,
     *   ca:string,
     *   cert:string,
     *   key:string,
     *   passphrase:string,
     *   verifyServerCert:?bool
     * }
     */
    private static function normalizeSslConfig($value): array
    {
        $ssl = is_array($value) ? $value : [];
        $verifyRaw = $ssl['verifyServerCert'] ?? $ssl['verify_server_cert'] ?? null;
        $verify = null;
        if (is_bool($verifyRaw)) {
            $verify = $verifyRaw;
        } elseif (is_string($verifyRaw) && trim($verifyRaw) !== '') {
            $normalized = strtolower(trim($verifyRaw));
            if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
                $verify = true;
            } elseif (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
                $verify = false;
            }
        }

        return [
            'enabled' => (bool)($ssl['enabled'] ?? false),
            'mode' => trim((string)($ssl['mode'] ?? '')),
            'ca' => trim((string)($ssl['ca'] ?? '')),
            'cert' => trim((string)($ssl['cert'] ?? '')),
            'key' => trim((string)($ssl['key'] ?? '')),
            'passphrase' => (string)($ssl['passphrase'] ?? ''),
            'verifyServerCert' => $verify,
        ];
    }
}

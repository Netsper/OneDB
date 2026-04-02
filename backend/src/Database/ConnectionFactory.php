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
        $driver = strtolower((string)($connection['driver'] ?? 'mysql'));

        if ($driver === 'sqlite') {
            $path = self::normalizeSqlitePath((string)($connection['path'] ?? ''));
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
                // Server-level connections are allowed even when no database is selected.
                $dsn = sprintf(
                    'pgsql:host=%s;port=%s%s',
                    $host,
                    $port,
                    $db !== '' ? ';dbname=' . $db : ''
                );
            } else {
                // Server-level connections are allowed even when no database is selected.
                if ($db !== '') {
                    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $db, $charset);
                } else {
                    $dsn = sprintf('mysql:host=%s;port=%s;charset=%s', $host, $port, $charset);
                }
            }
        }

        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        if (Environment::readonlyMode()) {
            self::configureReadonlySession($pdo, $driver);
        }

        return $pdo;
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
}

<?php

declare(strict_types=1);

namespace OneDB\Support;

/**
 * Lightweight request-level debug telemetry for runtime API calls.
 *
 * This class is enabled only when `ONEDB_DEBUG` is truthy.
 */
final class DebugTelemetry
{
    /**
     * Request start timestamp as microtime(true).
     */
    private static ?float $startedAt = null;

    /**
     * Currently resolved API action name.
     */
    private static string $action = '';

    /**
     * Marks the beginning of a request trace.
     */
    public static function beginRequest(): void
    {
        self::$startedAt = microtime(true);
        self::$action = '';
    }

    /**
     * Stores resolved action for debug headers and logs.
     */
    public static function setAction(string $action): void
    {
        self::$action = trim($action);
    }

    /**
     * Appends debug headers for API JSON responses when debug mode is enabled.
     */
    public static function appendResponseHeaders(): void
    {
        if (!Environment::debugMode()) {
            return;
        }

        header('X-OneDB-Debug: 1');
        header('X-OneDB-Request-Duration-Ms: ' . self::durationMs());

        if (self::$action !== '') {
            header('X-OneDB-Action: ' . self::$action);
        }
    }

    /**
     * Writes one request summary line to configured sink.
     */
    public static function logRequest(int $statusCode): void
    {
        if (!Environment::debugMode()) {
            return;
        }

        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
        $action = self::$action !== '' ? self::$action : '-';
        $duration = self::durationMs();
        $line = sprintf(
            '[OneDB] method=%s uri=%s action=%s status=%d duration_ms=%.2f',
            $method,
            $uri,
            $action,
            $statusCode,
            $duration
        );

        $path = Environment::debugLogPath();
        if ($path !== null) {
            $written = @file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
            if ($written !== false) {
                return;
            }
        }

        error_log($line);
    }

    /**
     * Returns elapsed request duration in milliseconds.
     */
    private static function durationMs(): string
    {
        if (self::$startedAt === null) {
            return '0.00';
        }

        $elapsed = (microtime(true) - self::$startedAt) * 1000;
        return number_format(max(0.0, $elapsed), 2, '.', '');
    }
}

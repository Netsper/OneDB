<?php

declare(strict_types=1);

namespace OneDB\Support;

/**
 * Centralized environment-flag readers for runtime behavior.
 */
final class Environment
{
    /**
     * Default allowed origins for CORS in development workflows.
     *
     * @var array<int,string>
     */
    private const DEFAULT_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    /**
     * Default maximum number of rows returned from `query` result sets.
     */
    private const DEFAULT_MAX_RESULT_ROWS = 2000;

    /**
     * Default maximum size for incoming JSON request bodies.
     */
    private const DEFAULT_MAX_BODY_BYTES = 2_097_152;

    /**
     * Returns readonly mode flag (`ONEDB_READONLY`).
     */
    public static function readonlyMode(): bool
    {
        return self::boolFlag('ONEDB_READONLY');
    }

    /**
     * Returns debug mode flag (`ONEDB_DEBUG`).
     */
    public static function debugMode(): bool
    {
        return self::boolFlag('ONEDB_DEBUG');
    }

    /**
     * Returns optional debug log file path (`ONEDB_DEBUG_LOG_PATH`).
     */
    public static function debugLogPath(): ?string
    {
        $raw = trim((string)(getenv('ONEDB_DEBUG_LOG_PATH') ?: ''));
        return $raw !== '' ? $raw : null;
    }

    /**
     * Reads effective max row limit for SQL result-set responses.
     */
    public static function maxResultRows(): int
    {
        $raw = trim((string)(getenv('ONEDB_MAX_RESULT_ROWS') ?: ''));
        if ($raw !== '' && ctype_digit($raw)) {
            $value = (int)$raw;
            if ($value > 0) {
                return min($value, 10000);
            }
        }

        return self::DEFAULT_MAX_RESULT_ROWS;
    }

    /**
     * Returns effective CORS allowed origins.
     *
     * Env format: `ONEDB_ALLOWED_ORIGINS=http://a.test,http://b.test`.
     *
     * @return array<int,string>
     */
    public static function allowedOrigins(): array
    {
        $raw = trim((string)(getenv('ONEDB_ALLOWED_ORIGINS') ?: ''));
        if ($raw === '') {
            return self::DEFAULT_ALLOWED_ORIGINS;
        }

        $parts = array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', $raw)
        ));

        return array_values(array_unique(array_filter($parts, static fn (string $origin): bool => $origin !== '')));
    }

    /**
     * Returns max accepted request body bytes for API JSON payloads.
     */
    public static function maxBodyBytes(): int
    {
        $raw = trim((string)(getenv('ONEDB_MAX_BODY_BYTES') ?: ''));
        if ($raw !== '' && ctype_digit($raw)) {
            $value = (int)$raw;
            if ($value > 0) {
                // Cap to 50MB to avoid accidental resource exhaustion by env misconfiguration.
                return min($value, 52_428_800);
            }
        }

        return self::DEFAULT_MAX_BODY_BYTES;
    }

    /**
     * Returns true if running inside a Docker container.
     */
    public static function isDocker(): bool
    {
        return file_exists('/.dockerenv');
    }

    /**
     * Returns normalized boolean value for known env flag conventions.
     */
    private static function boolFlag(string $key): bool
    {
        $raw = strtolower((string)(getenv($key) ?: '0'));
        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }
}

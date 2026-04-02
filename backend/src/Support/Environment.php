<?php

declare(strict_types=1);

namespace OneDB\Support;

/**
 * Centralized environment-flag readers for runtime behavior.
 */
final class Environment
{
    /**
     * Default maximum number of rows returned from `query` result sets.
     */
    private const DEFAULT_MAX_RESULT_ROWS = 2000;

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
     * Returns normalized boolean value for known env flag conventions.
     */
    private static function boolFlag(string $key): bool
    {
        $raw = strtolower((string)(getenv($key) ?: '0'));
        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }
}

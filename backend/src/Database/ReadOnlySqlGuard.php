<?php

declare(strict_types=1);

namespace OneDB\Database;

/**
 * Performs conservative read-only SQL validation.
 */
final class ReadOnlySqlGuard
{
    /**
     * Returns true when the SQL text is considered read-only.
     *
     * The check is intentionally strict and can reject uncommon but safe queries.
     */
    public static function isReadOnly(string $sql): bool
    {
        $inspected = self::normalizeSqlForInspection($sql);
        if ($inspected === '') {
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

        $firstToken = strtolower((string)strtok($inspected, " \t\n\r\0\x0B"));
        if (!in_array($firstToken, $allowed, true)) {
            return false;
        }

        // Block obvious mutating statements even when hidden inside CTE bodies.
        if (preg_match('/\b(insert|update|delete|merge|replace|upsert|create|alter|drop|truncate|grant|revoke|comment|attach|detach|copy)\b/i', $inspected)) {
            return false;
        }

        // Block file write variants supported by MySQL.
        if (preg_match('/\binto\s+(outfile|dumpfile)\b/i', $inspected)) {
            return false;
        }

        return true;
    }

    /**
     * Normalizes SQL text for inspection by stripping comments and quoted content.
     */
    private static function normalizeSqlForInspection(string $sql): string
    {
        $normalized = '';
        $length = strlen($sql);
        $inSingle = false;
        $inDouble = false;
        $inBacktick = false;
        $inLineComment = false;
        $inBlockComment = false;

        for ($index = 0; $index < $length; $index++) {
            $char = $sql[$index];
            $next = $index + 1 < $length ? $sql[$index + 1] : '';
            $prev = $index > 0 ? $sql[$index - 1] : '';

            if ($inLineComment) {
                if ($char === "\n") {
                    $inLineComment = false;
                    $normalized .= ' ';
                }
                continue;
            }

            if ($inBlockComment) {
                if ($char === '*' && $next === '/') {
                    $index++;
                    $inBlockComment = false;
                    $normalized .= ' ';
                }
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBacktick) {
                if ($char === '-' && $next === '-') {
                    $inLineComment = true;
                    $index++;
                    continue;
                }

                if ($char === '/' && $next === '*') {
                    $inBlockComment = true;
                    $index++;
                    continue;
                }
            }

            if (!$inDouble && !$inBacktick && $char === "'") {
                if ($inSingle && $next === "'") {
                    $index++;
                    continue;
                }

                if (!$inSingle || $prev !== '\\') {
                    $inSingle = !$inSingle;
                }

                continue;
            }

            if (!$inSingle && !$inBacktick && $char === '"') {
                if ($inDouble && $next === '"') {
                    $index++;
                    continue;
                }

                if (!$inDouble || $prev !== '\\') {
                    $inDouble = !$inDouble;
                }

                continue;
            }

            if (!$inSingle && !$inDouble && $char === '`') {
                $inBacktick = !$inBacktick;
                continue;
            }

            if ($inSingle || $inDouble || $inBacktick) {
                continue;
            }

            $normalized .= $char;
        }

        return trim(strtolower($normalized));
    }
}

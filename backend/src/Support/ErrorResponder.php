<?php

declare(strict_types=1);

namespace OneDB\Support;

use PDOException;
use Throwable;

/**
 * Produces safe client-facing error messages.
 */
final class ErrorResponder
{
    /**
     * Returns sanitized error text for API responses.
     */
    public static function safeMessage(Throwable $e): string
    {
        if (Environment::debugMode()) {
            return $e->getMessage();
        }

        return $e instanceof PDOException
            ? 'Database operation failed.'
            : 'Unexpected server error.';
    }
}

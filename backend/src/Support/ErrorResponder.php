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
        $message = trim($e->getMessage());
        if ($message !== '') {
            return $message;
        }

        return $e instanceof PDOException
            ? 'Database operation failed.'
            : 'Unexpected server error.';
    }

    /**
     * Creates a standardized API error payload from one throwable.
     *
     * @return array<string,mixed>
     */
    public static function fromThrowable(Throwable $e, int $statusCode, string $action = ''): array
    {
        $payload = [
            'ok' => false,
            'error' => self::safeMessage($e),
            'details' => [
                'type' => get_class($e),
                'status' => $statusCode,
                'code' => $e->getCode(),
                'message' => self::safeMessage($e),
            ],
        ];

        if ($action !== '') {
            $payload['details']['action'] = $action;
        }

        if ($e instanceof PDOException) {
            $payload['details']['database'] = self::pdoContext($e);
        }

        if (Environment::debugMode()) {
            $payload['details']['file'] = $e->getFile();
            $payload['details']['line'] = $e->getLine();
            $payload['details']['trace'] = $e->getTraceAsString();
        }

        return $payload;
    }

    /**
     * Creates a standardized API error payload from a direct message.
     *
     * @return array<string,mixed>
     */
    public static function fromMessage(
        string $message,
        int $statusCode,
        string $errorCode,
        string $action = ''
    ): array {
        $publicMessage = trim($message) !== '' ? trim($message) : 'Unexpected server error.';
        $payload = [
            'ok' => false,
            'error' => $publicMessage,
            'details' => [
                'type' => 'runtime_error',
                'status' => $statusCode,
                'code' => $errorCode,
                'message' => $publicMessage,
            ],
        ];

        if ($action !== '') {
            $payload['details']['action'] = $action;
        }

        return $payload;
    }

    /**
     * @return array<string,mixed>
     */
    private static function pdoContext(PDOException $e): array
    {
        $errorInfo = is_array($e->errorInfo) ? $e->errorInfo : [];

        return [
            'sqlState' => (string)($errorInfo[0] ?? ''),
            'driverCode' => $errorInfo[1] ?? null,
            'driverMessage' => (string)($errorInfo[2] ?? ''),
        ];
    }
}

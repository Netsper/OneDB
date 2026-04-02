<?php

declare(strict_types=1);

namespace OneDB\Http;

use OneDB\Support\DebugTelemetry;

/**
 * Small HTTP JSON response helper.
 */
final class JsonResponse
{
    /**
     * Writes JSON HTTP response with status code.
     *
     * @param array<string,mixed> $payload
     */
    public static function send(array $payload, int $status = 200): void
    {
        http_response_code($status);
        DebugTelemetry::appendResponseHeaders();
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

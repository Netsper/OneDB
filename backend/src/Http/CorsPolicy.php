<?php

declare(strict_types=1);

namespace OneDB\Http;

/**
 * Sends CORS headers for local development origins.
 */
final class CorsPolicy
{
    /**
     * Emits allowed CORS headers.
     */
    public static function sendDevelopmentHeaders(): void
    {
        $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
        $allowed = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ];

        header('Vary: Origin');

        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
}

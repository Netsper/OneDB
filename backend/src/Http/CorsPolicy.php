<?php

declare(strict_types=1);

namespace OneDB\Http;

use OneDB\Support\Environment;

/**
 * Sends CORS headers for configured origins.
 */
final class CorsPolicy
{
    /**
     * Emits allowed CORS headers.
     */
    public static function sendDevelopmentHeaders(): void
    {
        $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
        $allowed = Environment::allowedOrigins();

        header('Vary: Origin');

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
}

<?php

declare(strict_types=1);

namespace OneDB\Http;

/**
 * Session bootstrap and CSRF token validation.
 */
final class SessionCsrf
{
    /**
     * Session key used to persist the CSRF token.
     */
    private const CSRF_KEY = 'onedb_csrf_token';

    /**
     * Starts a secure HTTP session if one does not already exist.
     */
    public static function bootSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'cookie_secure' => self::isHttpsRequest(),
            'use_strict_mode' => true,
        ]);
    }

    /**
     * Returns current session CSRF token, creating one when missing.
     */
    public static function token(): string
    {
        if (!isset($_SESSION[self::CSRF_KEY])) {
            $_SESSION[self::CSRF_KEY] = bin2hex(random_bytes(24));
        }

        return (string)$_SESSION[self::CSRF_KEY];
    }

    /**
     * Validates CSRF header for state-changing HTTP verbs.
     */
    public static function requireValidToken(): void
    {
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($token === '' || !hash_equals(self::token(), $token)) {
            throw new HttpException('CSRF validation failed.', 403);
        }
    }

    /**
     * Returns true when request is served over HTTPS.
     */
    private static function isHttpsRequest(): bool
    {
        if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
            return true;
        }

        $forwardedProto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
        return $forwardedProto === 'https';
    }
}

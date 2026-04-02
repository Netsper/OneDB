<?php

declare(strict_types=1);

namespace OneDB\Http;

/**
 * Helpers for API route detection and payload extraction.
 */
final class ApiRequest
{
    /**
     * Determines whether current request targets the API.
     */
    public static function isApiRequest(): bool
    {
        if (isset($_GET['action']) || isset($_GET['api'])) {
            return true;
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = (string)parse_url($uri, PHP_URL_PATH);

        return $path === '/api' || strpos($path, '/api/') === 0;
    }

    /**
     * Resolves API action name from query parameters or `/api/{action}` path.
     */
    public static function resolveAction(): string
    {
        if (isset($_GET['action'])) {
            return trim((string)$_GET['action']);
        }

        if (isset($_GET['api'])) {
            return trim((string)$_GET['api']);
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = trim((string)parse_url($uri, PHP_URL_PATH), '/');

        if ($path === 'api') {
            return '';
        }

        if (strpos($path, 'api/') === 0) {
            return trim(substr($path, 4));
        }

        return '';
    }

    /**
     * Reads JSON payload from request body.
     *
     * @return array<string,mixed>
     */
    public static function readJson(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}

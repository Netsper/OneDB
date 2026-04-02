<?php

declare(strict_types=1);

namespace OneDB\Http;

use JsonException;
use OneDB\Support\Environment;

/**
 * Helpers for API route detection and payload extraction.
 */
final class ApiRequest
{
    /**
     * Strict API action format accepted from query or `/api/{action}` path.
     */
    private const ACTION_PATTERN = '/^[a-z][a-z0-9_]*$/';

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
            return self::normalizeAction((string)$_GET['action']);
        }

        if (isset($_GET['api'])) {
            return self::normalizeAction((string)$_GET['api']);
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = trim((string)parse_url($uri, PHP_URL_PATH), '/');

        if ($path === 'api') {
            return '';
        }

        if (strpos($path, 'api/') === 0) {
            return self::normalizeAction((string)substr($path, 4));
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
        self::assertJsonBodyAllowed();

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        if (strlen($raw) > Environment::maxBodyBytes()) {
            throw new HttpException('Request payload is too large.', 413);
        }

        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new HttpException('Invalid JSON payload: ' . $e->getMessage(), 400);
        }

        if (!is_array($data)) {
            throw new HttpException('JSON payload must be an object.', 400);
        }

        return $data;
    }

    /**
     * Validates payload size and content type for JSON API requests.
     */
    private static function assertJsonBodyAllowed(): void
    {
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > Environment::maxBodyBytes()) {
            throw new HttpException('Request payload is too large.', 413);
        }

        $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
        if ($contentType !== '' && strpos($contentType, 'application/json') === false) {
            throw new HttpException('Content-Type must be application/json.', 415);
        }
    }

    /**
     * Normalizes and validates action text.
     */
    private static function normalizeAction(string $action): string
    {
        $normalized = trim(strtolower($action));
        if ($normalized === '') {
            return '';
        }

        return preg_match(self::ACTION_PATTERN, $normalized) === 1 ? $normalized : '';
    }
}

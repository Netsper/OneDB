<?php

declare(strict_types=1);

namespace OneDB;

use OneDB\Database\ConnectionFactory;
use OneDB\Database\MetadataService;
use OneDB\Database\QueryService;
use OneDB\Database\ReadOnlySqlGuard;
use OneDB\Http\ApiRequest;
use OneDB\Http\CorsPolicy;
use OneDB\Http\JsonResponse;
use OneDB\Http\SessionCsrf;
use OneDB\Support\Environment;
use OneDB\Support\ErrorResponder;
use OneDB\Support\UploadLimits;
use PDOException;
use Throwable;

/**
 * Runtime API dispatcher for OneDB.
 *
 * This class stays intentionally small and delegates data operations to
 * specialized service classes under `backend/src/Database` and `backend/src/Http`.
 */
final class Runtime
{
    /**
     * Handles API dispatch for backend requests.
     *
     * @return bool True when request is handled by runtime API, false otherwise.
     */
    public static function dispatch(): bool
    {
        if (!ApiRequest::isApiRequest()) {
            return false;
        }

        SessionCsrf::bootSession();
        CorsPolicy::sendDevelopmentHeaders();

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            return true;
        }

        $action = ApiRequest::resolveAction();
        if ($action === '') {
            JsonResponse::send(['ok' => false, 'error' => 'Missing action parameter.'], 400);
            return true;
        }

        try {
            self::dispatchAction($action);
        } catch (PDOException $e) {
            JsonResponse::send(['ok' => false, 'error' => ErrorResponder::safeMessage($e)], 500);
        } catch (Throwable $e) {
            JsonResponse::send(['ok' => false, 'error' => ErrorResponder::safeMessage($e)], 500);
        }

        return true;
    }

    /**
     * Routes one action to the matching service layer operation.
     */
    private static function dispatchAction(string $action): void
    {
        switch ($action) {
            case 'csrf':
                JsonResponse::send(['ok' => true, 'token' => SessionCsrf::token()]);
                return;

            case 'ping':
                JsonResponse::send([
                    'ok' => true,
                    'time' => gmdate('c'),
                    'php' => PHP_VERSION,
                    'readonly' => Environment::readonlyMode(),
                ]);
                return;

            case 'upload_limits':
                JsonResponse::send([
                    'ok' => true,
                    'limits' => UploadLimits::collect(),
                ]);
                return;

            case 'test_connection':
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                $pdo = ConnectionFactory::makePdo(self::connectionPayload($payload));
                $pdo->query('SELECT 1');
                JsonResponse::send(['ok' => true, 'message' => 'Connection successful.']);
                return;

            case 'list_databases':
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                JsonResponse::send([
                    'ok' => true,
                    'databases' => MetadataService::listDatabases(self::connectionPayload($payload)),
                ]);
                return;

            case 'list_tables':
                SessionCsrf::requireValidToken();
                $payload = ApiRequest::readJson();
                JsonResponse::send([
                    'ok' => true,
                    'tables' => MetadataService::listTables(self::connectionPayload($payload)),
                ]);
                return;

            case 'browse_table':
                SessionCsrf::requireValidToken();
                JsonResponse::send(MetadataService::browseTable(ApiRequest::readJson()));
                return;

            case 'query':
                SessionCsrf::requireValidToken();
                self::handleQueryAction(ApiRequest::readJson());
                return;

            default:
                JsonResponse::send(['ok' => false, 'error' => 'Unsupported action.'], 404);
                return;
        }
    }

    /**
     * Executes SQL query action including readonly and payload validation.
     *
     * @param array<string,mixed> $payload
     */
    private static function handleQueryAction(array $payload): void
    {
        $sql = trim((string)($payload['sql'] ?? ''));
        if ($sql === '') {
            JsonResponse::send(['ok' => false, 'error' => 'SQL is required.'], 400);
            return;
        }

        if (Environment::readonlyMode() && !ReadOnlySqlGuard::isReadOnly($sql)) {
            JsonResponse::send(['ok' => false, 'error' => 'Readonly mode allows only read queries.'], 403);
            return;
        }

        $result = QueryService::execute(self::connectionPayload($payload), $sql);
        JsonResponse::send($result);
    }

    /**
     * Extracts connection payload in a type-safe way.
     *
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private static function connectionPayload(array $payload): array
    {
        return is_array($payload['connection'] ?? null) ? $payload['connection'] : [];
    }
}
